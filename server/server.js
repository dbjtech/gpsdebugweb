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

var google_request_handler = {
	protocol: https,
	options: {
		hostname: 'www.googleapis.com',
		//port: 80,
		path: '/geolocation/v1/geolocate?key=AIzaSyDAZ8Qr-2uoHU8jVsTZ6eInxtI9OPtMlRM',
		method: 'POST',
		headers: {}
	},
	on_request: function(req,data){
		var req_body = {
			"homeMobileCountryCode": 310,
			"homeMobileNetworkCode": 260,
			"radioType": "gsm",
			// "carrier": "T-Mobile",
			// "cellTowers": [{
			// 	"cellId": 28655,
			// 	"locationAreaCode": 17695,
			// 	"mobileCountryCode": 310,
			// 	"mobileNetworkCode": 260,
			// 	"age": 0,
			// 	"signalStrength": -95
			// }],
			"wifiAccessPoints": [{
				"macAddress": "01:23:45:67:89:AB",
				"signalStrength": 8,
				"age": 0,
				"signalToNoiseRatio": -65,
				"channel": 8
			},{
				"macAddress": "01:23:45:67:89:AC",
				"signalStrength": 4,
				"age": 0
			}]
		}
		data = JSON.stringify(req_body)
		req.setHeader('Content-Length', data.length)
		req.write(data)
		req.end()
	},
	//return [http_code,{result:XXX}]
	on_response: function(data){
		if(data.error)
			return [502,{result:data.error}]
		if(data.timeout)
			return [502,{result:data.timeout}]
		var body = {result:{}}
		body.result.accuracy = data.accuracy
		body.result.geo = data.location
		return [200,body]
	}
}

var juhe_request_handler = {
	protocol: http,
	options: {
		hostname: 'v.juhe.cn',
		port: 80,
		path: '/cell/get',
		method: 'POST',
		headers: {'Content-Type':'application/x-www-form-urlencoded'}
	},
	on_request: function(req,data){
		// mnc:0,
		// cell:28655,
		// lac:17695,
		var info = data.cells[0]
		var req_body = _.pick(info,'mnc','lac')
		req_body.cell = info.cid
		req_body.key = 'e40e4ac4b12317914437bd3f742343f4'
		data = querystring.stringify(req_body)
		console.log('request',req_body)
		req.setHeader('Content-Length', data.length)
		req.write(data)
		req.end()
	},
	//input
	//output [http_code,{result:XXX}]
	on_response: function(data){
		if(data.resultcode!='200')
			return [502,{result:data.reason}]
		var raw = data.result.data[0]
		var body = {result:{geo:{}}}
		body.result.accuracy = raw.PRECISION
		body.result.geo.lat = raw.LAT
		body.result.geo.lng = raw.LNG
		return [200,body]
	}
}

//[input]	{cells:[{cid:0,lac:0,mnc:0,mcc:0},{...}]} //cells[0] treats as the current cell, other as neighbor cells
//[output]	{result:{geo:{lat:0,lng:0},accuracy:0},source:'www.googleapis.com'}
//[test]	curl localhost:3000/geo -H "Content-Type: application/json" -d '{"cells":[{"cid":28655,"lac":17695,"mnc":0}]}'
Meteor.Router.add('/geo','POST',function() {
	var future = new Future()
	var handler = google_request_handler
	var body_data = this.request.body
	console.log(body_data)
	if(_.isEmpty(body_data))
		return 400

	var resp
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
			console.log('body:\n',api_resp)
			console.log('time used:',new Date()-timestamp_start)
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
	resp[1].source = handler.options.hostname
	resp[1] = JSON.stringify(resp[1])
	console.log(resp)
	return resp
})



Meteor.Router.add('*',[404,'not found'])