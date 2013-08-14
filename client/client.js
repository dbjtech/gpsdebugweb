var db_trace = new Meteor.Collection('trace')
var db_config = new Meteor.Collection('config')
//var db_user = new Meteor.Collection('users')
var db = {
	trace: db_trace,
	config: db_config
}

var my_global = {}

;(function move_front() {
	var login_buttons_div = $('#login-buttons')
	if(login_buttons_div.length==0){
		//console.log('login_buttons_div not init')
		setTimeout(move_front,100)
	}else{
		//console.log(login_buttons_div)
		$('body').children().first().before(login_buttons_div)
	}
})()

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
				console.log('insert',doc)
				container.push(doc)
				container.cache[doc._id] = true
				return true
			},
			added: function(doc){doc_add(doc,this);scope_safe_apply()},
			changed: function(ndoc,odoc){doc_change(ndoc,odoc,this);scope_safe_apply()},
			removed: function(doc){doc_remove(doc,this);scope_safe_apply()},
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
['leaflet-directive','datetimepicker-directive', 'smartTable.table', '$strap.directives'],
function($routeProvider, $locationProvider) {
	$routeProvider.
		when('/register', {templateUrl:'/register.html', controller:'registerController'}).
		when('/login', {templateUrl:'/login.html', controller:'loginController'}).
		when('/trace', {templateUrl:'/trace.html', controller: 'traceController'}).
		when('/config', {templateUrl:'/config.html', controller: 'configController'}).
		when('/logger', {templateUrl:'/logger.html', controller: 'loggerController'}).
		otherwise({redirectTo:'/trace'})
})

app.controller("traceController", ["$scope","$filter", function($scope,$filter) {
	$scope.timestamp_start = new Date()
	$scope.timestamp_end = new Date(new Date().getTime()+24*3600*1000)
	$scope.show_main = true
	$scope.columns = [
		{label:'package_timestamp', map:'package_timestamp', formatFunction:'date',formatParameter:'yyyy-MM-dd HH:mm:ss'},
		{label:'gps_timestamp', map:'timestamp', formatFunction:'date',formatParameter:'yyyy-MM-dd HH:mm:ss'},
		{label:'lon', map:'lon'},
		{label:'lat', map:'lat'},
		{label:'alt', map:'alt'},
		{label:'std_lon', map:'std_lon'},
		{label:'std_lat', map:'std_lat'},
		{label:'std_alt', map:'std_alt'},
		{label:'range_rms', map:'range_rms'},
		{label:'satellites', map:'satellites'},
		{label:'misc', map:'misc'}
	]
	$scope.table_config={
		itemsByPage:50,
		maxSize:8,
		isGlobalSearchActivated:true
	}

	$scope.change_tracking = function(){
		console.log('select',$scope.user.profile.tracking)
		Meteor.users.update({_id:Meteor.user()._id}, {$set:{'profile.tracking':$scope.user.profile.tracking}})
	}

	function insert_pvt(pvt,util){
		var geo = {lat:pvt.lat,lng:pvt.lon}
		var marker = {}
		marker.lat = pvt.lat
		marker.lng = pvt.lon
		marker.message =  '经度：'+pvt.lat+'°，'
		marker.message += '纬度：'+pvt.lon+'°<br>'
		marker.message += '海拔：'+pvt.alt+' 米<br>'
		marker.message += 'GPS时间：'+$filter('date')(pvt.timestamp, 'yyyy-MM-dd HH:mm:ss')+'<br>'
		marker.message += '上报时间：'+$filter('date')(pvt.package_timestamp, 'yyyy-MM-dd HH:mm:ss')+'<br>'
		if(	util.check_and_push($scope.records,pvt) &&
			pvt.lat>0.001 && pvt.lon>0.001
		){
			$scope.paths.p1.latlngs.push(geo)
			$scope.markers[pvt._id] = marker
		}
	}

	function on_reset_scope(){
		console.log('clear trace')
		$scope.center = {}
		$scope.records = []
		$scope.paths = {p1: {color:'#008000', weight:5, latlngs:[]}}
		$scope.markers = {}
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
		{label:'package_timestamp', map:'package_timestamp', formatFunction:'date',formatParameter:'yyyy-MM-dd HH:mm:ss'},
		{label:'gps_timestamp', map:'timestamp', formatFunction:'date',formatParameter:'yyyy-MM-dd HH:mm:ss'},
		{label:'lon', map:'lon'},
		{label:'lat', map:'lat'},
		{label:'alt', map:'alt'},
		{label:'std_lon', map:'std_lon'},
		{label:'std_lat', map:'std_lat'},
		{label:'std_alt', map:'std_alt'},
		{label:'range_rms', map:'range_rms'},
		{label:'satellites', map:'satellites'},
		{label:'misc', map:'misc'}
	]
	$scope.table_config={
		itemsByPage:50,
		maxSize:8,
		isGlobalSearchActivated:true
	}
	var meteor = new meteor_helper($scope,'trace')
	meteor.bind_user('user')
	meteor.on_doc_add(function(doc,util){
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
