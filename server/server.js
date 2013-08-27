function Util(){

	this.subscript = function(obj,key){
		var split = key.split('.')
		var value = obj
		for(var i in split){
			if(!value) throw('can not subscript '+key)
			var k = split[i]
			value = value[k]
		}
		return value
	}

	this.extract_fields = function(dest,src,field_names){
		if(!dest) dest={}
		for(var key in field_names){
			var src_name = key
			var dest_name = field_names[key]
			dest[dest_name] = this.subscript(src,src_name)
		}
		return dest
	}

	this.md5 = function(str){
		var hash = require('crypto').createHash('md5');
		return hash.update(str).digest('hex');
	}

	this.is_format_like = function(format,obj){
		//console.log(format,'vs',obj)
		if(format==null) return true
		if(format==undefined) return obj==undefined
		var ftype = typeof(format)
		var otype = typeof(obj)
		if(ftype=='function'){
			if(format.name.toLowerCase()!=otype) return false
		}else if(ftype!=otype)
			return false
		if(ftype=='object'){
			if(format instanceof Array){
				if(!(obj instanceof Array)) return false
				if(format.length>obj.length) return false
			}
			for(var key in format){
				if(!obj) return false
				if(!arguments.callee(format[key],obj[key]))
					return false
			}
		}
		return true
	}

	this.convert_field = function(dest,src,fields,convertor){
		for(var i=0; i<fields.length; i++){
			var k = fields[i]
			dest[k] = convertor(src[k])
		}
	}
}


var querystring = Npm.require('querystring')

var trace = new Meteor.Collection("trace")
var config = new Meteor.Collection("config")
var google_geo_db = new Meteor.Collection("google_geo")

/*
URL: ​http://gps.dbjtech.com/gpsdebug
Method: POST
Parameters:
	mobile=mobile id
	timestamp=YYYYmmddHHMMSS
	lon=float (0, 180)
	lat=float (0, 90)
	alt=float
	std_lon=float
	std_lat=float
	std_alt=float
	range_rms=float
	satellites=Si:N1,S2:N2,... (Satellite Number:NR)
	misc=anything (optional)
*/

Meteor.startup(function () {
	//console.log('code to run on server at startup')
})

Meteor.Router.add('/gpsdebug','POST',function() {
	var body = this.request.body
	var e = /(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/.exec(body.timestamp)
	body.timestamp = new Date(e[1],e[2]-1,e[3],e[4],e[5],e[6])
	body.package_timestamp = new Date()
	util.convert_field(body,body,['lat','lon','alt','std_lat','std_lon','std_alt'],parseFloat)
	console.log(JSON.stringify(body))
	trace.insert(body)
	//load or init setting
	var setting = config.findOne({mobile:body.mobile},{_id:0})
	console.log(JSON.stringify(setting))
	if(!setting){
		setting = {}
		setting.mobile = body.mobile
		setting.freq = 20
		setting.restart = 'hot'
		setting.unsynced = true
		config.insert(setting)
		console.log('init config',setting)
	}
	//build resp
	var resp = ''
	if(setting.unsynced){
		delete setting.unsynced
		resp = querystring.stringify(_.omit(setting,'_id','mobile','unsynced'))
	}
	config.update({_id:setting._id},setting)
	return [200,resp]
})

Meteor.Router.add('/gpsdebug/:terminal_id','GET',function(terminal_id) {
	//var query = this.request.query
	var query = trace.find({mobile:terminal_id}).fetch()
	console.log(terminal_id,'fetching',query.length,'docs')
	this.response.write(JSON.stringify(query))
	return 200
})


Meteor.publish('trace', function(args) {
	if(!args){
		console.log('unsub config')
		this.stop()
		return
	}
	console.log('sub trace',args)
	var tracking = args['user.profile.tracking']
	var cur = Meteor.users.find({_id:this.userId,'profile.terminals':tracking}).fetch()
	if(cur.length==1)
		return trace.find({mobile:tracking,package_timestamp:{$gt:args.timestamp_start,$lt:args.timestamp_end}})
	else
		console.log('not alow')
})

Meteor.publish('config', function(args) {
	if(!args){
		console.log('unsub config')
		this.stop()
		return
	}
	console.log('sub config',args)
	var tracking = args['user.profile.tracking']
	var cur = Meteor.users.find({_id:this.userId,'profile.terminals':tracking}).fetch()
	if(cur.length==1)
		return config.find({mobile:tracking})
	else
		console.log('not alow')
})

Meteor.publish("userData", function () {
	return Meteor.users.find({_id: this.userId})
})


///////////
//geo api//
///////////
var http = Npm.require('http')
var https = Npm.require('https')
var Future = Npm.require('fibers/future')
var util = new Util()

function Request_handler(){
	this.last_request_timestamp = new Date()
	this.last_request_time_used = 0
	this.request_times = 0
	this.fails_times = 0
	this.protocol = http
}
Request_handler.prototype.set_options = function(opt) {this.options=opt}
//return false if not support or convert failed
Request_handler.prototype.on_request_data_convert = function(get_body,post_body,raw) {return true}
Request_handler.prototype.on_request = function(req,post_body) {
	var data
	var content_type = this.options.headers && this.options.headers['Content-Type'] || null
	if(content_type=='application/json')
		data = JSON.stringify(post_body)
	else
		data = querystring.stringify(post_body)
	//console.log(content_type,'post=',data,data.length)
	req.setHeader('Content-Length', data.length)
	if(data.length!=0)
		req.write(data)
	req.end()
}
//return [http_code,{result:XXX}]
Request_handler.prototype.on_response = function(post_body) {return [501,{result:'not implement'}]}

var google_cell = new Request_handler()
google_cell.protocol = https
google_cell.set_options({
	hostname: 'www.googleapis.com',
	path: '/geolocation/v1/geolocate',
	method: 'POST',
	headers: {'Content-Type':'application/json'}
})
google_cell.on_request_data_convert = function(get_body,post_body,raw){
	var format4cell = {cells:[{cid:Number,lac:Number,mnc:Number,mcc:Number,strength:null}]}
	var format4wifi = {wifis:[{mac:String,strength:null}]}
	var good_format = false
	if(util.is_format_like(format4wifi,raw)){
		good_format = true
		post_body.wifiAccessPoints = []
		for(var i=0; i<raw.wifis.length; i++){
			var e = util.extract_fields({},raw.wifis[i],{mac:'macAddress',strength:'signalStrength'})
			post_body.wifiAccessPoints.push(e)
		}
	}
	if(util.is_format_like(format4cell,raw)){
		good_format = true
		post_body.cellTowers = []
		for(var i=0; i<raw.cells.length; i++){
			var e = util.extract_fields({},raw.cells[i],{cid:'cellId',mcc:'mobileCountryCode',mnc:'mobileNetworkCode',lac:'locationAreaCode',strength:'signalStrength'})
			post_body.cellTowers.push(e)
		}
	}
	get_body.key = 'AIzaSyDAZ8Qr-2uoHU8jVsTZ6eInxtI9OPtMlRM'
	return good_format
}
google_cell.on_response = function(data){
	if(data.error)
		return [502,{result:data.error}]
	if(data.timeout)
		return [502,{result:data.timeout}]
	var body = {result:{}}
	body.result.accuracy = data.accuracy
	body.result.geo = data.location
	body.result.geo.lat = parseFloat(body.result.geo.lat)
	body.result.geo.lng = parseFloat(body.result.geo.lng)
	return [200,body]
}

var juhe_cell = new Request_handler()
juhe_cell.set_options({
	hostname: 'v.juhe.cn',
	port: 80,
	path: '/cell/get',
	method: 'POST',
	headers: {'Content-Type':'application/x-www-form-urlencoded'}
})
juhe_cell.on_request_data_convert = function(get_body,post_body,raw){
	var format4cell = {cells:[{cid:Number,lac:Number,mnc:Number,mcc:Number,strength:null}]}
	if(!util.is_format_like(format4cell,raw))
		return false
	var info = raw.cells[0]
	if(info.mcc!=460)
		return false
	_.extend(post_body,_.pick(info,'mnc','lac'))
	post_body.cell = info.cid
	post_body.key = 'e40e4ac4b12317914437bd3f742343f4'
	return true
}
juhe_cell.on_response = function(data){
	if(data.resultcode!='200')
		return [502,{result:data.reason}]
	var raw = data.result.data[0]
	var body = {result:{geo:{}}}
	body.result.accuracy = parseFloat(raw.PRECISION)
	body.result.geo.lat = parseFloat(raw.LAT)
	body.result.geo.lng = parseFloat(raw.LNG)
	return [200,body]
}

var baidu_geo_convert = new Request_handler()
baidu_geo_convert.set_options({
	//api.map.baidu.com/ag/coord/convert?from=0&to=4&x=longitude&y=latitude
	hostname: 'api.map.baidu.com',
	port: 80,
	path: '/ag/coord/convert',
	method: 'GET',
})
baidu_geo_convert.on_request_data_convert = function(get_body,post_body,raw){
	var format4point = {geo:{lng:Number,lat:Number},to:String}
	if(raw.to!='baidu')
		return false
	if(!util.is_format_like(format4point,raw))
		return false
	_.extend(get_body,{from:0,to:4})
	util.extract_fields(get_body,raw.geo,{lat:'y',lng:'x'})
	//console.log('request',get_body)
	return true
}
baidu_geo_convert.on_response = function(data){
	console.log('response',data)
	if(data.error!=0)
		return [502,{result:data.error}]
	var geo = {}
	geo.lng = new Buffer(data.x, 'base64').toString('ascii')
	geo.lat = new Buffer(data.y, 'base64').toString('ascii')
	geo.lng = parseFloat(geo.lng)
	geo.lat = parseFloat(geo.lat)
	return [200,{result:{geo:geo}}]
}

var google_geo_convert = new Request_handler()
google_geo_convert.set_options({hostname:'db.google_geo'})
google_geo_convert.on_request_data_convert = function(get_body,post_body,raw){
	var format4point = {geo:{lng:Number,lat:Number},to:String}
	//var format4points = {geos:[{lng:Number,lat:Number}],to:String}
	if(raw.to!='google')
		return false
	if(util.is_format_like(format4point,raw)){
		get_body.geo = raw.geo
	}
	return !_.isEmpty(get_body)
}
google_geo_convert.on_locally_handle = function(data){
	var result = {}
	var resp
	if(data.geo){
		result.geo = {}
		var lng = Math.round(data.geo.lng*100)/100
		var lat = Math.round(data.geo.lat*100)/100
		var doc = google_geo_db.findOne({lng:lng,lat:lat})
		if(doc){
			result.geo.lng = data.geo.lng + doc.lng_offset
			result.geo.lat = data.geo.lat + doc.lat_offset
		}else{
			result.geo = data.geo
			console.warn('google_geo not found',data.geo)
			//resp = [501,{result:'geo out of range'}]
		}
		resp = [200,{result:result}]
	}
	return resp
}

function remote_web_api_request(handler,get_body,post_body){
	var resp
	var future = new Future()
	var options = _.clone(handler.options)
	options.path += '?' + querystring.stringify(get_body)
	console.log('get=',options.path,'post=',post_body)
	var req = handler.protocol.request(options, function(res) {
		var api_resp = ''
		// console.log('STATUS: ' + res.statusCode)
		// console.log('HEADERS: ' + JSON.stringify(res.headers))
		res.setEncoding('utf8')
		res.on('data', function (chunk) {
			api_resp+=chunk
		});
		res.on('end', function(){
			// console.log('body:\n',api_resp)
			// console.log('time used:',new Date()-timestamp_start)
			try{
				resp = handler.on_response(JSON.parse(api_resp))
			}catch(e){
				resp = [502,{result:e.message}]
			}
			future.return()
		})
	})
	req.setTimeout(5000,function(){
		resp = [504,{result:'timeout'}]
		//abort will end with event 'error'
		req.abort()
	})
	req.on('error', function(e) {
		console.log('problem with request:',e.message)
		resp = resp || [502,{result:e.message}]
		future.return()
	})

	handler.on_request(req,post_body)
	future.wait()
	return resp
}

function try_handlers(handlers,raw){
	var resp
	//make random order
	handlers.sort(function(a,b){return 0.5-Math.random()})
	while(handlers.length!=0){
		var handler = handlers.pop()
		var get_body = {}
		var post_body = {}
		if(!handler.on_request_data_convert(get_body,post_body,raw)){
			resp = resp || [400,{result:'bad param'}]
			continue
		}

		handler.last_request_timestamp = new Date()
		//this call will block
		resp = handler.on_locally_handle ?
			handler.on_locally_handle(get_body,post_body) :
			remote_web_api_request(handler,get_body,post_body)
		resp = resp || [500,{result:'internal server error'}]
		handler.request_times++
		if(resp[0]!=200)
			handler.fails_times++
		handler.last_request_time_used = new Date()-handler.last_request_timestamp
		resp[1].source = handler.options.hostname
		console.log('request finish',_.pick(handler,'last_request_timestamp','last_request_time_used','request_times','fails_times'))
		if(resp[0]!=504)
			break
	}
	return resp
}

//[input]	{cells:[{cid:Number,lac:Number,mnc:Number,mcc:Number,strength:Number&&null}],to:String&&null} //cells[0] treats as the current cell, other as neighbor cells
//[input]	{wifis:[{mac:String,strength:Number},{mac:String,strength:Number&&null}],to:String&&null} //for wifi, at least 2 wifi addrs
//[output]	{result:{geo:{lat:0,lng:0},accuracy:0},source:'www.googleapis.com'}
//[test]	curl localhost:3000/geo -H "Content-Type: application/json" -d '{"cells":[{"cid":28655,"lac":17695,"mnc":0}]}'
Meteor.Router.add('/geo','POST',function() {
	var body_data = this.request.body
	console.log(body_data)

	var geolocate_resp = try_handlers([google_cell,juhe_cell],body_data)
	if(geolocate_resp[0]==200&&body_data.to){
		var convert_input = {geo:geolocate_resp[1].result.geo,to:body_data.to}
		console.log(convert_input)
		var convert_resp = try_handlers([baidu_geo_convert,google_geo_convert],convert_input)
		console.log(convert_resp)
		if(convert_resp[0]==200){
			geolocate_resp[1].result.raw = geolocate_resp[1].result.geo
			geolocate_resp[1].result.geo = convert_resp[1].result.geo
			geolocate_resp[1].source = [geolocate_resp[1].source]
			geolocate_resp[1].source.push(convert_resp[1].source)
		}
	}
	geolocate_resp[1] = JSON.stringify(geolocate_resp[1])
	console.log(geolocate_resp)
	return geolocate_resp
})

//[input]	{geo:{lng:Number,lat:Number},to:String} //'to' can only set to 'baidu'/'google' right now
//[output]	{result:{geo:{"lng":0,"lat":0}},"source":"api.map.baidu.com"}
Meteor.Router.add('/convert','POST',function(){
	var body_data = this.request.body
	console.log(body_data)

	var resp = try_handlers([baidu_geo_convert,google_geo_convert],body_data)
	resp[1] = JSON.stringify(resp[1])
	console.log(resp)
	return resp
})

Meteor.Router.add('/',[200,{'Content-Type':'text/html'},'<html><meta HTTP-EQUIV="REFRESH" content="0; url=/html"></html>'])
Meteor.Router.add('*',[404,'not found'])
