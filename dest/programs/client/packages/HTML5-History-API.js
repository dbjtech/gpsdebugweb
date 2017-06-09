//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
//                                                                      //
// If you are using Chrome, open the Developer Tools and click the gear //
// icon in its lower right corner. In the General Settings panel, turn  //
// on 'Enable source maps'.                                             //
//                                                                      //
// If you are using Firefox 23, go to `about:config` and set the        //
// `devtools.debugger.source-maps-enabled` preference to true.          //
// (The preference should be on by default in Firefox 24; versions      //
// older than 23 do not support source maps.)                           //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/HTML5-History-API/HTML5-History-API/history.iegte8.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*                                                                                                                     // 1
 * History API JavaScript Library v4.0.0                                                                               // 2
 *                                                                                                                     // 3
 * Support: IE8+, FF3+, Opera 9+, Safari, Chrome and other                                                             // 4
 *                                                                                                                     // 5
 * Copyright 2011-2013, Dmitrii Pakhtinov ( spb.piksel@gmail.com )                                                     // 6
 *                                                                                                                     // 7
 * http://spb-piksel.ru/                                                                                               // 8
 *                                                                                                                     // 9
 * Dual licensed under the MIT and GPL licenses:                                                                       // 10
 *   http://www.opensource.org/licenses/mit-license.php                                                                // 11
 *   http://www.gnu.org/licenses/gpl.html                                                                              // 12
 *                                                                                                                     // 13
 * Update: 19.05.13 22:46                                                                                              // 14
 */                                                                                                                    // 15
(function(window) {                                                                                                    // 16
    // symlink to document                                                                                             // 17
    var document = window.document;                                                                                    // 18
    // HTML element                                                                                                    // 19
    var documentElement = document.documentElement;                                                                    // 20
    // symlink to sessionStorage                                                                                       // 21
    var sessionStorage = window['sessionStorage'];                                                                     // 22
    // symlink to constructor of Object                                                                                // 23
    var Object = window['Object'];                                                                                     // 24
    // symlink to JSON Object                                                                                          // 25
    var JSON = window['JSON'];                                                                                         // 26
    // symlink to instance object of 'Location'                                                                        // 27
    var windowLocation = window.location;                                                                              // 28
    // symlink to instance object of 'History'                                                                         // 29
    var windowHistory = window.history;                                                                                // 30
    // new instance of 'History'. The default is a reference to the original object instance                           // 31
    var historyObject = windowHistory;                                                                                 // 32
    // symlink to method 'history.pushState'                                                                           // 33
    var historyPushState = windowHistory.pushState;                                                                    // 34
    // symlink to method 'history.replaceState'                                                                        // 35
    var historyReplaceState = windowHistory.replaceState;                                                              // 36
    // if the browser supports HTML5-History-API                                                                       // 37
    var isSupportHistoryAPI = !!historyPushState;                                                                      // 38
    // verifies the presence of an object 'state' in interface 'History'                                               // 39
    var isSupportStateObjectInHistory = 'state' in windowHistory;                                                      // 40
    // symlink to method 'Object.defineProperty'                                                                       // 41
    var defineProperty = Object.defineProperty;                                                                        // 42
    // new instance of 'Location', for IE8 will use the element HTMLAnchorElement, instead of pure object              // 43
    var locationObject = redefineProperty({}, 't') ? {} : document.createElement('a');                                 // 44
    // prefix for the names of events                                                                                  // 45
    var eventNamePrefix = '';                                                                                          // 46
    // String that will contain the name of the method                                                                 // 47
    var addEventListenerName = window.addEventListener ? 'addEventListener' : (eventNamePrefix = 'on') && 'attachEvent';
    // String that will contain the name of the method                                                                 // 49
    var removeEventListenerName = window.removeEventListener ? 'removeEventListener' : 'detachEvent';                  // 50
    // String that will contain the name of the method                                                                 // 51
    var dispatchEventName = window.dispatchEvent ? 'dispatchEvent' : 'fireEvent';                                      // 52
    // reference native methods for the events                                                                         // 53
    var addEvent = window[addEventListenerName];                                                                       // 54
    var removeEvent = window[removeEventListenerName];                                                                 // 55
    var dispatch = window[dispatchEventName];                                                                          // 56
    // default settings                                                                                                // 57
    var settings = {"basepath": '/', "redirect": 0, "type": '/'};                                                      // 58
    // key for the sessionStorage                                                                                      // 59
    var sessionStorageKey = '__historyAPI__';                                                                          // 60
    // Anchor Element for parseURL function                                                                            // 61
    var anchorElement = document.createElement('a');                                                                   // 62
    // last URL before change to new URL                                                                               // 63
    var lastURL = windowLocation.href;                                                                                 // 64
    // Control URL, need to fix the bug in Opera                                                                       // 65
    var checkUrlForPopState = '';                                                                                      // 66
    // trigger event 'onpopstate' on page load                                                                         // 67
    var isFireInitialState = false;                                                                                    // 68
    // store a list of 'state' objects in the current session                                                          // 69
    var stateStorage = {};                                                                                             // 70
    // in this object will be stored custom handlers                                                                   // 71
    var eventsList = {};                                                                                               // 72
                                                                                                                       // 73
    /**                                                                                                                // 74
     * Properties that will be replaced in the global                                                                  // 75
     * object 'window', to prevent conflicts                                                                           // 76
     *                                                                                                                 // 77
     * @type {Object}                                                                                                  // 78
     */                                                                                                                // 79
    var eventsDescriptors = {                                                                                          // 80
        "onhashchange": null,                                                                                          // 81
        "onpopstate": null                                                                                             // 82
    };                                                                                                                 // 83
                                                                                                                       // 84
    /**                                                                                                                // 85
     * Properties that will be replaced/added to object                                                                // 86
     * 'window.history', includes the object 'history.location',                                                       // 87
     * for a complete the work with the URL address                                                                    // 88
     *                                                                                                                 // 89
     * @type {Object}                                                                                                  // 90
     */                                                                                                                // 91
    var historyDescriptors = {                                                                                         // 92
        /**                                                                                                            // 93
         * @namespace history                                                                                          // 94
         * @param {String} [type]                                                                                      // 95
         * @param {String} [basepath]                                                                                  // 96
         */                                                                                                            // 97
        "redirect": function(type, basepath) {                                                                         // 98
            settings["basepath"] = basepath = basepath == null ? settings["basepath"] : basepath;                      // 99
            settings["type"] = type = type == null ? settings["type"] : type;                                          // 100
            if (window.top == window.self) {                                                                           // 101
                var relative = parseURL(null, false, true)._relative;                                                  // 102
                var search = windowLocation.search;                                                                    // 103
                var path = windowLocation.pathname;                                                                    // 104
                if (isSupportHistoryAPI) {                                                                             // 105
                    if (relative != basepath && (new RegExp("^" + basepath + "$", "i")).test(path)) {                  // 106
                        windowLocation.replace(relative);                                                              // 107
                    }                                                                                                  // 108
                    if ((new RegExp("^" + basepath + "$", "i")).test(path + '/')) {                                    // 109
                        windowLocation.replace(basepath);                                                              // 110
                    } else if (!(new RegExp("^" + basepath, "i")).test(path)) {                                        // 111
                        windowLocation.replace(path.replace(/^\//, basepath) + search);                                // 112
                    }                                                                                                  // 113
                } else if (path != basepath) {                                                                         // 114
                    windowLocation.replace(basepath + '#' + path.                                                      // 115
                        replace(new RegExp("^" + basepath, "i"), type) + search + windowLocation.hash);                // 116
                }                                                                                                      // 117
            }                                                                                                          // 118
        },                                                                                                             // 119
        /**                                                                                                            // 120
         * The method adds a state object entry                                                                        // 121
         * to the history.                                                                                             // 122
         *                                                                                                             // 123
         * @namespace history                                                                                          // 124
         * @param {Object} state                                                                                       // 125
         * @param {string} title                                                                                       // 126
         * @param {string} [url]                                                                                       // 127
         */                                                                                                            // 128
        pushState: function(state, title, url) {                                                                       // 129
            historyPushState && historyPushState.apply(windowHistory, arguments);                                      // 130
            changeState(state, url);                                                                                   // 131
        },                                                                                                             // 132
        /**                                                                                                            // 133
         * The method updates the state object,                                                                        // 134
         * title, and optionally the URL of the                                                                        // 135
         * current entry in the history.                                                                               // 136
         *                                                                                                             // 137
         * @namespace history                                                                                          // 138
         * @param {Object} state                                                                                       // 139
         * @param {string} title                                                                                       // 140
         * @param {string} [url]                                                                                       // 141
         */                                                                                                            // 142
        replaceState: function(state, title, url) {                                                                    // 143
            delete stateStorage[windowLocation.href];                                                                  // 144
            historyReplaceState && historyReplaceState.apply(windowHistory, arguments);                                // 145
            changeState(state, url, true);                                                                             // 146
        },                                                                                                             // 147
        /**                                                                                                            // 148
         * Object 'history.location' is similar to the                                                                 // 149
         * object 'window.location', except that in                                                                    // 150
         * HTML4 browsers it will behave a bit differently                                                             // 151
         *                                                                                                             // 152
         * @namespace history                                                                                          // 153
         */                                                                                                            // 154
        "location": {                                                                                                  // 155
            set: function(value) {                                                                                     // 156
                window.location = value;                                                                               // 157
            },                                                                                                         // 158
            get: function() {                                                                                          // 159
                return isSupportHistoryAPI ? windowLocation : locationObject;                                          // 160
            }                                                                                                          // 161
        },                                                                                                             // 162
        /**                                                                                                            // 163
         * A state object is an object representing                                                                    // 164
         * a user interface state.                                                                                     // 165
         *                                                                                                             // 166
         * @namespace history                                                                                          // 167
         */                                                                                                            // 168
        "state": {                                                                                                     // 169
            get: function() {                                                                                          // 170
                return stateStorage[windowLocation.href] || null;                                                      // 171
            }                                                                                                          // 172
        }                                                                                                              // 173
    };                                                                                                                 // 174
                                                                                                                       // 175
    /**                                                                                                                // 176
     * Properties for object 'history.location'.                                                                       // 177
     * Object 'history.location' is similar to the                                                                     // 178
     * object 'window.location', except that in                                                                        // 179
     * HTML4 browsers it will behave a bit differently                                                                 // 180
     *                                                                                                                 // 181
     * @type {Object}                                                                                                  // 182
     */                                                                                                                // 183
    var locationDescriptors = {                                                                                        // 184
        /**                                                                                                            // 185
         * Navigates to the given page.                                                                                // 186
         *                                                                                                             // 187
         * @namespace history.location                                                                                 // 188
         */                                                                                                            // 189
        assign: function(url) {                                                                                        // 190
            if (('' + url).indexOf('#') === 0) {                                                                       // 191
                changeState(null, url);                                                                                // 192
            } else {                                                                                                   // 193
                windowLocation.assign(url);                                                                            // 194
            }                                                                                                          // 195
        },                                                                                                             // 196
        /**                                                                                                            // 197
         * Reloads the current page.                                                                                   // 198
         *                                                                                                             // 199
         * @namespace history.location                                                                                 // 200
         */                                                                                                            // 201
        reload: function() {                                                                                           // 202
            windowLocation.reload();                                                                                   // 203
        },                                                                                                             // 204
        /**                                                                                                            // 205
         * Removes the current page from                                                                               // 206
         * the session history and navigates                                                                           // 207
         * to the given page.                                                                                          // 208
         *                                                                                                             // 209
         * @namespace history.location                                                                                 // 210
         */                                                                                                            // 211
        replace: function(url) {                                                                                       // 212
            if (('' + url).indexOf('#') === 0) {                                                                       // 213
                changeState(null, url, true);                                                                          // 214
            } else {                                                                                                   // 215
                windowLocation.replace(url);                                                                           // 216
            }                                                                                                          // 217
        },                                                                                                             // 218
        /**                                                                                                            // 219
         * Returns the current page's location.                                                                        // 220
         *                                                                                                             // 221
         * @namespace history.location                                                                                 // 222
         */                                                                                                            // 223
        toString: function() {                                                                                         // 224
            return this.href;                                                                                          // 225
        },                                                                                                             // 226
        /**                                                                                                            // 227
         * Returns the current page's location.                                                                        // 228
         * Can be set, to navigate to another page.                                                                    // 229
         *                                                                                                             // 230
         * @namespace history.location                                                                                 // 231
         */                                                                                                            // 232
        "href": {                                                                                                      // 233
            get: function() {                                                                                          // 234
                return parseURL()._href;                                                                               // 235
            }                                                                                                          // 236
        },                                                                                                             // 237
        /**                                                                                                            // 238
         * Returns the current page's protocol.                                                                        // 239
         *                                                                                                             // 240
         * @namespace history.location                                                                                 // 241
         */                                                                                                            // 242
        "protocol": null,                                                                                              // 243
        /**                                                                                                            // 244
         * Returns the current page's host and port number.                                                            // 245
         *                                                                                                             // 246
         * @namespace history.location                                                                                 // 247
         */                                                                                                            // 248
        "host": null,                                                                                                  // 249
        /**                                                                                                            // 250
         * Returns the current page's host.                                                                            // 251
         *                                                                                                             // 252
         * @namespace history.location                                                                                 // 253
         */                                                                                                            // 254
        "hostname": null,                                                                                              // 255
        /**                                                                                                            // 256
         * Returns the current page's port number.                                                                     // 257
         *                                                                                                             // 258
         * @namespace history.location                                                                                 // 259
         */                                                                                                            // 260
        "port": null,                                                                                                  // 261
        /**                                                                                                            // 262
         * Returns the current page's path only.                                                                       // 263
         *                                                                                                             // 264
         * @namespace history.location                                                                                 // 265
         */                                                                                                            // 266
        "pathname": {                                                                                                  // 267
            get: function() {                                                                                          // 268
                return parseURL()._pathname;                                                                           // 269
            }                                                                                                          // 270
        },                                                                                                             // 271
        /**                                                                                                            // 272
         * Returns the current page's search                                                                           // 273
         * string, beginning with the character                                                                        // 274
         * '?' and to the symbol '#'                                                                                   // 275
         *                                                                                                             // 276
         * @namespace history.location                                                                                 // 277
         */                                                                                                            // 278
        "search": {                                                                                                    // 279
            get: function() {                                                                                          // 280
                return parseURL()._search;                                                                             // 281
            }                                                                                                          // 282
        },                                                                                                             // 283
        /**                                                                                                            // 284
         * Returns the current page's hash                                                                             // 285
         * string, beginning with the character                                                                        // 286
         * '#' and to the end line                                                                                     // 287
         *                                                                                                             // 288
         * @namespace history.location                                                                                 // 289
         */                                                                                                            // 290
        "hash": {                                                                                                      // 291
            set: function(value) {                                                                                     // 292
                changeState(null, ('' + value).replace(/^(#|)/, '#'), false, lastURL);                                 // 293
            },                                                                                                         // 294
            get: function() {                                                                                          // 295
                return parseURL()._hash;                                                                               // 296
            }                                                                                                          // 297
        }                                                                                                              // 298
    };                                                                                                                 // 299
                                                                                                                       // 300
    /**                                                                                                                // 301
     * Just empty function                                                                                             // 302
     *                                                                                                                 // 303
     * @return void                                                                                                    // 304
     */                                                                                                                // 305
    function emptyFunction() {                                                                                         // 306
        // dummy                                                                                                       // 307
    }                                                                                                                  // 308
                                                                                                                       // 309
    /**                                                                                                                // 310
     * Prepares a parts of the current or specified reference for later use in the library                             // 311
     *                                                                                                                 // 312
     * @param {string} [href]                                                                                          // 313
     * @param {boolean} [isWindowLocation]                                                                             // 314
     * @param {boolean} [isNotAPI]                                                                                     // 315
     * @return {Object}                                                                                                // 316
     */                                                                                                                // 317
    function parseURL(href, isWindowLocation, isNotAPI) {                                                              // 318
        var re = /(?:([\w0-9]+:))?(?:\/\/(?:[^@]*@)?([^\/:\?#]+)(?::([0-9]+))?)?([^\?#]*)(?:(\?[^#]+)|\?)?(?:(#.*))?/; // 319
        if (href && !isWindowLocation) {                                                                               // 320
            var current = parseURL(), _pathname = current._pathname, _protocol = current._protocol;                    // 321
            // convert relative link to the absolute                                                                   // 322
            href = /^(?:[\w0-9]+\:)?\/\//.test(href) ? href.indexOf("/") === 0                                         // 323
                ? _protocol + href : href : _protocol + "//" + current._host + (                                       // 324
                href.indexOf("/") === 0 ? href : href.indexOf("?") === 0                                               // 325
                    ? _pathname + href : href.indexOf("#") === 0                                                       // 326
                    ? _pathname + current._search + href : _pathname.replace(/[^\/]+$/g, '') + href                    // 327
                );                                                                                                     // 328
        } else {                                                                                                       // 329
            href = isWindowLocation ? href : windowLocation.href;                                                      // 330
            // if current browser not support History-API                                                              // 331
            if (!isSupportHistoryAPI || isNotAPI) {                                                                    // 332
                // get hash fragment                                                                                   // 333
                href = href.replace(/^[^#]*/, '') || "#";                                                              // 334
                // form the absolute link from the hash                                                                // 335
                href = windowLocation.protocol + '//' + windowLocation.host + settings['basepath']                     // 336
                    + href.replace(new RegExp("^#[\/]?(?:" + settings["type"] + ")?"), "");                            // 337
            }                                                                                                          // 338
        }                                                                                                              // 339
        // that would get rid of the links of the form: /../../                                                        // 340
        anchorElement.href = href;                                                                                     // 341
        // decompose the link in parts                                                                                 // 342
        var result = re.exec(anchorElement.href);                                                                      // 343
        // host name with the port number                                                                              // 344
        var host = result[2] + (result[3] ? ':' + result[3] : '');                                                     // 345
        // folder                                                                                                      // 346
        var pathname = result[4] || '/';                                                                               // 347
        // the query string                                                                                            // 348
        var search = result[5] || '';                                                                                  // 349
        // hash                                                                                                        // 350
        var hash = result[6] === '#' ? '' : (result[6] || '');                                                         // 351
        // relative link, no protocol, no host                                                                         // 352
        var relative = pathname + search + hash;                                                                       // 353
        // special links for set to hash-link, if browser not support History API                                      // 354
        var nohash = pathname.replace(new RegExp("^" + settings["basepath"], "i"), settings["type"]) + search;         // 355
        // result                                                                                                      // 356
        return {                                                                                                       // 357
            _href: result[1] + '//' + host + relative,                                                                 // 358
            _protocol: result[1],                                                                                      // 359
            _host: host,                                                                                               // 360
            _hostname: result[2],                                                                                      // 361
            _port: result[3] || '',                                                                                    // 362
            _pathname: pathname,                                                                                       // 363
            _search: search,                                                                                           // 364
            _hash: hash,                                                                                               // 365
            _relative: relative,                                                                                       // 366
            _nohash: nohash,                                                                                           // 367
            _special: nohash + hash                                                                                    // 368
        }                                                                                                              // 369
    }                                                                                                                  // 370
                                                                                                                       // 371
    /**                                                                                                                // 372
     * Initializing storage for the custom state's object                                                              // 373
     */                                                                                                                // 374
    function storageInitialize(JSON) {                                                                                 // 375
        var storage = '';                                                                                              // 376
        if (sessionStorage) {                                                                                          // 377
            // get cache from the storage in browser                                                                   // 378
            storage += sessionStorage.getItem(sessionStorageKey);                                                      // 379
        } else {                                                                                                       // 380
            var cookie = document.cookie.split(sessionStorageKey + "=");                                               // 381
            if (cookie.length > 1) {                                                                                   // 382
                storage += (cookie.pop().split(";").shift() || 'null');                                                // 383
            }                                                                                                          // 384
        }                                                                                                              // 385
        try {                                                                                                          // 386
            stateStorage = JSON.parse(storage) || {};                                                                  // 387
        } catch(_e_) {                                                                                                 // 388
            stateStorage = {};                                                                                         // 389
        }                                                                                                              // 390
        // hang up the event handler to event unload page                                                              // 391
        addEvent(eventNamePrefix + 'unload', function() {                                                              // 392
            if (sessionStorage) {                                                                                      // 393
                // save current state's object                                                                         // 394
                sessionStorage.setItem(sessionStorageKey, JSON.stringify(stateStorage));                               // 395
            } else {                                                                                                   // 396
                // save the current 'state' in the cookie                                                              // 397
                var state = {};                                                                                        // 398
                if (state[windowLocation.href] = historyObject.state) {                                                // 399
                    document.cookie = sessionStorageKey + '=' + JSON.stringify(state);                                 // 400
                }                                                                                                      // 401
            }                                                                                                          // 402
        }, false);                                                                                                     // 403
    }                                                                                                                  // 404
                                                                                                                       // 405
    /**                                                                                                                // 406
     * This method is implemented to override the built-in(native)                                                     // 407
     * properties in the browser, unfortunately some browsers are                                                      // 408
     * not allowed to override all the properties and even add.                                                        // 409
     * For this reason, this was written by a method that tries to                                                     // 410
     * do everything necessary to get the desired result.                                                              // 411
     *                                                                                                                 // 412
     * @param {Object} object The object in which will be overridden/added property                                    // 413
     * @param {String} prop The property name to be overridden/added                                                   // 414
     * @param {Object} [descriptor] An object containing properties set/get                                            // 415
     * @param {Function} [onWrapped] The function to be called when the wrapper is created                             // 416
     * @return {Object|Boolean} Returns an object on success, otherwise returns false                                  // 417
     */                                                                                                                // 418
    function redefineProperty(object, prop, descriptor, onWrapped) {                                                   // 419
        // test only if descriptor is undefined                                                                        // 420
        descriptor = descriptor || {set: emptyFunction};                                                               // 421
        // variable will have a value of true the success of attempts to set descriptors                               // 422
        var isDefinedSetter = !descriptor.set;                                                                         // 423
        var isDefinedGetter = !descriptor.get;                                                                         // 424
        // for tests of attempts to set descriptors                                                                    // 425
        var test = {configurable: true, set: function() {                                                              // 426
            isDefinedSetter = 1;                                                                                       // 427
        }, get: function() {                                                                                           // 428
            isDefinedGetter = 1;                                                                                       // 429
        }};                                                                                                            // 430
                                                                                                                       // 431
        try {                                                                                                          // 432
            // testing for the possibility of overriding/adding properties                                             // 433
            defineProperty(object, prop, test);                                                                        // 434
            // running the test                                                                                        // 435
            object[prop] = object[prop];                                                                               // 436
            // attempt to override property using the standard method                                                  // 437
            defineProperty(object, prop, descriptor);                                                                  // 438
        } catch(_e_) {                                                                                                 // 439
        }                                                                                                              // 440
                                                                                                                       // 441
        // If the variable 'isDefined' has a false value, it means that need to try other methods                      // 442
        if (!isDefinedSetter || !isDefinedGetter) {                                                                    // 443
            // try to override/add the property, using deprecated functions                                            // 444
            if (object.__defineGetter__) {                                                                             // 445
                // testing for the possibility of overriding/adding properties                                         // 446
                object.__defineGetter__(prop, test.get);                                                               // 447
                object.__defineSetter__(prop, test.set);                                                               // 448
                // running the test                                                                                    // 449
                object[prop] = object[prop];                                                                           // 450
                // attempt to override property using the deprecated functions                                         // 451
                descriptor.get && object.__defineGetter__(prop, descriptor.get);                                       // 452
                descriptor.set && object.__defineSetter__(prop, descriptor.set);                                       // 453
            }                                                                                                          // 454
                                                                                                                       // 455
            // Browser refused to override the property, using the standard and deprecated methods                     // 456
            if ((!isDefinedSetter || !isDefinedGetter) && object === window) {                                         // 457
                try {                                                                                                  // 458
                    // save original value from this property                                                          // 459
                    var originalValue = object[prop];                                                                  // 460
                    // set null to built-in(native) property                                                           // 461
                    object[prop] = null;                                                                               // 462
                } catch(_e_) {                                                                                         // 463
                }                                                                                                      // 464
                // This rule for Internet Explorer 8                                                                   // 465
                if ('execScript' in window) {                                                                          // 466
                    /**                                                                                                // 467
                     * to IE8 override the global properties using                                                     // 468
                     * VBScript, declaring it in global scope with                                                     // 469
                     * the same names.                                                                                 // 470
                     */                                                                                                // 471
                    window['execScript']('Public ' + prop, 'VBScript');                                                // 472
                } else {                                                                                               // 473
                    try {                                                                                              // 474
                        /**                                                                                            // 475
                         * This hack allows to override a property                                                     // 476
                         * with the set 'configurable: false', working                                                 // 477
                         * in the hack 'Safari' to 'Mac'                                                               // 478
                         */                                                                                            // 479
                        defineProperty(object, prop, {value: emptyFunction});                                          // 480
                    } catch(_e_) {                                                                                     // 481
                    }                                                                                                  // 482
                }                                                                                                      // 483
                // set old value to new variable                                                                       // 484
                object[prop] = originalValue;                                                                          // 485
                                                                                                                       // 486
            } else if (!isDefinedSetter || !isDefinedGetter) {                                                         // 487
                // the last stage of trying to override the property                                                   // 488
                try {                                                                                                  // 489
                    try {                                                                                              // 490
                        // wrap the object in a new empty object                                                       // 491
                        var temp = Object.create(object);                                                              // 492
                        defineProperty(Object.getPrototypeOf(temp) === object ? temp : object, prop, descriptor);      // 493
                        for(var key in object) {                                                                       // 494
                            // need to bind a function to the original object                                          // 495
                            if (typeof object[key] === 'function') {                                                   // 496
                                temp[key] = object[key].bind(object);                                                  // 497
                            }                                                                                          // 498
                        }                                                                                              // 499
                        try {                                                                                          // 500
                            // to run a function that will inform about what the object was to wrapped                 // 501
                            onWrapped.call(temp, temp, object);                                                        // 502
                        } catch(_e_) {                                                                                 // 503
                        }                                                                                              // 504
                        object = temp;                                                                                 // 505
                    } catch(_e_) {                                                                                     // 506
                        // sometimes works override simply by assigning the prototype property of the constructor      // 507
                        defineProperty(object.constructor.prototype, prop, descriptor);                                // 508
                    }                                                                                                  // 509
                } catch(_e_) {                                                                                         // 510
                    // all methods have failed                                                                         // 511
                    return false;                                                                                      // 512
                }                                                                                                      // 513
            }                                                                                                          // 514
        }                                                                                                              // 515
                                                                                                                       // 516
        return object;                                                                                                 // 517
    }                                                                                                                  // 518
                                                                                                                       // 519
    /**                                                                                                                // 520
     * Adds the missing property in descriptor                                                                         // 521
     *                                                                                                                 // 522
     * @param {Object} object An object that stores values                                                             // 523
     * @param {String} prop Name of the property in the object                                                         // 524
     * @param {Object|null} descriptor Descriptor                                                                      // 525
     * @return {Object} Returns the generated descriptor                                                               // 526
     */                                                                                                                // 527
    function prepareDescriptorsForObject(object, prop, descriptor) {                                                   // 528
        descriptor = descriptor || {};                                                                                 // 529
        // the default for the object 'location' is the standard object 'window.location'                              // 530
        object = object === locationDescriptors ? windowLocation : object;                                             // 531
        // setter for object properties                                                                                // 532
        descriptor.set = (descriptor.set || function(value) {                                                          // 533
            object[prop] = value;                                                                                      // 534
        });                                                                                                            // 535
        // getter for object properties                                                                                // 536
        descriptor.get = (descriptor.get || function() {                                                               // 537
            return object[prop];                                                                                       // 538
        });                                                                                                            // 539
        return descriptor;                                                                                             // 540
    }                                                                                                                  // 541
                                                                                                                       // 542
    /**                                                                                                                // 543
     * Wrapper for the methods 'addEventListener/attachEvent' in the context of the 'window'                           // 544
     *                                                                                                                 // 545
     * @param {String} event The event type for which the user is registering                                          // 546
     * @param {Function} listener The method to be called when the event occurs.                                       // 547
     * @param {Boolean} capture If true, capture indicates that the user wishes to initiate capture.                   // 548
     * @return void                                                                                                    // 549
     */                                                                                                                // 550
    function addEventListener(event, listener, capture) {                                                              // 551
        if (event in eventsList) {                                                                                     // 552
            // here stored the event listeners 'popstate/hashchange'                                                   // 553
            eventsList[event].push(listener);                                                                          // 554
        } else {                                                                                                       // 555
            // FireFox support non-standart four argument aWantsUntrusted                                              // 556
            // https://github.com/devote/HTML5-History-API/issues/13                                                   // 557
            if (arguments.length > 3) {                                                                                // 558
                addEvent(event, listener, capture, arguments[3]);                                                      // 559
            } else {                                                                                                   // 560
                addEvent(event, listener, capture);                                                                    // 561
            }                                                                                                          // 562
        }                                                                                                              // 563
    }                                                                                                                  // 564
                                                                                                                       // 565
    /**                                                                                                                // 566
     * Wrapper for the methods 'removeEventListener/detachEvent' in the context of the 'window'                        // 567
     *                                                                                                                 // 568
     * @param {String} event The event type for which the user is registered                                           // 569
     * @param {Function} listener The parameter indicates the Listener to be removed.                                  // 570
     * @param {Boolean} capture Was registered as a capturing listener or not.                                         // 571
     * @return void                                                                                                    // 572
     */                                                                                                                // 573
    function removeEventListener(event, listener, capture) {                                                           // 574
        var list = eventsList[event];                                                                                  // 575
        if (list) {                                                                                                    // 576
            for(var i = list.length; --i;) {                                                                           // 577
                if (list[i] === listener) {                                                                            // 578
                    list.splice(i, 1);                                                                                 // 579
                    break;                                                                                             // 580
                }                                                                                                      // 581
            }                                                                                                          // 582
        } else {                                                                                                       // 583
            removeEvent(event, listener, capture);                                                                     // 584
        }                                                                                                              // 585
    }                                                                                                                  // 586
                                                                                                                       // 587
    /**                                                                                                                // 588
     * Wrapper for the methods 'dispatchEvent/fireEvent' in the context of the 'window'                                // 589
     *                                                                                                                 // 590
     * @param {Event|String} event Instance of Event or event type string if 'eventObject' used                        // 591
     * @param {*} [eventObject] For Internet Explorer 8 required event object on this argument                         // 592
     * @return {Boolean} If 'preventDefault' was called the value is false, else the value is true.                    // 593
     */                                                                                                                // 594
    function dispatchEvent(event, eventObject) {                                                                       // 595
        var eventType = ('' + (typeof event === "string" ? event : event.type)).replace(/^on/, '');                    // 596
        var list = eventsList[eventType];                                                                              // 597
        if (list) {                                                                                                    // 598
            // need to understand that there is one object of Event                                                    // 599
            eventObject = typeof event === "string" ? eventObject : event;                                             // 600
            if (eventObject.target == null) {                                                                          // 601
                // need to override some of the properties of the Event object                                         // 602
                for(var props = ['target', 'currentTarget', 'srcElement', 'type']; event = props.pop();) {             // 603
                    // use 'redefineProperty' to override the properties                                               // 604
                    eventObject = redefineProperty(eventObject, event, {                                               // 605
                        get: event === 'type' ? function() {                                                           // 606
                            return eventType;                                                                          // 607
                        } : function() {                                                                               // 608
                            return window;                                                                             // 609
                        }                                                                                              // 610
                    });                                                                                                // 611
                }                                                                                                      // 612
            }                                                                                                          // 613
            // run function defined in the attributes 'onpopstate/onhashchange' in the 'window' context                // 614
            ((eventType === 'popstate' ? window.onpopstate : window.onhashchange)                                      // 615
                || emptyFunction).call(window, eventObject);                                                           // 616
            // run other functions that are in the list of handlers                                                    // 617
            for(var i = 0, len = list.length; i < len; i++) {                                                          // 618
                list[i].call(window, eventObject);                                                                     // 619
            }                                                                                                          // 620
            return true;                                                                                               // 621
        } else {                                                                                                       // 622
            return dispatch(event, eventObject);                                                                       // 623
        }                                                                                                              // 624
    }                                                                                                                  // 625
                                                                                                                       // 626
    /**                                                                                                                // 627
     * dispatch current state event                                                                                    // 628
     */                                                                                                                // 629
    function firePopState() {                                                                                          // 630
        var o = document.createEvent ? document.createEvent('Event') : document.createEventObject();                   // 631
        if (o.initEvent) {                                                                                             // 632
            o.initEvent('popstate', false, false);                                                                     // 633
        } else {                                                                                                       // 634
            o.type = 'popstate';                                                                                       // 635
        }                                                                                                              // 636
        o.state = historyObject.state;                                                                                 // 637
        // send a newly created events to be processed                                                                 // 638
        dispatchEvent(o);                                                                                              // 639
    }                                                                                                                  // 640
                                                                                                                       // 641
    /**                                                                                                                // 642
     * fire initial state for non-HTML5 browsers                                                                       // 643
     */                                                                                                                // 644
    function fireInitialState() {                                                                                      // 645
        if (isFireInitialState) {                                                                                      // 646
            isFireInitialState = false;                                                                                // 647
            firePopState();                                                                                            // 648
        }                                                                                                              // 649
    }                                                                                                                  // 650
                                                                                                                       // 651
    /**                                                                                                                // 652
     * Change the data of the current history for HTML4 browsers                                                       // 653
     *                                                                                                                 // 654
     * @param {Object} state                                                                                           // 655
     * @param {string} [url]                                                                                           // 656
     * @param {Boolean} [replace]                                                                                      // 657
     * @param {string} [lastURLValue]                                                                                  // 658
     * @return void                                                                                                    // 659
     */                                                                                                                // 660
    function changeState(state, url, replace, lastURLValue) {                                                          // 661
        if (!isSupportHistoryAPI) {                                                                                    // 662
            // normalization url                                                                                       // 663
            var urlObject = parseURL(url);                                                                             // 664
            // if current url not equal new url                                                                        // 665
            if (urlObject._relative !== parseURL()._relative) {                                                        // 666
                // if empty lastURLValue to skip hash change event                                                     // 667
                lastURL = lastURLValue;                                                                                // 668
                if (replace) {                                                                                         // 669
                    // only replace hash, not store to history                                                         // 670
                    windowLocation.replace("#" + urlObject._special);                                                  // 671
                } else {                                                                                               // 672
                    // change hash and add new record to history                                                       // 673
                    windowLocation.hash = urlObject._special;                                                          // 674
                }                                                                                                      // 675
            }                                                                                                          // 676
        }                                                                                                              // 677
        if (!isSupportStateObjectInHistory && state) {                                                                 // 678
            stateStorage[windowLocation.href] = state;                                                                 // 679
        }                                                                                                              // 680
        isFireInitialState = false;                                                                                    // 681
    }                                                                                                                  // 682
                                                                                                                       // 683
    /**                                                                                                                // 684
     * Event handler function changes the hash in the address bar                                                      // 685
     *                                                                                                                 // 686
     * @param {Event} event                                                                                            // 687
     * @return void                                                                                                    // 688
     */                                                                                                                // 689
    function onHashChange(event) {                                                                                     // 690
        // if not empty lastURL, otherwise skipped the current handler event                                           // 691
        if (lastURL) {                                                                                                 // 692
            // if checkUrlForPopState equal current url, this means that the event was raised popstate browser         // 693
            if (checkUrlForPopState !== windowLocation.href) {                                                         // 694
                // otherwise,                                                                                          // 695
                // the browser does not support popstate event or just does not run the event by changing the hash.    // 696
                firePopState();                                                                                        // 697
            }                                                                                                          // 698
            // current event object                                                                                    // 699
            event = event || window.event;                                                                             // 700
                                                                                                                       // 701
            var oldURLObject = parseURL(lastURL, true);                                                                // 702
            var newURLObject = parseURL();                                                                             // 703
            // HTML4 browser not support properties oldURL/newURL                                                      // 704
            if (!event.oldURL) {                                                                                       // 705
                event.oldURL = oldURLObject._href;                                                                     // 706
                event.newURL = newURLObject._href;                                                                     // 707
            }                                                                                                          // 708
            if (oldURLObject._hash !== newURLObject._hash) {                                                           // 709
                // if current hash not equal previous hash                                                             // 710
                dispatchEvent(event);                                                                                  // 711
            }                                                                                                          // 712
        }                                                                                                              // 713
        // new value to lastURL                                                                                        // 714
        lastURL = windowLocation.href;                                                                                 // 715
    }                                                                                                                  // 716
                                                                                                                       // 717
    /**                                                                                                                // 718
     * The event handler is fully loaded document                                                                      // 719
     *                                                                                                                 // 720
     * @param {*} [noScroll]                                                                                           // 721
     * @return void                                                                                                    // 722
     */                                                                                                                // 723
    function onLoad(noScroll) {                                                                                        // 724
        // Get rid of the events popstate when the first loading a document in the webkit browsers                     // 725
        setTimeout(function() {                                                                                        // 726
            // hang up the event handler for the built-in popstate event in the browser                                // 727
            addEvent('popstate', function(e) {                                                                         // 728
                // set the current url, that suppress the creation of the popstate event by changing the hash          // 729
                checkUrlForPopState = windowLocation.href;                                                             // 730
                // for Safari browser in OS Windows not implemented 'state' object in 'History' interface              // 731
                // and not implemented in old HTML4 browsers                                                           // 732
                if (!isSupportStateObjectInHistory) {                                                                  // 733
                    e = redefineProperty(e, 'state', {get: function() {                                                // 734
                        return historyObject.state;                                                                    // 735
                    }});                                                                                               // 736
                }                                                                                                      // 737
                // send events to be processed                                                                         // 738
                dispatchEvent(e);                                                                                      // 739
            }, false);                                                                                                 // 740
        }, 0);                                                                                                         // 741
        // for non-HTML5 browsers                                                                                      // 742
        if (!isSupportHistoryAPI && noScroll !== true && historyObject.location) {                                     // 743
            // scroll window to anchor element                                                                         // 744
            scrollToAnchorId(historyObject.location.hash);                                                             // 745
            // fire initial state for non-HTML5 browser after load page                                                // 746
            fireInitialState();                                                                                        // 747
        }                                                                                                              // 748
    }                                                                                                                  // 749
                                                                                                                       // 750
    /**                                                                                                                // 751
     * handler url with anchor for non-HTML5 browsers                                                                  // 752
     *                                                                                                                 // 753
     * @param e                                                                                                        // 754
     */                                                                                                                // 755
    function onAnchorClick(e) {                                                                                        // 756
        var event = e || window.event;                                                                                 // 757
        var target = event.target || event.srcElement;                                                                 // 758
        var defaultPrevented = "defaultPrevented" in event ? event['defaultPrevented'] : event.returnValue === false;  // 759
        if (target && target.nodeName === "A" && !defaultPrevented) {                                                  // 760
            var current = parseURL();                                                                                  // 761
            var expect = parseURL(target.getAttribute("href", 2));                                                     // 762
            var isEqualBaseURL = current._href.split('#').shift() === expect._href.split('#').shift();                 // 763
            if (isEqualBaseURL) {                                                                                      // 764
                if (current._hash !== expect._hash) {                                                                  // 765
                    historyObject.location.hash = expect._hash;                                                        // 766
                }                                                                                                      // 767
                scrollToAnchorId(expect._hash);                                                                        // 768
                if (event.preventDefault) {                                                                            // 769
                    event.preventDefault();                                                                            // 770
                } else {                                                                                               // 771
                    event.returnValue = false;                                                                         // 772
                }                                                                                                      // 773
            }                                                                                                          // 774
        }                                                                                                              // 775
    }                                                                                                                  // 776
                                                                                                                       // 777
    /**                                                                                                                // 778
     * Scroll page to current anchor in url-hash                                                                       // 779
     *                                                                                                                 // 780
     * @param hash                                                                                                     // 781
     */                                                                                                                // 782
    function scrollToAnchorId(hash) {                                                                                  // 783
        var target = document.getElementById(hash = (hash || '').replace(/^#/, ''));                                   // 784
        if (target && target.id === hash && target.nodeName === "A") {                                                 // 785
            var rect = target.getBoundingClientRect();                                                                 // 786
            window.scrollTo((documentElement.scrollLeft || 0), rect.top + (documentElement.scrollTop || 0)             // 787
                - (documentElement.clientTop || 0));                                                                   // 788
        }                                                                                                              // 789
    }                                                                                                                  // 790
                                                                                                                       // 791
    /**                                                                                                                // 792
     * Library initialization                                                                                          // 793
     *                                                                                                                 // 794
     * @return {Boolean} return true if all is well, otherwise return false value                                      // 795
     */                                                                                                                // 796
    function initialize() {                                                                                            // 797
        /**                                                                                                            // 798
         * Get custom settings from the query string                                                                   // 799
         */                                                                                                            // 800
        var scripts = document.getElementsByTagName('script');                                                         // 801
        var src = (scripts[scripts.length - 1] || {}).src || '';                                                       // 802
        var arg = src.indexOf('?') !== -1 ? src.split('?').pop() : '';                                                 // 803
        arg.replace(/(\w+)(?:=([^&]*))?/g, function(a, key, value) {                                                   // 804
            settings[key] = (value || (key === 'basepath' ? '/' : '')).replace(/^(0|false)$/, '');                     // 805
        });                                                                                                            // 806
                                                                                                                       // 807
        /**                                                                                                            // 808
         * hang up the event handler to listen to the events hashchange                                                // 809
         */                                                                                                            // 810
        addEvent(eventNamePrefix + 'hashchange', onHashChange, false);                                                 // 811
                                                                                                                       // 812
        // a list of objects with pairs of descriptors/object                                                          // 813
        var data = [locationDescriptors, locationObject, eventsDescriptors, window, historyDescriptors, historyObject];
                                                                                                                       // 815
        // if browser support object 'state' in interface 'History'                                                    // 816
        if (isSupportStateObjectInHistory) {                                                                           // 817
            // remove state property from descriptor                                                                   // 818
            delete historyDescriptors['state'];                                                                        // 819
        }                                                                                                              // 820
                                                                                                                       // 821
        // initializing descriptors                                                                                    // 822
        for(var i = 0; i < data.length; i += 2) {                                                                      // 823
            for(var prop in data[i]) {                                                                                 // 824
                if (data[i].hasOwnProperty(prop)) {                                                                    // 825
                    if (typeof data[i][prop] === 'function') {                                                         // 826
                        // If the descriptor is a simple function, simply just assign it an object                     // 827
                        data[i + 1][prop] = data[i][prop];                                                             // 828
                    } else {                                                                                           // 829
                        // prepare the descriptor the required format                                                  // 830
                        var descriptor = prepareDescriptorsForObject(data[i], prop, data[i][prop]);                    // 831
                        // try to set the descriptor object                                                            // 832
                        if (!redefineProperty(data[i + 1], prop, descriptor, function(n, o) {                          // 833
                            // is satisfied if the failed override property                                            // 834
                            if (o === historyObject) {                                                                 // 835
                                // the problem occurs in Safari on the Mac                                             // 836
                                window.history = historyObject = data[i + 1] = n;                                      // 837
                            }                                                                                          // 838
                        })) {                                                                                          // 839
                            // if there is no possibility override.                                                    // 840
                            // This browser does not support descriptors, such as IE7                                  // 841
                                                                                                                       // 842
                            // remove previously hung event handlers                                                   // 843
                            removeEvent(eventNamePrefix + 'hashchange', onHashChange, false);                          // 844
                                                                                                                       // 845
                            // fail to initialize :(                                                                   // 846
                            return false;                                                                              // 847
                        }                                                                                              // 848
                                                                                                                       // 849
                        // create a repository for custom handlers onpopstate/onhashchange                             // 850
                        if (data[i + 1] === window) {                                                                  // 851
                            eventsList[prop] = eventsList[prop.substr(2)] = [];                                        // 852
                        }                                                                                              // 853
                    }                                                                                                  // 854
                }                                                                                                      // 855
            }                                                                                                          // 856
        }                                                                                                              // 857
                                                                                                                       // 858
        // redirect if necessary                                                                                       // 859
        if (settings['redirect']) {                                                                                    // 860
            historyObject['redirect']();                                                                               // 861
        }                                                                                                              // 862
                                                                                                                       // 863
        // If browser does not support object 'state' in interface 'History'                                           // 864
        if (!isSupportStateObjectInHistory && JSON) {                                                                  // 865
            storageInitialize(JSON);                                                                                   // 866
        }                                                                                                              // 867
                                                                                                                       // 868
        // track clicks on anchors                                                                                     // 869
        if (!isSupportHistoryAPI) {                                                                                    // 870
            document[addEventListenerName](eventNamePrefix + "click", onAnchorClick, false);                           // 871
        }                                                                                                              // 872
                                                                                                                       // 873
        if (document.readyState === 'complete') {                                                                      // 874
            onLoad(true);                                                                                              // 875
        } else {                                                                                                       // 876
            if (!isSupportHistoryAPI && parseURL()._relative !== settings["basepath"]) {                               // 877
                isFireInitialState = true;                                                                             // 878
            }                                                                                                          // 879
            /**                                                                                                        // 880
             * Need to avoid triggering events popstate the initial page load.                                         // 881
             * Hang handler popstate as will be fully loaded document that                                             // 882
             * would prevent triggering event onpopstate                                                               // 883
             */                                                                                                        // 884
            addEvent(eventNamePrefix + 'load', onLoad, false);                                                         // 885
        }                                                                                                              // 886
                                                                                                                       // 887
        // everything went well                                                                                        // 888
        return true;                                                                                                   // 889
    }                                                                                                                  // 890
                                                                                                                       // 891
    /**                                                                                                                // 892
     * Starting the library                                                                                            // 893
     */                                                                                                                // 894
    if (!initialize()) {                                                                                               // 895
        // if unable to initialize descriptors                                                                         // 896
        // therefore quite old browser and there                                                                       // 897
        // is no sense to continue to perform                                                                          // 898
        return;                                                                                                        // 899
    }                                                                                                                  // 900
                                                                                                                       // 901
    /**                                                                                                                // 902
     * If the property history.emulate will be true,                                                                   // 903
     * this will be talking about what's going on                                                                      // 904
     * emulation capabilities HTML5-History-API.                                                                       // 905
     * Otherwise there is no emulation, ie the                                                                         // 906
     * built-in browser capabilities.                                                                                  // 907
     *                                                                                                                 // 908
     * @type {boolean}                                                                                                 // 909
     * @const                                                                                                          // 910
     */                                                                                                                // 911
    historyObject['emulate'] = !isSupportHistoryAPI;                                                                   // 912
                                                                                                                       // 913
    /**                                                                                                                // 914
     * Replace the original methods on the wrapper                                                                     // 915
     */                                                                                                                // 916
    window[addEventListenerName] = addEventListener;                                                                   // 917
    window[removeEventListenerName] = removeEventListener;                                                             // 918
    window[dispatchEventName] = dispatchEvent;                                                                         // 919
                                                                                                                       // 920
})(window);                                                                                                            // 921
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/HTML5-History-API/settings.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Make sure that polyfilled links are redirected to correct links in                                                  // 1
// supporting browsers. Enables sharing links between IE and non-IE                                                    // 2
// e.g. http://example.com/#/some-path -> http://example.com/some-path                                                 // 3
history.redirect();                                                                                                    // 4
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['HTML5-History-API'] = {};

})();

//# sourceMappingURL=1bf40f7666aa086f8ddf6458e8b53d9668845186.map
