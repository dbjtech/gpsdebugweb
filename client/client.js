// var trace = new Meteor.Collection("trace")
// Template.hello.greeting = function () {
// 	return "Welcome to gps.dbjtech.com.";
// }
// Template.hello.events({
// 	'click input' : function () {
// 		// template data, if any, is available in 'this'
// 		if (typeof console !== 'undefined')
// 			console.log("You pressed the button");
// 	}
// })


///////////
//angular//
///////////
var app = angular.module("meteorapp",
	['meteor','leaflet-directive','datetimepicker-directive', 'smartTable.table', '$strap.directives'],
	function($routeProvider, $locationProvider) {
		$routeProvider.
			when('/register', {templateUrl:'/register.html', controller:'registerController'}).
			when('/login', {templateUrl:'/login.html', controller:'loginController'}).
			when('/trace', {templateUrl:'/trace.html', controller: 'traceController'}).
			when('/alert', {templateUrl:'/alert.html', controller: 'alertController'}).
			when('/logger', {templateUrl:'/logger.html', controller: 'loggerController'}).
			otherwise({redirectTo:'/login'})
	}
)

function angular_subscribe($scope,subscribe_name,value_names,callback) {
	var session_name = '$scope:'+value_names.join(',')
	var session_value = Session.get(session_name) || {}
	if(value_names && value_names.length!=0){
		for(i=0; i<value_names.length; i++){
			(function(){
				var value_name = value_names[i]
				session_value[value_name] = $scope[value_name]
				//console.log('watch',value_name)
				$scope.$watch(value_name, function (new_value,old_value) {
					if(new_value==old_value) return
					console.log(value_name,'changed to',new_value,'from',old_value,'session_name:',session_name)
					session_value[value_name] = new_value
					Session.set(session_name,session_value)
				})
			})()
		}
		Session.set(session_name,session_value)
		Deps.autorun(function(){
			var to
			var handle
			var f = function(){
				//console.log(handle.ready())
				if(handle.ready()){
					callback()
					if(to) clearTimeout(to)
				}else
					to = setTimeout(f,50)
			}
			handle = Meteor.subscribe(subscribe_name,Session.get(session_name),f)
		})
	}else{
		console.dir('WARN no session_name specified')
		Deps.autorun(function(){
			Meteor.subscribe(subscribe_name)
		})
	}
}

app.controller("traceController", ["$scope","$meteor","$http","$filter", function($scope,$meteor,$http,$filter) {
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
	angular_subscribe($scope,'trace',['terminal_sn','timestamp_start','timestamp_end'],function(){
		var data = $meteor('trace').find({})
		console.dir(data)
		var paths = []
		var markers = {}
		for(i=0; data&&i<data.length; i++){
			var pvt = data[i]
			var geo = {lat:pvt.lat,lng:pvt.lon}
			paths.push(geo)
			markers[i] = {}
			markers[i].lat = pvt.lat
			markers[i].lng = pvt.lon
			markers[i].message =  '经度：'+pvt.lat+'°，'
			markers[i].message += '纬度：'+pvt.lon+'°<br>'
			markers[i].message += '海拔：'+pvt.alt+' 米<br>'
			markers[i].message += '时间：'+$filter('date')(pvt.timestamp, 'yyyy-MM-dd HH:mm:ss')+'<br>'
		}
		$scope.paths.p1.latlngs = paths
		$scope.markers = markers
	})
}]);

app.controller("loggerController", ["$scope","$meteor","$http", function($scope,$meteor,$http) {
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
	angular_subscribe($scope,'trace',['terminal_sn','timestamp_start','timestamp_end'],function(){
		$scope.records = $meteor('trace').find({})
	})
}]);

app.controller("alertController", ["$scope","$http", function($scope,$http) {
	$scope.terminal_sn = '2013012199'
	$scope.timestamp_start = new Date(new Date().getTime()-24*3600*1000)
	$scope.timestamp_end = new Date()
	$scope.columns = [
		{label:'timestamp', map:'timestamp',formatFunction:'date', formatParameter:'MMdd HH:mm:ss'},
		{label:'type', map:'type'},
		{label:'fix_quality', map:'fix_quality'},
		{label:'geo', map:'geo', formatFunction: function(v,p){return JSON.stringify(v)}}
	]
	$scope.table_config={
		itemsByPage:50,
		maxSize:8,
		isGlobalSearchActivated:true
	}
	$scope.query_alert = function(){
		var url = 'alert/'+$scope.terminal_sn
		var params = {}
		params.timestamp_start = $scope.timestamp_start&&$scope.timestamp_start.getTime()||''
		params.timestamp_end = $scope.timestamp_end&&$scope.timestamp_end.getTime()||''
		//alert(url)
		$http.get(url,{params:params}).success(function(data){
			$scope.records = data
		})
	}
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