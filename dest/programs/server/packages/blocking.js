(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var blocking;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/blocking/server.js                                       //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
(function () {                                                       // 1
  var fibers = Npm.require('fibers');                                // 2
  var future = Npm.require('fibers/future');                         // 3
                                                                     // 4
  blocking = function (obj, fun) {                                   // 5
    if (!fun) {                                                      // 6
      fun = obj;                                                     // 7
      obj = undefined;                                               // 8
    }                                                                // 9
    var wrapped = Meteor._wrapAsync(fun);                            // 10
    var f = function () {                                            // 11
      if (typeof obj === 'undefined') {                              // 12
        obj = this;                                                  // 13
      }                                                              // 14
      return wrapped.apply(obj, arguments);                          // 15
    };                                                               // 16
    f._blocking = true;                                              // 17
    return f;                                                        // 18
  };                                                                 // 19
})();                                                                // 20
                                                                     // 21
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.blocking = {
  blocking: blocking
};

})();
