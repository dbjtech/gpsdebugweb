(function(){// var connect = Npm.require("connect");
var fs = Npm.require("fs");
var path = Npm.require("path");
var Fiber = Npm.require("fibers");

// add any runtime configuration options needed to app_html
var runtime_config = function (app_html) {
  var insert = '';
  if (typeof __meteor_runtime_config__ === 'undefined')
    return app_html;

  app_html = app_html.replace(
    "##RUNTIME_CONFIG##",
    '<script type="text/javascript">__meteor_runtime_config__ = ' +
      JSON.stringify(__meteor_runtime_config__) + ";</script>");

	app_html = app_html.replace(
		/##BUNDLED_JS_CSS_PREFIX##/g,
		__meteor_runtime_config__['ROOT_URL_PATH_PREFIX']
	)

  return app_html;
};

var htmlAttributes = function (app_html, request) {
  var attributes = '';
  _.each(__meteor_bootstrap__.htmlAttributeHooks || [], function (hook) {
    var attribute = hook(request);
    if (attribute !== null && attribute !== undefined && attribute !== '')
      attributes += ' ' + attribute;
  });
  return app_html.replace('##HTML_ATTRIBUTES##', attributes);
};


WebApp.connectHandlers
	// .use(connect.query())
	// .use(connect.logger())
	.use('/html',function (req, res, next) {
		// Need to create a Fiber since we're using synchronous http calls
		Fiber(function() {
			try{
				var code = fs.readFileSync(path.resolve('bundle/app.html'));
			}catch(e){
				var code = fs.readFileSync(path.resolve('../client/app.html'));
			}
			var angular = "";
			try{ 
				angular = fs.readFileSync(path.resolve('bundle/static/angular.html'));
			}catch(e){
				if(fs.existsSync("../client/app/angular.html")){
					angular = fs.readFileSync(path.resolve('../client/app/angular.html'));
				}else{
					console.log("Angularjs\n______\nCreate public/angular.html\n This is used as your main page, this should contain the contents of the body.");
				}
			}

			code = new String(code);
			//console.log((new String(angular)));
			code = code.replace("</body>\n</html>",new String(angular)+"\n</body>\n</html>");
			//code = code.replace("<html##HTML_ATTRIBUTES##>",'<html>');
			code = htmlAttributes(code,req)
			code = runtime_config(code)
			//console.log(""+code);
	
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(code);
			res.end();
			return;
			//next();
	}).run();
});

})();
