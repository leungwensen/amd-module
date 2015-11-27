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