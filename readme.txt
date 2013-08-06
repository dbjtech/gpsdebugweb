prepare
1. install git
2. install mongodb
3. install meteor
4. install meteorites

some modification
1. git clone XXX
2. mrt
3. open packages/angularjs/server.js change to
var connect = Npm.require("connect");
var fs = Npm.require("fs");
var path = Npm.require("path");
var Fiber = Npm.require("fibers");

__meteor_bootstrap__.app
	.use(connect.query())
	.use(connect.logger())
	.use('/html',function (req, res, next) {

4. done