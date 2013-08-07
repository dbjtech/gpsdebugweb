var db_trace = new Meteor.Collection('trace')
var db_config = new Meteor.Collection('config')


///////////
//angular//
///////////
var angular_subscribe = {
	get_session_name: function(subscribe_name){return 'angular.$scope.'+subscribe_name},
	get_session_callback_name: function(subscribe_name){return angular_subscribe.get_session_name(subscribe_name)+'_callback'},
	declare: function(subscribe_name){
		var session_name = angular_subscribe.get_session_name(subscribe_name)
		var session_callback_name = angular_subscribe.get_session_callback_name(subscribe_name)
		Session.set(session_name,{})
		Deps.autorun(function(c){
			var to
			var handle
			var f = function(){
				console.log(subscribe_name,handle.ready())
				if(handle.ready()){
					var cb = angular_subscribe[session_callback_name]
					if(cb)
						cb()
					else
						console.log(session_callback_name,'=',cb)
					if(to) clearTimeout(to)
				}else
					to = setTimeout(f,50)
			}
			var session_value = Session.get(session_name)
			if(!_.isEmpty(session_value))
				handle = Meteor.subscribe(subscribe_name,session_value,f)
		})
	},
	bind: function($scope,subscribe_name,value_names,callback) {
		var session_name = angular_subscribe.get_session_name(subscribe_name)
		var session_callback_name = angular_subscribe.get_session_callback_name(subscribe_name)
		var session_value = Session.get(session_name)
		if(!value_names && value_names.length==0)
			throw new Error('value_names is empty')
		if(!session_value)
			throw new Error(session_name+' not register')

		for(i=0; i<value_names.length; i++){
			session_value[value_names[i]] = $scope[value_names[i]]
		}
		angular_subscribe.multi_watch($scope,value_names,function(value_name,new_value,old_value){
			session_value[value_name] = new_value
			Session.set(session_name,session_value)
		})
		//console.log('set',session_callback_name,'=',callback)
		angular_subscribe[session_callback_name] = callback
		Session.set(session_name,session_value)
	},
	refresh: function(subscribe_name){
		var session_callback_name = angular_subscribe.get_session_callback_name(subscribe_name)
		var cb = angular_subscribe[session_callback_name]
		if(cb) cb()
	},
	multi_watch: function($scope,value_names,callback){
		if(!value_names && value_names.length==0)
			throw new Error('value_names is empty')
		for(i=0; i<value_names.length; i++){
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
}

function safe_apply($scope){
	$scope.__safe_apply__ = _.debounce(function() {
		try {
			$scope.$digest();
		} catch(e) {
			setTimeout($scope.__safe_apply__, 0);
		}
	}, 100)
	$scope.__safe_apply__()
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
		otherwise({redirectTo:'/login'})
	angular_subscribe.declare('trace')
	angular_subscribe.declare('config')
})

app.controller("traceController", ["$scope","$filter", function($scope,$filter) {
	angular.extend($scope, {
		center: {
			lat: 22.3,
			lng: 113.5,
			zoom: 13
		},
		paths: {
			p1: {
				color: '#008000',
				weight: 5,
				latlngs: [],
			},
		},
		markers:{
			m1: {
				lat: 23,
				lng: 114,
				focus: true,
				message: "Hey, drag me if you want",
				draggable: true
			}
		}
	})
	$scope.terminal_sn = '2013012199'
	$scope.timestamp_start = new Date(new Date().getTime()-24*3600*1000)
	$scope.timestamp_end = new Date()
	function insert_pvt(pvt,do_not_apply){
		var geo = {lat:pvt.lat,lng:pvt.lon}
		var marker = {}
		marker.lat = pvt.lat
		marker.lng = pvt.lon
		marker.message =  '经度：'+pvt.lat+'°，'
		marker.message += '纬度：'+pvt.lon+'°<br>'
		marker.message += '海拔：'+pvt.alt+' 米<br>'
		marker.message += '时间：'+$filter('date')(pvt.timestamp, 'yyyy-MM-dd HH:mm:ss')+'<br>'
		$scope.paths.p1.latlngs.push(geo)
		$scope.markers[pvt._id] = marker
		if(do_not_apply!==true)
			safe_apply($scope)
	}
	var observer
	angular_subscribe.bind($scope,'trace',['terminal_sn','timestamp_start','timestamp_end'],function(){
		var cursor = db_trace.find({})
		observer = cursor.observe({
			added: insert_pvt,
		})
		var data = cursor.fetch()
		//console.dir(data)
		var paths = []
		var markers = {}
		$scope.paths.p1.latlngs = paths
		$scope.markers = markers
		for(i=0; data&&i<data.length; i++){
			insert_pvt(data[i],true)
		}
		safe_apply($scope)
	})
	$scope.$on('$destroy',function(){
		if(observer){
			observer.stop()
			console.log('destroy trace.observer')
		}
	})
}]);

app.controller("loggerController", ["$scope", function($scope) {
	$scope.terminal_sn = '2013012199'
	$scope.timestamp_start = new Date(new Date().getTime()-24*3600*1000)
	$scope.timestamp_end = new Date()
	$scope.columns = [
		{label:'timestamp', map:'timestamp'},
		{label:'lon', map:'lon'},
		{label:'lat', map:'lat'}
	]
	$scope.table_config={
		itemsByPage:50,
		maxSize:8,
		isGlobalSearchActivated:true
	}
	angular_subscribe.bind($scope,'trace',['terminal_sn','timestamp_start','timestamp_end'],function(){
		$scope.records = db_trace.find({}).fetch()
		safe_apply($scope)
	})
}]);

app.controller("configController", ["$scope",function($scope) {
	console.log($scope)
	$scope.terminal_sn = '2013012199'
	$scope.freq_opt = [5,10,20,30,60,300]
	$scope.restart_opt = [
		{text:'Hot Start', value:'hot'},
		{text:'Warm Start', value:'warm'},
		{text:'Cold Start', value:'cold'},
		{text:'AGPS', value:'agps'}
	]
	function set_config(data){
		console.log('config download',data)
		$scope.freq = data.freq
		$scope.restart = data.restart
		$scope.unsynced = data.unsynced
		safe_apply($scope)
	}
	var observer
	function update_form(){
		var cursor = db_config.find({mobile:$scope.terminal_sn})
		observer = cursor.observe({
			added: set_config,
			changed: set_config
		})
		if(cursor.length==0){
			$scope.freq = $scope.freq_opt[2]
			$scope.restart = $scope.restart_opt[0].value
			var setting = {}
			setting.unsynced = true
			setting.mobile = $scope.terminal_sn
			setting.freq = $scope.freq
			setting.restart = $scope.restart
			console.log('config insert',setting)
			db_config.insert(setting)
		}
	}
	angular_subscribe.bind($scope,'config',['terminal_sn'],update_form)
	angular_subscribe.multi_watch($scope,['freq','restart'],function(value_name,new_value,old_value){
		var old_setting = db_config.findOne({mobile:$scope.terminal_sn})
		console.dir(old_setting)
		if(!old_setting)
			throw new Error('config not found')
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
	$scope.$on('$destroy',function(){
		if(observer){
			observer.stop()
			console.log('destroy config.observer')
		}
	})
	update_form()
}]);

app.controller("loginController", ["$scope","$http", function($scope,$http) {
	$scope.login = function(){
		//alert(url)
		$http.post('login',{user_name:$scope.user_name,password:$scope.password}).success(function(data){
			$scope.resp = data
		})
	}
}]);


app.controller("registerController", ["$scope","$http", function($scope,$http) {
	$scope.register = function(){
		if($scope.password!=$scope.password_confirm){
			alert('password mismatch')
			return
		}
		//alert(url)
		$http.put('register',{user_name:$scope.user_name,password:$scope.password}).success(function(data){
			$scope.resp = data
			alert(data)
		})
	}
}]);