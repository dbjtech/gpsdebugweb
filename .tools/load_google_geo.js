
var zlib = require('zlib');
var gzip = zlib.createGzip();
var gunzip = zlib.createGunzip();
var fs = require('fs');
var inp = fs.createReadStream('google.geo.convert.gz');
// var out = fs.createWriteStream('out.txt');

var mongo = require('mongoskin')
mongodb = mongo.db('localhost:27017/meteor?auto_reconnect',{w:1})
var google_geo = mongodb.collection('google_geo')

var plain_data = ''
var db_manager = {start_time:new Date(), totoal:0, current:0, insert_list:[], parsed_list:[]}

var Stream = require('stream')
var stream = new Stream()
stream.write = function (data) {
	plain_data += data
	var regex = /([^\r\n]*)\r?\n/mg
	var result
	while(true){
		var reg_ret = regex.exec(plain_data)
		if(!reg_ret) break
		result = reg_ret
		var split = result[1].split(',')
		if(split.length<4) continue
		var geo = {}
		geo.lng = parseFloat(split[0])
		geo.lat = parseFloat(split[1])
		geo.lng_offset = parseFloat(split[2])
		geo.lat_offset = parseFloat(split[3])
		db_manager.parsed_list.push(geo)
	}
	//console.log('inserting',db_manager.insert_list.length)
	if(db_manager.parsed_list.length!=0){
		db_manager.insert_list = db_manager.parsed_list
		db_manager.parsed_list = []
		google_geo.insert(db_manager.insert_list,function(err){
			if(err) console.log(err)
			db_manager.current += db_manager.insert_list.length
			//console.log('inserted',db_manager.insert_list.length)
			db_manager.insert_list = []
		})
		plain_data = plain_data.substring(result.index+result[1].length,plain_data.length)
		//console.log(plain_data)
	}
	return true
}
stream.end = function () {
	var start = new Date()
	db_manager.is_finished = true
	console.log('all inserted! time used',new Date()-db_manager.start_time,'ms')
	console.log('all inserted! now create index')
	google_geo.ensureIndex({lng:1,lat:1},{unique:true,dropDups:true},function(err){
		if(err) console.log(err)
		console.log('index finished, time used',new Date()-start,'ms')
		mongodb.close()
	})
}
function monitor(){
	if(db_manager.is_finished) return
	var t = (new Date() - db_manager.start_time)/1000
	var c = db_manager.current
	db_manager.totoal += c
	db_manager.current = 0
	var rate = db_manager.totoal/t
	console.log('inserted:',c,'rate:',rate,'per sec')
	setTimeout(monitor,1000)
}
setTimeout(monitor,1000)
inp.pipe(gunzip).pipe(stream)
