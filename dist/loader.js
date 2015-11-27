(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* jshint undef: true, unused: true, node: true */
// /* global require */

/*
 * @author: wensen.lws
 * @description: the AMD define function
 * @TODO: throws error when id re-defined
 */

var global = require('zero-lang/global');
var arrayUtils = require('zero-lang/array');
var objectUtils = require('zero-lang/object');
var typeCheck = require('zero-lang/type');
var event = require('zero-events/event');

function Module(meta) {
  /*
   * @description: Module constructor
   */
  var mod = this;
  return mod.initialise(meta);
}

var data = Module._data = {};
var moduleByUri = data.moduleByUri = {};
var exportsByUri = data.exportsByUri = {};
var executedByUri = data.executedByUri = {};
var queueByUri = data.queueByUri = {}; // queue to be executed

var undef = undefined;

event(Module); // add evented functions: on(), off(), emit(), trigger()

Module.prototype = {
  initialise: function initialise(meta) {
    var mod = this;
    var id = undefined;
    var uri = undefined;
    var relativeUri = undefined;

    objectUtils.extend(mod, meta);
    Module.emit('module-initialised', mod);
    if (uri = mod.uri) {
      if (!moduleByUri[uri]) {
        moduleByUri[uri] = mod;
      }
    }
    if (id = mod.id) {
      if (!moduleByUri[id]) {
        moduleByUri[id] = mod;
      }
    }
    if (relativeUri = mod.relativeUri) {
      if (!moduleByUri[relativeUri]) {
        moduleByUri[relativeUri] = mod;
      }
      if (!queueByUri[relativeUri]) {
        queueByUri[relativeUri] = mod;
      }
    }
    return mod;
  },
  processDeps: function processDeps() {
    var mod = this;
    Module.emit('module-deps-processed', mod);
    return mod;
  },
  execute: function execute() {
    var mod = this;
    var depModExports = [];
    if ('exports' in mod) {
      delete queueByUri[mod.relativeUri];
      return mod;
    }

    if (arrayUtils.every(mod.deps, function (uri) {
      return !!executedByUri[uri];
    })) {
      var modFactory = mod.factory;
      var modUri = mod.uri;
      var modId = mod.id;
      var modRelativeUri = mod.relativeUri;

      arrayUtils.each(mod.deps, function (uri) {
        depModExports.push(exportsByUri[uri]);
      });
      mod.exports = exportsByUri[modUri] = exportsByUri[modId] = exportsByUri[modRelativeUri] = typeCheck.isFunction(modFactory) ? modFactory.apply(undef, depModExports) : modFactory;
      executedByUri[modUri] = executedByUri[modId] = executedByUri[modRelativeUri] = true;
      Module.emit('module-executed', mod);
    }
    return mod;
  }
};

Module.on('module-executed', function () {
  /*
   * @description: try to execute all modules in queue
   * @note: hacking so hard
   * @TODO: to be optimized
   */
  objectUtils.forIn(queueByUri, function (mod2BeExecuted /*, uri */) {
    if (mod2BeExecuted instanceof Module) {
      mod2BeExecuted.execute();
    }
  });
});

module.exports = Module;
},{"zero-events/event":4,"zero-lang/array":5,"zero-lang/global":6,"zero-lang/object":8,"zero-lang/type":9}],2:[function(require,module,exports){
(function (global){
'use strict';

/* jshint undef: true, unused: true, node: true */
// /* global require */

/*
 * @author: wensen.lws
 * @description: the AMD define function
 * @TODO: throws error when id re-defined
 */

if (global.define) {
  // avoiding conflict
  throw '"define" function exists';
}

var arrayUtils = require('zero-lang/array');
var typeCheck = require('zero-lang/type');
var Module = require('./Module');

var undef = undefined;

function define() /* id, deps, factory */{
  var args = arrayUtils.toArray(arguments);
  var id = typeCheck.isString(args[0]) ? args.shift() : undef;
  var deps = args.length > 1 ? args.shift() : [];
  var factory = args[0];
  var meta = {
    id: id,
    uri: id,
    deps: deps,
    factory: factory
  };
  Module.emit('module-meta-got', meta);
  var mod = new Module(meta).processDeps().execute();
  Module.emit('module-defined', mod);
}

define.amd = {}; // minimum AMD implement

define('amd-module/Module', function () {
  // module Module
  return Module;
});
define('amd-module/define', function () {
  // module define
  return define;
});

module.exports = global.define = Module.define = define;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Module":1,"zero-lang/array":5,"zero-lang/type":9}],3:[function(require,module,exports){
'use strict';

/* jshint undef: true, unused: true, node: true */
/* global document, window */

/*
 * @author: wensen.lws
 * @description: the AMD module loader
 * @note: browser only
 */

var typeCheck = require('zero-lang/type');
var arrayUtils = require('zero-lang/array');
var Module = require('./Module');
var define = require('./define');
var path = require('./path');
var request = require('./request');

var doc = document;
var id2Uri = path.id2Uri;

var interactiveScript = undefined;
var data = Module._data;
var moduleByUri = data.moduleByUri;
var executedByUri = data.executedByUri;
var loadingByUri = data.loadingByUri = {};

Module.resolve = id2Uri;
Module.request = request;

function getCurrentScript() {
  if (Module.currentlyAddingScript) {
    return Module.currentlyAddingScript.src;
  }
  if (doc.currentScript) {
    // firefox 4+
    return doc.currentScript.src;
  }
  // reference: https://github.com/samyk/jiagra/blob/master/jiagra.js
  var stack = undefined;
  try {
    throw new Error();
  } catch (e) {
    // safari: only `line`, `sourceId` and `sourceURL`
    stack = e.stack;
    if (!stack && window.opera) {
      // opera 9 does not have `e.stack`, but `e.Backtrace`
      stack = (String(e).match(/of linked script \S+/g) || []).join(' ');
    }
  }
  if (stack) {
    /*
     * e.stack:
     * chrome23: at http://113.93.50.63/data.js:4:1
     * firefox17: @http://113.93.50.63/query.js:4
     * opera12: @http://113.93.50.63/data.js:4
     * IE10: at Global code (http://113.93.50.63/data.js:4:1)
     */
    stack = stack.split(/[@ ]/g).pop(); // at last line, after the last space or @
    stack = stack[0] === '(' ? stack.slice(1, -1) : stack;
    return stack.replace(/(:\d+)?:\d+$/i, '');
  }
  if (interactiveScript && interactiveScript.readyState === "interactive") {
    return interactiveScript.src;
  }
  var nodes = doc.getElementsByTagName('script');
  for (var i = 0, node; node = nodes[i++];) {
    if (node.readyState === 'interactive') {
      interactiveScript = node;
      return node.src;
    }
  }
}

var relativeIdCounter = 0;
var uuid = 0;

Module.on('module-meta-got', function (meta) {
  var src = getCurrentScript();
  if (src) {
    meta.uri = src;
  } else {
    meta.uri = data.cwd;
  }
  if (src === '' || typeCheck.isString(src) && src === data.cwd) {
    if (meta.id) {// named module in script tag
      // meta.id = './' + meta.id; // @FIXME
    } else {
        // script tag
        meta.uri = data.cwd + ('#' + uuid++);
      }
  }
}).on('module-initialised', function (mod) {
  if (!(typeCheck.isString(mod.uri) && mod.uri.indexOf('/') > -1)) {
    mod.uri = id2Uri(mod.id);
  }
  var uri = mod.uri;
  var id = mod.id || relativeIdCounter++;
  mod.relativeUri = uri.indexOf(id + '.') > -1 ? uri : id2Uri('./' + id, uri);
}).on('module-deps-processed', function (mod) {
  arrayUtils.each(mod.deps, function (id, index) {
    var uri = undefined;
    if (moduleByUri[id]) {
      uri = id;
    } else {
      uri = id2Uri(id, mod.relativeUri || mod.uri);
    }
    mod.deps[index] = uri;
    if (!moduleByUri[uri] && !loadingByUri[uri] && !executedByUri[uri]) {
      request(uri);
      loadingByUri[uri] = true;
    }
  });
});
},{"./Module":1,"./define":2,"./path":10,"./request":11,"zero-lang/array":5,"zero-lang/type":9}],4:[function(require,module,exports){

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */

// TODO NEED to strengthen

'use strict';

var arrayUtils = require('zero-lang/array');

var event = function event(target) {
    // if target not defined, it is a global event
    target = target || this;

    // all events stores in the the collection: *._events
    var events = target._events = {};

    target.on = function (name, callback, context) {
        /*
         * @description: 绑定事件
         */
        var list = events[name] || (events[name] = []);
        list.push({
            callback: callback,
            context: context
        });
        return target;
    };
    target.off = function (name, callback) {
        /*
         * @description: 解绑事件
         */
        if (!name) {
            events = {};
            return target;
        }
        var list = events[name] || [];
        var i = list.length;
        if (!callback) {
            list = [];
        } else {
            while (i > 0) {
                i--;
                if (list[i].callback === callback) {
                    list.splice(i, 1);
                }
            }
        }
        events[name] = list;
        return target;
    };
    target.emit = function () {
        /*
         * @description: 触发事件
         */
        var args = arrayUtils.toArray(arguments);
        var list = events[args.shift()] || [];
        arrayUtils.each(list, function (evt) {
            if (!evt.callback) {
                throw 'event callback is not defined';
            }
            evt.callback.apply(evt.context, args);
        });
        return target;
    };
    target.trigger = target.emit; // alias
    return target;
};

module.exports = event;
},{"zero-lang/array":5}],5:[function(require,module,exports){
/* jshint esnext: true, loopfunc: true */

'use strict';

var checkType = require('./type');
var numberUtils = require('./number');

var isArray = checkType.isArray;
var AP = Array.prototype;
var slice = AP.slice;

function isArrayLike(arr) {
    return typeof arr === 'object' && numberUtils.isFinite(arr.length);
}
function toArray(arr) {
    return isArrayLike(arr) ? slice.call(arr) : [];
}

function arrayFromSecondElement(arr) {
    return slice.call(arr, 1);
}
function applyNativeFunction(nativeFunction, target, args) {
    return nativeFunction.apply(target, arrayFromSecondElement(args));
}

// index
var index = function index(up) {
    return function (arr, searchElement, fromIndex) {
        var i = undefined;
        var len = arr.length >>> 0;
        if (len === 0) {
            return -1;
        }
        if (!fromIndex) {
            fromIndex = up ? 0 : arr.length;
        } else if (fromIndex < 0) {
            fromIndex = Math.max(0, arr.length + fromIndex);
        }
        if (up) {
            for (i = fromIndex; i < arr.length; i++) {
                if (arr[i] === searchElement) {
                    return i;
                }
            }
        } else {
            for (i = fromIndex; i >= 0; i--) {
                if (arr[i] === searchElement) {
                    return i;
                }
            }
        }
        return -1;
    };
};
var indexOf = AP.indexOf ? function (arr) {
    return applyNativeFunction(AP.indexOf, arr, arguments);
} : index(true);
var lastIndexOf = AP.lastIndexOf ? function (arr) {
    return applyNativeFunction(AP.lastIndexOf, arr, arguments);
} : index();

// each
var each = AP.forEach ? function (arr, callback, thisObj) {
    applyNativeFunction(AP.forEach, arr, arguments);
} : function (arr, callback, thisObj) {
    var a = toArray(arr);
    for (var i = 0; i < a.length; i++) {
        callback.call(thisObj, a[i], i, arr);
    }
};

// every
var every = AP.every ? function (arr) {
    return applyNativeFunction(AP.every, arr, arguments);
} : function (arr, callback, thisObj) {
    a = toArray(arr);
    for (var i = 0; i < a.length; i++) {
        if (!callback.call(thisObj, a[i], i, arr)) {
            return false;
        }
    }
    return true;
};

// filter
var filter = AP.filter ? function (arr) {
    return applyNativeFunction(AP.filter, arr, arguments);
} : function (arr, callback, thisObj) {
    var res = [];
    each(arr, function (element, key) {
        if (callback.call(thisObj, element, key, arr)) {
            res.push(element);
        }
    });
    return res;
};

// map
var map = AP.map ? function (arr) {
    return applyNativeFunction(AP.map, arr, arguments);
} : function (arr, callback, thisObj) {
    var res = [];
    each(arr, function (element, key) {
        res.push(callback.call(thisObj, element, key, arr));
    });
    return res;
};

// some
var some = AP.some ? function (arr) {
    return applyNativeFunction(AP.some, arr, arguments);
} : function (arr, callback, thisObj) {
    var i = undefined;
    for (i = 0; i < arr.length; i++) {
        if (callback.call(thisObj, arr[i], i, arr)) {
            return true;
        }
    }
    return false;
};

// reduce
var reduce = AP.reduce ? function (arr) {
    return applyNativeFunction(AP.reduce, arr, arguments);
} : function (arr, callback, thisObj) {
    var value = undefined;
    if (thisObj) {
        value = thisObj;
    }
    for (var i = 0; i < arr.length; i++) {
        if (value) {
            value = callback(value, arr[i], i, arr);
        } else {
            value = arr[i];
        }
    }
    return value;
};

// reduceRight
var reduceRight = AP.reduceRight ? function (arr) {
    return applyNativeFunction(AP.reduceRight, arr, arguments);
} : function (arr, callback, thisObj) {
    var value = undefined;
    if (thisObj) {
        value = thisObj;
    }
    for (var i = arr.length - 1; i >= 0; i--) {
        if (value) {
            value = callback(value, arr[i], i, arr);
        } else {
            value = arr[i];
        }
    }
    return value;
};

// contains
function contains(arr, value) {
    return indexOf(toArray(arr), value) > -1;
}

// uniq
function uniq(arr) {
    var resultArr = [];
    each(arr, function (element) {
        if (!contains(resultArr, element)) {
            resultArr.push(element);
        }
    });
    return resultArr;
}

// flatten
function flatten(arr) {
    var a = toArray(arr);
    var r = [];
    for (var i = 0, l = a.length; i < l; ++i) {
        if (isArrayLike(a[i])) {
            r = r.concat(a[i]);
        } else {
            r[r.length] = a[i];
        }
    }
    return r;
}

var arrayUtils = {
    contains: contains,
    each: each,
    every: every,
    filter: filter,
    flatten: flatten,
    forEach: each,
    index: index,
    indexOf: indexOf,
    isArray: isArray,
    isArrayLike: isArrayLike,
    lastIndexOf: lastIndexOf,
    map: map,
    reduce: reduce,
    reduceRight: reduceRight,
    some: some,
    toArray: toArray,
    uniq: uniq,
    difference: function difference(arr) {
        var rest = flatten(arrayFromSecondElement(arguments));
        return filter(arr, function (value) {
            return !contains(rest, value);
        });
    },
    eachReverse: function eachReverse(arr, callback, thisObj) {
        var a = toArray(arr);
        var i = a.length - 1;
        for (; i > -1; i -= 1) {
            callback.call(thisObj, a[i], i, arr);
        }
    },
    intersect: function intersect(a, b) {
        var result = [];
        each(a, function (value) {
            if (contains(b, value)) {
                result.push(value);
            }
        });
        return result;
    },
    range: function range() {
        var start = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
        var stop = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
        var step = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = new Array(length);
        for (var i = 0; i < length; i++, start += step) {
            range[i] = start;
        }
        return range;
    },
    remove: function remove(arr, fromIndex, toIndex) {
        var rest = undefined;
        var len = arr.length;
        if (!numberUtils.isNumber(fromIndex)) {
            return arr;
        }
        rest = arr.slice((toIndex || fromIndex) + 1 || len);
        arr.length = fromIndex < 0 ? len + fromIndex : fromIndex;
        return arr.push.apply(arr, rest);
    },
    union: function union() {
        var resultArr = [];
        var sourceArrs = toArray(arguments);
        each(sourceArrs, function (arr) {
            resultArr = resultArr.concat(arr);
        });
        return uniq(resultArr);
    }
};

module.exports = arrayUtils;
},{"./number":7,"./type":9}],6:[function(require,module,exports){
(function (global){
/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
/* global window, global, self */

'use strict';

var undefStr = 'undefined';

module.exports = typeof window !== undefStr ? window : typeof global !== undefStr ? global : typeof self !== undefStr ? self : {};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
/* jshint esnext: true, loopfunc: true */

'use strict';

var checkType = require('./type');

var isNumber = checkType.isNumber;
var nativeMin = Math.min;
var nativeMax = Math.max;

var numberUtils = {
    isDecimal: function isDecimal(num) {
        return isNumber(num) && num % 1 !== 0;
    },
    isEven: function isEven(num) {
        return isNumber(num) && num % 2 === 0;
    },
    isFinite: isFinite,
    isInteger: Number.isInteger ? Number.isInteger : function (num) {
        return isNumber(num) && num % 1 === 0;
    },
    isNaN: isNaN,
    isNegative: function isNegative(num) {
        return isNumber(num) && num < 0;
    },
    isNumber: isNumber,
    isOdd: function isOdd(num) {
        return isNumber(num) && num % 2 !== 0;
    },
    isPositive: function isPositive(num) {
        return isNumber(num) && num > 0;
    },
    toFloat: function toFloat(str) {
        return parseFloat(str);
    },
    toInteger: function toInteger(str, radix) {
        return parseInt(str, radix || 10);
    },
    isInRange: function isInRange(value, start, end) {
        start = +start || 0;
        if (end === undefined) {
            end = start;
            start = 0;
        } else {
            end = +end || 0;
        }
        return value >= nativeMin(start, end) && value < nativeMax(start, end);
    }
};

numberUtils.isInFinite = function (num) {
    return !numberUtils.isFinite(num);
};

module.exports = numberUtils;
},{"./type":9}],8:[function(require,module,exports){
/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */

'use strict';

var checkType = require('./type');
var getType = checkType.getType;
var isFunction = checkType.isFunction;
var isObject = checkType.isObject;
var isPlainObject = checkType.isPlainObject;

var arrayUtils = require('./array');
var contains = arrayUtils.contains;
var each = arrayUtils.each;
var isArrayLike = arrayUtils.isArrayLike;
var toArray = arrayUtils.toArray;

function toPlainObject(obj) {
    return isPlainObject(obj) ? obj : {};
}
function forIn(obj, callback, thisObj) {
    var plainObj = toPlainObject(obj);
    for (var key in plainObj) {
        callback.call(thisObj, plainObj[key], key, obj);
    }
}

var keys = Object.keys ? function (obj) {
    return Object.keys(obj);
} : function (obj) {
    var result = [];
    forIn(obj, function (value, key) {
        if (!(isFunction(obj) && key === 'prototype')) {
            result.push(key);
        }
    });
    return result;
};

function values(obj) {
    var result = [];
    forIn(obj, function (value) {
        return result.push(value);
    });
    return result;
}

function extend(dest) {
    dest = dest || {};
    each(toArray(arguments).slice(1), function (source) {
        if (source) {
            for (var prop in source) {
                dest[prop] = source[prop];
            }
        }
    });
    return dest;
}

function merge(dest) {
    dest = dest || {};
    each(toArray(arguments).slice(1), function (source) {
        for (var prop in source) {
            if (getType(source[prop]) !== getType(dest[prop])) {
                if (isPlainObject(source[prop])) {
                    dest[prop] = {};
                    merge(dest[prop], source[prop]);
                } else {
                    dest[prop] = source[prop];
                }
            } else {
                if (isPlainObject(source[prop])) {
                    merge(dest[prop], source[prop]);
                } else {
                    dest[prop] = source[prop];
                }
            }
        }
    });
    return dest;
}

var objectUtils = {
    assign: extend,
    forIn: forIn,
    extend: extend,
    hasKey: function hasKey(obj, key) {
        return obj.hasOwnProperty(key);
    },
    hasValue: function hasValue(obj, value) {
        return contains(values(obj), value);
    },
    isObject: isObject,
    isPlainObject: isPlainObject,
    keys: keys,
    merge: merge,
    values: values,
    invert: function invert(obj) {
        var result = {};
        forIn(obj, function (value, key) {
            result[value] = key;
        });
        return result;
    },
    clone: function clone(obj) {
        if (isArrayLike(obj)) {
            return toArray(obj);
        }
        if (isPlainObject(obj)) {
            return merge({}, obj);
        }
        return obj;
    },
    destroy: function destroy(obj) {
        for (var p in obj) {
            delete obj[p];
        }
        obj.prototype = null;
        obj = null;
    }
};

module.exports = objectUtils;
},{"./array":5,"./type":9}],9:[function(require,module,exports){
/* jshint esnext: true, loopfunc: true */

'use strict';

var toString = ({}).toString;
var isType = function isType(obj, type) {
    return toString.call(obj) === '[object ' + type + ']';
};

var checkType = {
    isArguments: function isArguments(obj) {
        return isType(obj, 'Arguments');
    },
    isArray: Array.isArray ? Array.isArray : function (obj) {
        return isType(obj, 'Array');
    },
    isArrayLike: function isArrayLike(obj) {
        return typeof obj === 'object' && isFinite(obj.length);
    },
    isBoolean: function isBoolean(obj) {
        return isType(obj, 'Boolean');
    },
    isDate: function isDate(obj) {
        return isType(obj, 'Date');
    },
    isError: function isError(obj) {
        return isType(obj, 'Error');
    },
    isFunction: function isFunction(obj) {
        return isType(obj, 'Function');
    },
    isNull: function isNull(obj) {
        return obj === null;
    },
    isNumber: function isNumber(obj) {
        return isType(obj, 'Number');
    },
    isPlainObject: function isPlainObject(obj) {
        return isType(obj, 'Object');
    },
    isRegExp: function isRegExp(obj) {
        return isType(obj, 'RegExp');
    },
    isString: function isString(obj) {
        return isType(obj, 'String');
    },
    isType: isType,
    isUndefined: function isUndefined(obj) {
        return obj === undefined;
    },
    getType: function getType(obj) {
        var typeStr = toString.call(obj);
        return typeStr.replace(/^\[object /, '').replace(/\]$/, '');
    },
    isObject: function isObject(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    }
};

module.exports = checkType;
},{}],10:[function(require,module,exports){
'use strict';

/* jshint undef: true, unused: true, node: true */
/* global document, location */

/*
 * @author      : wensen.lws
 * @description : path utils
 * @reference   : https://github.com/seajs/seajs/blob/master/src/util-path.js
 * @note        : browser only
 */

var typeCheck = require('zero-lang/type');
var Module = require('./Module');
var define = require('./define');

var re_absolute = /^\/\/.|:\//;
var re_dirname = /[^?#]*\//;
var re_dot = /\/\.\//g;
var re_doubleDot = /\/[^/]+\/\.\.\//;
var re_ignoreLocation = /^(about|blob):/;
var re_multiSlash = /([^:/])\/+\//g;
var re_path = /^([^/:]+)(\/.+)$/;
var re_rootDir = /^.*?\/\/.*?\//;
var doc = document;
var lc = location;
var href = lc.href;
var scripts = doc.scripts;
var loaderScript = doc.getElementById('moduleLoader') || scripts[scripts.length - 1];
var loaderPath = loaderScript.hasAttribute ? /* non-IE6/7 */loaderScript.src : loaderScript.getAttribute('src', 4);

var data = Module._data;

function dirname(path) {
  // dirname('a/b/c.js?t=123#xx/zz') ==> 'a/b/'
  return path.match(re_dirname)[0];
}
function realpath(path) {
  path = path.replace(re_dot, '/'); // /a/b/./c/./d ==> /a/b/c/d
  // a//b/c ==> a/b/c
  // a///b/////c ==> a/b/c
  // DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
  path = path.replace(re_multiSlash, '$1/');
  while (path.match(re_doubleDot)) {
    // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
    path = path.replace(re_doubleDot, '/');
  }
  return path;
}
function normalize(path) {
  // normalize('path/to/a') ==> 'path/to/a.js'
  var last = path.length - 1,
      lastC = path.charCodeAt(last);
  if (lastC === 35 /* '#' */) {
      // If the uri ends with `#`, just return it without '#'
      return path.substring(0, last);
    }
  return path.substring(last - 2) === '.js' || path.indexOf('?') > 0 || lastC === 47 /* '/' */ ? path : path + '.js';
}
function parseAlias(id) {
  var alias = data.alias;
  return alias && zero.isString(alias[id]) ? alias[id] : id;
}
function parsePaths(id) {
  var m = undefined;
  var paths = data.paths;
  if (paths && (m = id.match(re_path)) && zero.isString(paths[m[1]])) {
    id = paths[m[1]] + m[2];
  }
  return id;
}
function addBase(id, refUri) {
  var ret = undefined;
  var first = id.charCodeAt(0);

  if (re_absolute.test(id)) {
    // Absolute
    ret = id;
  } else if (first === 46 /* '.' */) {
      // Relative
      ret = (refUri ? dirname(refUri) : data.cwd) + id;
    } else if (first === 47 /* '/' */) {
      // Root
      var m = data.cwd.match(re_rootDir);
      ret = m ? m[0] + id.substring(1) : id;
    } else {
    // Top-level
    ret = data.base + id;
  }
  if (ret.indexOf('//') === 0) {
    // Add default protocol when uri begins with '//'
    ret = lc.protocol + ret;
  }
  return realpath(ret);
}
function id2Uri(id, refUri) {
  if (!id) {
    return '';
  }
  id = parseAlias(id);
  id = parsePaths(id);
  id = parseAlias(id);
  id = normalize(id);
  id = parseAlias(id);

  var uri = addBase(id, refUri);
  uri = parseAlias(uri);
  return uri;
}

data.cwd = !href || re_ignoreLocation.test(href) ? '' : dirname(href);
data.path = loaderPath;
data.dir = data.base = dirname(loaderPath || data.cwd);

var pathUtils = {
  id2Uri: id2Uri
};

define('amd-module/path', pathUtils);

module.exports = pathUtils;
},{"./Module":1,"./define":2,"zero-lang/type":9}],11:[function(require,module,exports){
'use strict';

/* jshint undef: true, unused: true, node: true */
/* global document */

/*
 * @author: wensen.lws
 * @description: request for scripts, etc
 * @note: browser only
 * @reference: https://github.com/seajs/seajs/blob/master/src/util-request.js
 */

var typeCheck = require('zero-lang/type');
var Module = require('./Module');
var define = require('./define');

var doc = document;
var head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
var baseElement = head.getElementsByTagName('base')[0];

function addOnload(node, callback, url) {
  var supportOnload = 'onload' in node;

  function onload(error) {
    // Ensure only run once and handle memory leak in IE {
    node.onload = node.onerror = node.onreadystatechange = null;
    // }
    // Dereference the node {
    node = null;
    // }
    if (typeCheck.isFunction(callback)) {
      callback(error);
    }
  }

  if (supportOnload) {
    node.onload = onload;
    node.onerror = function () {
      Module.emit('error', { uri: url, node: node });
      onload(true);
    };
  } else {
    node.onreadystatechange = function () {
      if (/loaded|complete/.test(node.readyState)) {
        onload();
      }
    };
  }
}

function request(url, callback, charset, crossorigin) {
  var node = doc.createElement('script');

  if (charset) {
    var cs = typeCheck.isFunction(charset) ? charset(url) : charset;
    if (cs) {
      node.charset = cs;
    }
  }
  // crossorigin default value is `false`. {
  var cors = typeCheck.isFunction(crossorigin) ? crossorigin(url) : crossorigin;
  if (cors !== false) {
    node.crossorigin = cors;
  }
  // }
  addOnload(node, callback, url);

  node.async = true;
  node.src = url;

  /*
   * For some cache cases in IE 6-8, the script executes IMMEDIATELY after
   * the end of the insert execution, so use `currentlyAddingScript` to
   * hold current node, for deriving url in `define` call
   */
  Module.currentlyAddingScript = node;

  if (baseElement) {
    head.insertBefore(node, baseElement); // ref: #185 & http://dev.jquery.com/ticket/2709
  } else {
      head.appendChild(node);
    }
  Module.currentlyAddingScript = null;
}

define('amd-module/request', function () {
  return request;
});

module.exports = request;
},{"./Module":1,"./define":2,"zero-lang/type":9}]},{},[3]);
