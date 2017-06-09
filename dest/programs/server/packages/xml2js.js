(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var blocking = Package.blocking.blocking;

/* Package-scope variables */
var xml2js;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/xml2js/server.js                                         //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
xml2js = Npm.require('xml2js');                                      // 1
                                                                     // 2
xml2js.parseStringSync = blocking(xml2js.parseString);               // 3
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.xml2js = {
  xml2js: xml2js
};

})();
