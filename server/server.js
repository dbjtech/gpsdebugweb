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
}


var querystring = Npm.require('querystring')

var trace = new Meteor.Collection("trace")
var config = new Meteor.Collection("config")

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

var google_cell = new Request_handler()
google_cell.protocol = https
google_cell.options = {
	hostname: 'www.googleapis.com',
	path: '/geolocation/v1/geolocate?key=AIzaSyDAZ8Qr-2uoHU8jVsTZ6eInxtI9OPtMlRM',
	method: 'POST',
	headers: {}
}
google_cell.on_request = function(req,data){
	var req_body = {cellTowers:[]}
	for(var i=0; i<data.cells.length; i++){
		var e = util.extract_fields({},data.cells[i],{cid:'cellId',mcc:'mobileCountryCode',mnc:'mobileNetworkCode',strength:'signalStrength'})
		req_body.cellTowers.push(e)
	}
	data = JSON.stringify(req_body)
	req.setHeader('Content-Length', data.length)
	req.write(data)
	req.end()
}
//return [http_code,{result:XXX}]
google_cell.on_response = function(data){
	if(data.error)
		return [502,{result:data.error}]
	if(data.timeout)
		return [502,{result:data.timeout}]
	var body = {result:{}}
	body.result.accuracy = data.accuracy
	body.result.geo = data.location
	return [200,body]
}
var google_wifi = _.clone(google_cell)
google_wifi.on_request = function(req,data){
	var req_body = {wifiAccessPoints:[]}
	for(var i=0; i<data.wifis.length; i++){
		var e = util.extract_fields({},data.wifis[i],{mac:'macAddress',strength:'signalStrength'})
		req_body.wifiAccessPoints.push(e)
	}
	data = JSON.stringify(req_body)
	//console.log('request',req_body)
	req.setHeader('Content-Length', data.length)
	req.write(data)
	req.end()
}

var juhe_cell = new Request_handler()
juhe_cell.options = {
	hostname: 'v.juhe.cn',
	port: 80,
	path: '/cell/get',
	method: 'POST',
	headers: {'Content-Type':'application/x-www-form-urlencoded'}
}
//return [http_code,{result:XXX}] if not support
juhe_cell.is_support = function(data){
	var info = data.cells[0]
	if(info.mcc!=460){
		return false
	}
	return true
}
juhe_cell.on_request = function(req,data){
	var info = data.cells[0]
	var req_body = _.pick(info,'mnc','lac')
	req_body.cell = info.cid
	req_body.key = 'e40e4ac4b12317914437bd3f742343f4'
	data = querystring.stringify(req_body)
	//console.log('request',req_body)
	req.setHeader('Content-Length', data.length)
	req.write(data)
	req.end()
}
juhe_cell.on_response = function(data){
	if(data.resultcode!='200')
		return [502,{result:data.reason}]
	var raw = data.result.data[0]
	var body = {result:{geo:{}}}
	body.result.accuracy = raw.PRECISION
	body.result.geo.lat = raw.LAT
	body.result.geo.lng = raw.LNG
	return [200,body]
}

function handle_geo_request(handler,body_data){
	var resp
	var future = new Future()
	var timestamp_start = new Date()
	var req = handler.protocol.request(handler.options, function(res) {
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

	handler.on_request(req,body_data)
	future.wait()
	resp = resp || [200,{}]
	handler.request_times++
	if(resp[0]!=200)
		handler.fails_times++
	handler.last_request_time_used = new Date()-timestamp_start
	resp[1].source = handler.options.hostname
	resp[1] = JSON.stringify(resp[1])
	console.log(resp)
	return resp
}

//[input]	{cells:[{cid:Number,lac:Number,mnc:Number,mcc:Number,strength:null}]} //cells[0] treats as the current cell, other as neighbor cells
//[input]	{wifis:[{mac:String,strength:Number},{mac:String,strength:Number}]} //for wifi, at least 2 wifi addrs
//[output]	{result:{geo:{lat:0,lng:0},accuracy:0},source:'www.googleapis.com'}
//[test]	curl localhost:3000/geo -H "Content-Type: application/json" -d '{"cells":[{"cid":28655,"lac":17695,"mnc":0}]}'
Meteor.Router.add('/geo','POST',function() {
	var body_data = this.request.body
	console.log(body_data)

	var resp
	var format4cell = {cells:[{cid:Number,lac:Number,mnc:Number,mcc:Number,strength:null}]}
	var format4wifi = {wifis:[{mac:String,strength:null}]}
	var cell_handlers = [google_cell,juhe_cell]
	var wifi_handlers = [google_wifi]
	var handlers
	if(util.is_format_like(format4wifi,body_data)){
		handlers = wifi_handlers
	}else if(util.is_format_like(format4cell,body_data)){
		handlers = cell_handlers
	}else{
		return 400
	}
	//make random order
	handlers.sort(function(a,b){return 0.5-Math.random()})
	while(handlers.length!=0){
		var handler = handlers.pop()
		if(handler.is_support && !handler.is_support(body_data)){
			continue
		}

		handler.last_request_timestamp = new Date()
		//this call will block
		resp = handle_geo_request(handler,body_data)
		console.log('request finish',_.pick(handler,'last_request_timestamp','last_request_time_used','request_times','fails_times'))
		if(resp[0]!=504)
			break
	}
	return resp || 501
})



Meteor.Router.add('*',[404,'not found'])