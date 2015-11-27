/* jshint undef: true, unused: true, node: true */
// /* global require */

/*
 * @author: wensen.lws
 * @description: the AMD define function
 * @TODO: throws error when id re-defined
 */

if (global.define) { // avoiding conflict
  throw '"define" function exists';
}

const arrayUtils = require('zero-lang/array');
const typeCheck = require('zero-lang/type');
const Module = require('./Module');

let undef;

function define(/* id, deps, factory */) {
  let args = arrayUtils.toArray(arguments);
  let id = typeCheck.isString(args[0]) ? args.shift() : undef;
  let deps = args.length > 1 ? args.shift() : [];
  let factory = args[0];
  let meta = {
    id: id,
    uri: id,
    deps: deps,
    factory: factory
  };
  Module.emit('module-meta-got', meta);
  let mod = new Module(meta)
    .processDeps()
    .execute();
  Module.emit('module-defined', mod);
}

define.amd = {}; // minimum AMD implement

define('amd-module/Module', function () { // module Module
  return Module;
});
define('amd-module/define', function() { // module define
  return define;
});

module.exports = global.define = Module.define = define;

