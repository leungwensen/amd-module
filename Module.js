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