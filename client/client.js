var db_trace = new Meteor.Collection('trace')
var db_config = new Meteor.Collection('config')
//var db_user = new Meteor.Collection('users')
var db = {
	trace: db_trace,
	config: db_config
}

var my_global = {}

function invalidate_map(){
	$('.angular-leaflet-map').height($(window).height()-83)
}
$(document).ready(setTimeout(invalidate_map,1000))
$(window).resize(invalidate_map)
///////////
//angular//
///////////
meteor_helper = function(scope,sub_name){
	var $scope = scope
	var subscribe_name = sub_name
	var session_name = 'angular.$scope.'+subscribe_name
	var watch_list
	var reset_scope
	var doc_add
	var doc_change
	var doc_remove
	var get_query

	function on_get_query(cb){get_query=cb}
	function on_reset_scope(cb){reset_scope=cb;cb()}
	function on_doc_add(cb){doc_add=cb}
	function on_doc_change(cb){doc_change=cb}
	function on_doc_remove(cb){doc_remove=cb}

	function scope_safe_apply(){
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

	function observer_cursor(){
		var cursor = get_query && get_query() || db[subscribe_name].find({})
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
			added: function(doc){if(!doc_add)return;doc_add(doc,this);scope_safe_apply()},
			changed: function(ndoc,odoc){if(!doc_change)return;doc_change(ndoc,odoc,this);scope_safe_apply()},
			removed: function(doc){if(!doc_remove)return;doc_remove(doc,this);scope_safe_apply()},
		})
		cursor.fetch()
		this.observer = observer
		$scope.$on('$destroy',function(){
			observer.stop()
			console.log('destroy',subscribe_name,'.observer')
		})
	}

	function declare(self){
		var first_time = my_global[subscribe_name]==undefined
		my_global[subscribe_name] = self
		// console.log(my_global[subscribe_name])
		// can not run more than once per subscribe
		if(!first_time) return
		Deps.autorun(function(c){
			var obj = my_global[subscribe_name]
			console.log(obj)
			var to
			var handle
			var f = function(){
				//console.log(subscribe_name,handle.ready())
				if(handle.ready()){
					obj.observer_cursor()
					if(to) clearTimeout(to)
				}else
					to = setTimeout(f,50)
			}
			var session_value = Session.get(session_name)
			console.log('Session.get(session_name)=',session_value)
			if(!_.isEmpty(session_value)){
				if(obj.observer){
					obj.observer.stop()
					console.log('destroy',subscribe_name,'.observer when resubscribe')
				}
				if(obj.reset_scope){
					obj.reset_scope()
					obj.scope_safe_apply()
				}
				handle = Meteor.subscribe(subscribe_name,session_value,f)
			}
		})
	}

	function multi_watch(value_names,callback){
		for(var i=0; i<value_names.length; i++){
			(function(){
				var value_name = value_names[i]
				//console.log('watch',value_name)
				$scope.$watch(value_name, function (new_value,old_value) {
					if(new_value==old_value) return
					console.log(value_name,'changed to',new_value,'from',old_value)
					callback(value_name,new_value,old_value)
				})
			})()
		}
	}

	function resubscribe_if_change(/*watch_list*/){
		var session_value = {}
		watch_list = []
		//console.log(arguments)
		for(var i=0;i<arguments.length;i++){
			var value_name = arguments[i]
			watch_list[i] = value_name
			session_value[value_name] = $scope.$eval(value_name)
		}

		multi_watch(watch_list,function(value_name,new_value,old_value){
			session_value[value_name] = new_value
			Session.set(session_name,session_value)
		})
		Session.set(session_name,session_value)
		//private
		this.observer_cursor = observer_cursor
		this.observer_cursor()
		this.reset_scope = reset_scope
		declare(this)
	}

	function bind_user(value_name){
		function set_user(user){
			$scope[value_name] = user
			scope_safe_apply()
		}
		var cursor = Meteor.users.find({})
		var user_observer = cursor.observe({
			added: set_user,
			changed: set_user,
			removed: set_user
		})
		$scope.$on('$destroy',function(){
			user_observer.stop()
			console.log('destroy user.observer')
			delete user_observer
		})
	}

	return {
		//public
		on_reset_scope:on_reset_scope,
		on_doc_add:on_doc_add,
		on_doc_change:on_doc_change,
		on_doc_remove:on_doc_remove,
		on_get_query:on_get_query,
		resubscribe_if_change:resubscribe_if_change,
		scope_safe_apply:scope_safe_apply,
		bind_user:bind_user,
		multi_watch:multi_watch
	}
}

var app = angular.module("meteorapp",
['leaflet-directive','datetimepicker-directive', 'smartTable.table', '$strap.directives', 'ui.bootstrap'],
function($routeProvider, $locationProvider) {
	$routeProvider.
		when('/register', {templateUrl:'/register.html', controller:'registerController'}).
		when('/login', {templateUrl:'/login.html', controller:'loginController'}).
		when('/trace', {templateUrl:'/trace.html', controller: 'traceController'}).
		when('/config', {templateUrl:'/config.html', controller: 'configController'}).
		when('/logger', {templateUrl:'/logger.html', controller: 'loggerController'}).
		when('/webapi', {templateUrl:'/webapi.html', controller: 'webapiController'}).
		otherwise({redirectTo:'/trace'})
})

app.controller("markerController", ["$scope","$http", function($scope,$http) {
	$scope.geocoding_parse = 'none'
	$scope.geocoding = function(geo){
		//console.log('geocoding',geo)
		$scope.geocoding_parse = 'getting'
		$http.get('http://nominatim.openstreetmap.org/reverse?format=json&lat='+geo.lat+'&lon='+geo.lon+'&zoom=18&addressdetails=1')
		.success(function(data){
			//console.log(data)
			$scope.address = data.display_name
			$scope.geocoding_parse = 'done'
		})
		.error(function(e){
			console.log(e)
			$scope.geocoding_parse = 'none'
		})
	}
}])

app.controller("traceController", ["$scope","$compile","$filter", function($scope,$compile,$filter) {
	$scope.timestamp_start = new Date()
	$scope.timestamp_end = new Date(new Date().getTime()+24*3600*1000)
	$scope.show_main = true
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
		{label:'Satellites', map:'satellites_desc', title:'satellites'},
		{label:'Misc', map:'misc_desc', title:'misc'}
	]
	$scope.table_config={
		selectionMode: 'single',
		//displaySelectionCheckbox: true,
		itemsByPage:12,
		maxSize:8,
		//isGlobalSearchActivated:true,
		default_sort_column:0
	}

	$scope.change_tracking = function(){
		console.log('select',$scope.user.profile.tracking)
		Meteor.users.update({_id:Meteor.user()._id}, {$set:{'profile.tracking':$scope.user.profile.tracking}})
	}

	function insert_pvt(pvt,util){
		//shorten satellites, misc
		pvt.satellites_desc = pvt.satellites.length>40 ? pvt.satellites.substring(0,40)+'...' : pvt.satellites
		pvt.misc_desc = pvt.misc.length>40 ? pvt.misc.substring(0,40)+'...' : pvt.misc
		if(!(util.check_and_push($scope.records,pvt)&&Math.abs(pvt.lat)>0.001 && Math.abs(pvt.lon)>0.001))
			return
		var ng_html
		ng_html  = '<div ng-controller="markerController">'
		ng_html += '经度：'+pvt.lat+'°，'
		ng_html += '纬度：'+pvt.lon+'°<br>'
		ng_html += '海拔：'+pvt.alt+' 米<br>'
		ng_html += '卫星：'+pvt.satellites+'<br>'
		ng_html += '其他：'+pvt.misc+'<br>'
		ng_html += 'GPS时间：{{'+pvt.timestamp.valueOf()+'|date:"yyyy-MM-dd HH:mm:ss"}}<br>'
		ng_html += '上报时间：{{'+pvt.package_timestamp.valueOf()+'|date:"yyyy-MM-dd HH:mm:ss"}}<br>'
		ng_html += '地址：<a ng-show="geocoding_parse==\'none\'" ng-click="geocoding({lat:'+pvt.lat+',lon:'+pvt.lon+'})">获取</a>'
		ng_html += '<span ng-show="geocoding_parse==\'getting\'">正在获取...</span>'
		ng_html += '<span ng-show="geocoding_parse==\'done\'">{{address}}</span>'
		ng_html += '</div>'

		var geo = {lat:pvt.lat,lng:pvt.lon,package_timestamp:pvt.package_timestamp}
		var marker = _.clone(geo)
		//$scope.paths.p1.latlngs.push(geo)
		var v = $scope.paths.p1.latlngs
		//insert sort
		var i,delta
		for(i=v.length; i>0; i--){
			var g = v[i-1]
			if(g.package_timestamp<=geo.package_timestamp){
				delta = Math.abs(g.lat-geo.lat) + Math.abs(g.lng-geo.lng)
				delta *= 1000
				//console.log(delta)
				break
			}
		}
		v.splice(i,0,geo)
		//console.log(v)
		//
		marker.ng_html = ng_html
		$scope.markers2[pvt._id] = marker
		if(!delta||delta>8)
			$scope.markers[pvt._id] = marker
	}
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
		var nmarker = n && $scope.markers2[n._id] || null
		var omarker = o && $scope.markers2[o._id] || null
		//console.log(nmarker,omarker)
		if(nmarker){
			nmarker.focus = true
			$scope.markers[n._id] = nmarker
		}
		if(omarker){
			omarker.focus = false
		}
	})

	function on_reset_scope(){
		console.log('clear trace')
		$scope.center = {}
		$scope.records = []
		$scope.paths = {p1: {color:'#008000', weight:5, latlngs:[]}}
		$scope.markers = {}
		$scope.markers2 = {}
	}

	var meteor = new meteor_helper($scope,'trace')
	meteor.bind_user('user')
	meteor.on_doc_add(insert_pvt)
	meteor.on_reset_scope(on_reset_scope)
	meteor.resubscribe_if_change('user.profile.tracking','timestamp_start','timestamp_end')
}]);

app.controller("loggerController", ["$scope", function($scope) {
	$scope.timestamp_start = new Date()
	$scope.timestamp_end = new Date(new Date().getTime()+24*3600*1000)
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
		maxSize:8,
		isGlobalSearchActivated:true,
		default_sort_column:0
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
	meteor.resubscribe_if_change('user.profile.tracking','timestamp_start','timestamp_end')
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

	meteor.multi_watch(['config.freq','config.restart'],function(value_name,new_value,old_value){
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

app.controller("loginController", ["$scope","$http", function($scope,$http) {
	$scope.login = function(){
		//alert(url)
		$http.post('login',{user_name:$scope.user_name,password:$scope.password}).success(function(data){
			$scope.resp = data
		})
	}
}]);


app.controller("registerController", ["$scope", function($scope) {
	meteor = new meteor_helper($scope)
	meteor.bind_user('user')
	$scope.delete_terminal = function(sn){
		console.log('remove',sn)
		Meteor.users.update({_id:Meteor.user()._id}, {$pull:{'profile.terminals':sn}})
	}
	$scope.add_terminal = function(){
		Meteor.users.update({_id:Meteor.user()._id}, {$addToSet:{'profile.terminals':$scope.terminal_sn}})
	}
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
