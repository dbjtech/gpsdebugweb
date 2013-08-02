var trace = new Meteor.Collection("trace")
var logger = new Meteor.Collection("logger")

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
	console.log(JSON.stringify(body))
	trace.insert(body)
	return 200
})

Meteor.Router.add('/gpsdebug/:terminal_id','GET',function(terminal_id) {
	//var query = this.request.query
	var query = trace.find({mobile:terminal_id}).fetch()
	console.log(terminal_id,'fetching',query.length,'docs')
	this.response.write(JSON.stringify(query))
	return 200
})

Meteor.Router.add('*',[404,'not found'])


Meteor.publish('trace', function(args) {
	console.log('sub',args)
	return trace.find({mobile:args.terminal_sn,timestamp:{$gt:args.timestamp_start,$lt:args.timestamp_end}})
})
