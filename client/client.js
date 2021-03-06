var db_trace = new Meteor.Collection('trace')
var db_config = new Meteor.Collection('config')
//var db_user = new Meteor.Collection('users')
var db = {
	trace: db_trace,
	config: db_config
}

var my_global = {
	timestamp: {
		date_options: {
			'month-format': '"yyyy-MM"',
			'day-title-format': '"yyyy-MM"'
		},
		start: new Date(),
		end: new Date(new Date().getTime()+24*3600*1000),
		start_open: false,
		end_open: false
	}
}

function invalidate_map(){
	$('.angular-leaflet-map').height($(window).height()-83)
}
$(document).ready(function(){
	$('.navbar, .containers').click(function(){Accounts._loginButtonsSession.closeDropdown()})
	$(window).resize(invalidate_map)
})

///////////
//angular//
///////////
meteor_helper = function(scope,sub_name){
	this.$scope = scope
	this.subscribe_name = sub_name
	this.session_name = 'angular.$scope.'+this.subscribe_name
	this.watch_list
	this.reset_scope
	this.doc_add
	this.doc_change
	this.doc_remove
	this.get_query

	this.on_get_query = function(cb){this.get_query=cb}
	this.on_reset_scope = function(cb){this.reset_scope=cb;cb()}
	this.on_doc_add = function(cb){this.doc_add=cb}
	this.on_doc_change = function(cb){this.doc_change=cb}
	this.on_doc_remove = function(cb){this.doc_remove=cb}

	this.scope_safe_apply = function(){
		var $scope = this.$scope
		if($scope.__safe_apply__) return
		$scope.__safe_apply__ = _.debounce(function() {
			try {
				$scope.$digest();
				delete $scope.__safe_apply__
			} catch(e) {
				setTimeout($scope.__safe_apply__, 1);
			}
		}, 100)
		$scope.__safe_apply__()
	}

	this.observer_cursor = function(){
		var self = this
		var cursor = self.get_query && self.get_query() || db[this.subscribe_name].find({})
		var observer = cursor.observe({
			check_and_push: function(container,doc){
				container.cache = container.cache || {}
				if(container.cache[doc._id]){
					console.log('skip',doc)
					return false
				}
				//console.log('insert',doc)
				container.push(doc)
				container.cache[doc._id] = true
				return true
			},
			added: function(doc){if(!self.doc_add)return;self.doc_add(doc,this);self.scope_safe_apply()},
			changed: function(ndoc,odoc){if(!self.doc_change)return;self.doc_change(ndoc,odoc,this);self.scope_safe_apply()},
			removed: function(doc){if(!self.doc_remove)return;self.doc_remove(doc,this);self.scope_safe_apply()},
		})
		cursor.fetch()
		this.observer = observer
		var last = this
		var off = this.$scope.$on('$destroy',function(){
			console.log('destroy',last.subscribe_name,'.observer')
			if(last.observer)
				last.observer.stop()
			delete last.$scope
			delete last.subscribe_name
			delete last.session_name
			delete last.watch_list
			delete last.reset_scope
			delete last.doc_add
			delete last.doc_change
			delete last.doc_remove
			delete last.get_query
			delete last.observer
			delete last.observer_cursor
			delete last
			off()
		})
	}

	this.declare = function(){
		var subscribe_name = this.subscribe_name
		var session_name = this.session_name
		var last = my_global[subscribe_name]
		my_global[subscribe_name] = this
		// console.log(my_global[subscribe_name])
		// can not run more than once per subscribe
		if(last){
			return
		}
		Deps.autorun(function(c){
			var obj = my_global[subscribe_name]
			//console.log(obj)
			var to
			var handle
			var f = function(){
				//console.log(subscribe_name,handle.ready())
				if(handle.ready()){
					my_global[subscribe_name].observer_cursor()
					if(to) clearTimeout(to)
				}else
					to = setTimeout(f,50)
			}
			var session_value = Session.get(session_name)
			//console.log('Session.get(session_name)=',session_value)
			if(!_.isEmpty(session_value)){
				if(obj.observer){
					obj.observer.stop()
					delete this.observer
					//delete this.observer_cursor
					console.log('destroy',subscribe_name,'.observer when resubscribe')
				}
				if(obj.reset_scope){
					obj.reset_scope()
					obj.scope_safe_apply()
				}
				handle = Meteor.subscribe(subscribe_name,session_value,f)
			}
			// delete obj
		})
	}

	this.multi_watch = function(value_names,callback){
		var self = this
		for(var i=0; i<value_names.length; i++){
			(function(){
				var value_name = value_names[i]
				//console.log('watch',value_name)
				self.$scope.$watch(value_name, function (new_value,old_value) {
					if(new_value==old_value) return
					console.log(value_name,'changed to',new_value,'from',old_value)
					callback(self,value_name,new_value,old_value)
				})
			})()
		}
	}

	this.resubscribe_if_change = function(/*watch_list*/){
		var session_value = {}
		this.watch_list = []
		//console.log(arguments)
		for(var i=0;i<arguments.length;i++){
			var value_name = arguments[i]
			this.watch_list[i] = value_name
			session_value[value_name] = this.$scope.$eval(value_name)
		}

		this.multi_watch(this.watch_list,function(self,value_name,new_value,old_value){
			session_value[value_name] = new_value
			Session.set(self.session_name,session_value)
		})
		Session.set(this.session_name,session_value)
		//private
		this.observer_cursor()
		this.declare()
	}

	this.bind_user = function(value_name){
		var self = this
		function set_user(user){
			self.$scope[value_name] = user
			self.scope_safe_apply()
		}
		var cursor = Meteor.users.find({})
		var user_observer = cursor.observe({
			added: set_user,
			changed: set_user,
			removed: set_user
		})
		this.$scope.$on('$destroy',function(){
			user_observer.stop()
			console.log('destroy user.observer')
			delete user_observer
			delete self
		})
	}

	return this
}

var app = angular.module("meteorapp",
['leaflet-directive', 'smartTable.table', '$strap.directives', 'ui.bootstrap'],
function($routeProvider, $locationProvider) {
	$routeProvider.
		when('/register', {templateUrl:'/register.html', controller:'registerController'}).
		when('/trace', {templateUrl:'/trace.html', controller: 'traceController'}).
		when('/config', {templateUrl:'/config.html', controller: 'configController'}).
		when('/logger', {templateUrl:'/logger.html', controller: 'loggerController'}).
		when('/webapi', {templateUrl:'/webapi.html', controller: 'webapiController'}).
		otherwise({redirectTo:'/trace'})
})

app.controller("markerController", ["$scope","$http", function($scope,$http) {
	$scope.address_cache = {}
	$scope.$on('popup',function(e,o){
		//console.log('popup',o,$scope.address_cache)
		$scope.current_marker = o
	})
	$scope.geocoding = function(geo){
		//console.log('geocoding',geo)
		var id = $scope.current_marker.data._id
		$scope.address_cache[id] = 10
		;(function counting(){
			if(typeof($scope.address_cache[id])!='number')
				return
			$scope.address_cache[id]--
			//console.log($scope.address_cache[id])
			if($scope.address_cache[id]==0)
				delete $scope.address_cache[id]
			else
				setTimeout(counting,1000)
			if(!$scope.$$phase&&!$scope.$root.$$phase)
				$scope.$apply()
		})()
		$http.get('http://nominatim.openstreetmap.org/reverse?format=json&lat='+geo.lat+'&lon='+geo.lon+'&zoom=18&addressdetails=1')
		.success(function(data){
			//console.log(data)
			$scope.address_cache[id] = data.display_name
		})
		.error(function(e){
			console.log(e)
			delete $scope.address_cache[id]
		})
	}
	var reg = /([^:]*):([^,]*),?/g
	$scope.format_html_desc = function(str){
		var first = true
		var html = ''
		while(true){
			var rs = reg.exec(str)
			if(!rs) break
			html += (first?'':',')+rs[1]+':<span>'+rs[2]+'</span>'
			first = false
		}
		return html==''?str:html
	}
}])

app.controller("traceController", ["$scope", function($scope) {
	//console.log(my_global.timestamp)
	$scope.timestamp = my_global.timestamp
	$scope.show_main = true
	$scope.columns = [
		{label:'Packet Time', map:'package_timestamp', formatFunction:'date',formatParameter:'MM-dd HH:mm:ss',sortPredicate:'-package_timestamp',headerClass:'sm-fix-header'},
		{label:'GPS Time', map:'timestamp', formatFunction:'date',formatParameter:'MM-dd HH:mm:ss',headerClass:'sm-fix-header'},
		{label:'Longitude', map:'lon',headerClass:'sm-fix-header-plus'},
		{label:'Latitude', map:'lat',headerClass:'sm-fix-header-plus'},
		{label:'Altitude', map:'alt',headerClass:'sm-fix-header-plus'},
		//{label:'std_lon', map:'std_lon'},
		//{label:'std_lat', map:'std_lat'},
		//{label:'std_alt', map:'std_alt'},
		//{label:'range_rms', map:'range_rms'},
		{label:'Satellites', map:'satellites', title:'satellites'},
		{label:'Misc', map:'misc', title:'misc'}
	]
	$scope.table_config={
		selectionMode: 'single',
		//displaySelectionCheckbox: true,
		itemsByPage:12,
		maxSize:10,
		//isGlobalSearchActivated:true,
		default_sort_column:0
	}

	$scope.change_tracking = function(){
		console.log('select',$scope.user.profile.tracking)
		Meteor.users.update({_id:Meteor.user()._id}, {$set:{'profile.tracking':$scope.user.profile.tracking}})
	}

	function insert_pvt(pvt,util){
		if(!(util.check_and_push($scope.records,pvt)&&Math.abs(pvt.lat)>0.001 && Math.abs(pvt.lon)>0.001))
			return

		var geo = {lat:pvt.lat,lng:pvt.lon}
		$scope.paths.p1.latlngs.push(geo)

		var marker = _.clone(geo)
		marker.data = pvt
		$scope.marker_all[pvt._id] = marker
	}
	//if record is selected, show the corresponding marker
	$scope.$watch(
	function(scope){
		var result = null
		for(var i=0; scope.records&&i<scope.records.length; i++){
			var row = scope.records[i]
			if(row.isSelected) result = row
		}
		//console.log('watching',result)
		return result
	},
	function(n,o){
		var nmarker = n && $scope.marker_all[n._id] || null
		var omarker = o && $scope.marker_all[o._id] || null
		record_select(nmarker,n)
		record_select(omarker,o)
	})
	function record_select(marker,record){
		//console.log(marker,record)
		if(!marker||!record) return
		marker.focus = record.isSelected
		if(record.isSelected){
			$scope.markers[record._id] = marker
			$scope.center.lat = marker.lat
			$scope.center.lng = marker.lng
		}else
			delete $scope.markers[record._id]
	}

	function clear_obj(obj){
		if(!obj) return
		for(var k in obj)
			delete obj[k]
	}
	function on_reset_scope(){
		console.log('clear trace')
		$scope.center = $scope.center || {zoom:3,lat:39.9,lng:116.397}
		$scope.records = []
		$scope.paths = {p1: {color:'#008000', weight:5, latlngs:[]}}
		clear_obj($scope.markers)
		clear_obj($scope.marker_all)
		$scope.markers = {}
		$scope.marker_all = {}
	}

	var meteor = new meteor_helper($scope,'trace')
	meteor.bind_user('user')
	meteor.on_doc_add(insert_pvt)
	meteor.on_reset_scope(on_reset_scope)
	meteor.resubscribe_if_change('user.profile.tracking','timestamp.start','timestamp.end')
	//
	setTimeout(invalidate_map,1000)
	setTimeout(invalidate_map,5000)
	setTimeout(invalidate_map,10000)
}]);

app.controller("loggerController", ["$scope","$filter", function($scope,$filter) {
	//console.log(my_global.timestamp)
	$scope.timestamp = my_global.timestamp
	$scope.columns = [
		{label:'Packet Time', map:'package_timestamp', formatFunction:'date',formatParameter:'yyyy-MM-dd HH:mm:ss',sortPredicate:'-package_timestamp',headerClass:'sm-fix-header'},
		{label:'GPS Time', map:'timestamp', formatFunction:'date',formatParameter:'yyyy-MM-dd HH:mm:ss',headerClass:'sm-fix-header'},
		{label:'Longitude', map:'lon',headerClass:'sm-fix-header-plus'},
		{label:'Latitude', map:'lat',headerClass:'sm-fix-header-plus'},
		{label:'Altitude', map:'alt',headerClass:'sm-fix-header-plus'},
		//{label:'std_lon', map:'std_lon'},
		//{label:'std_lat', map:'std_lat'},
		//{label:'std_alt', map:'std_alt'},
		//{label:'range_rms', map:'range_rms'},
		{label:'Satellites', map:'satellites'},
		{label:'Misc', map:'misc'}
	]
	$scope.table_config={
		itemsByPage:25,
		maxSize:20,
		isGlobalSearchActivated:true,
		default_sort_column:0
	}
	$scope.reset_time = function(){
		$scope.timestamp.start = new Date()
		$scope.timestamp.end = new Date(new Date().getTime()+24*3600*1000)
	}
	var meteor = new meteor_helper($scope,'trace')
	meteor.bind_user('user')
	meteor.on_doc_add(function(doc,util){
		//console.log('add',doc)
		util.check_and_push($scope.records,doc)
	})
	meteor.on_reset_scope(function(){
		console.log('clear records')
		$scope.records = []
	})
	meteor.resubscribe_if_change('user.profile.tracking','timestamp.start','timestamp.end')
	$scope.export_csv = function(){
		var filename = $filter('date')($scope.timestamp.start, 'yyyyMMdd.HHmmss')
		filename += $filter('date')($scope.timestamp.end, '-yyyyMMdd.HHmmss')
		filename += ".csv"
		var fields = _.map($scope.columns,function(col){return col.map})
		var dataUri = ""
		dataUri += _.map($scope.columns,function(col){return col.label}).join(',')+'\n'
		dataUri += _.map($scope.records,function(rc){
			var values = _.values(_.pick(rc,fields))
			values = _.map(values,JSON.stringify)//just add quotation mark
			return values.join(',')
		}).join('\n')
		dataUri = "data:text/csv;charset=utf-8,"+encodeURIComponent(dataUri)
		//window.open(dataUri)
		$("<a download='" + filename + "' href='" + dataUri + "'></a>")[0].click()
	}
}]);

app.controller("configController", ["$scope",function($scope) {
	$scope.freq_opt = [5,10,20,30,60,300]
	$scope.restart_opt = [
		{text:'Hot Start', value:'hot'},
		{text:'Warm Start', value:'warm'},
		{text:'Cold Start', value:'cold'},
		{text:'AGPS', value:'agps'}
	]
	function set_config(data){
		console.log('config download',data)
		$scope.config = data
	}
	function on_reset_scope(){
		delete $scope.config
	}
	var meteor = new meteor_helper($scope,'config')
	meteor.bind_user('user')
	meteor.on_doc_add(set_config)
	meteor.on_doc_change(set_config)
	meteor.on_reset_scope(on_reset_scope)
	meteor.resubscribe_if_change('user.profile.tracking')

	meteor.multi_watch(['config.freq','config.restart'],function(self,value_name,new_value,old_value){
		var value_name = value_name.split('.')[1]
		var old_setting = db_config.findOne({})
		console.dir(old_setting)
		if(!old_setting){
			console.log('config not found')
			return
		}
		if(old_setting[value_name]==new_value){
			console.log('config not change')
			return
		}
		var setting = _.omit(old_setting,'_id')
		setting[value_name] = new_value
		setting.unsynced = true
		console.log('config upload',setting)
		db_config.update({_id:old_setting._id},setting)
	})
}]);

app.controller("registerController", ["$scope","$http", function($scope,$http) {
	meteor = new meteor_helper($scope)
	meteor.bind_user('user')
	$scope.delete_terminal = function(sn){
		console.log('remove',sn)
		Meteor.users.update({_id:Meteor.user()._id}, {$pull:{'profile.terminals':sn}})
	}
	$scope.add_terminal = function(){
		Meteor.users.update({_id:Meteor.user()._id}, {$addToSet:{'profile.terminals':$scope.terminal_sn}})
	}

		var websocket = {}
	function ensure_connect(url,callback){
		// var socket = websocket[url]
		// if(socket){
		// 	return socket
		// }
		// socket = io.connect(url)
		// socket.on('api/resp', callback)
		// socket.on('disconnect', function() {
		// 	console.log('socket disconnect')
		// 	websocket[url] = undefined
		// })
		// socket.on('error', function(event){
		// 	console.log('socket error',event)
		// 	socket.removeAllListeners()
		// 	websocket[url] = undefined
		// })
		// websocket[url] = socket
		// return socket
	}
	// var app = angular.module('myapp', [])
	//app.controller('Ctrl', ['$scope','$http','$location',function($scope,$http,$location){
		var qs// = require('querystring')
		$scope.methods = ['websocket','json','get','post','put','delete']
		$scope.url = '/api/last_info'
		$scope.method = 'json'
		var param = {}
		param.terminal_id = '24208'

		$scope.body = JSON.stringify(param)
		$scope.submit = function(){
			console.log($scope.method,$scope.url,$scope.body)
			var config = {url:$scope.url,method:$scope.method}
			var method = $scope.method.toLowerCase()
			var p
			if(method=='websocket'){
				var socket = ensure_connect($location.path()+config.url,function(data){
					console.log(data)
				})
				config.data = JSON.parse($scope.body)
				socket.emit('api',config)
				return
			}else if(method=='get'){
				config.url += '?'+qs.stringify(JSON.parse($scope.body))
				console.log(config.url)
				p = $http(config)
			}else if(method=='json'){
				config.data = JSON.parse($scope.body)
				config.headers = {'Content-Type': 'application/json; charset=UTF-8'}
				p = $http.post(config.url,config.data,config)
			}else{
				config.data = $.param(JSON.parse($scope.body))
				config.headers = {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
				p = $http[method](config.url,config.data,config)
			}
			p.success(function(data){
				console.log(data)
				//console.log(qs.parse(data))
			}).error(function(data,status){
				console.log(status,data)
			})
		}
	//}])
}])

app.controller("webapiController",["$scope","$http",function($scope,$http){
		$scope.cids = 28655
		$scope.lacs = 17695
		$scope.mncs = 0
		$scope.mccs = 0
		$scope.strengths = null
		$scope.linkway = 1
		//var a = $scope.cids+$scope.lacs+$scope.mncs+$scope.mccs+$scope.strengths
		$scope.fetch = function(){
		//$scope.returns={"cells":[{"cid":28655,"lac":17695,"mnc":0,"mcc":1}]}
		if(angular.isNumber($scope.mccs) == false){
		$scope.cid = parseInt($scope.cids)
		$scope.lac = parseInt($scope.lacs)
		$scope.mnc = parseInt($scope.mncs)
		$scope.mcc = parseInt($scope.mccs)
		}
		$scope.da = {"cells":[{"cid":$scope.cid,"lac":$scope.lac,"mnc":$scope.mnc,"mcc":$scope.mcc,"strength":$scope.strengths}]}
		$http.post('/geo',{"cells":[{"cid":28655,"lac":17695,"mnc":0,"mcc":0}]}).success(function(data){
			$scope.returns=data
		}).error(function(e){
			$scope.returns=e
		})
	}
}])

