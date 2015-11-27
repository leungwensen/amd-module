/* jshint undef: true, unused: true, node: true */
// /* global require */

/*
 * @author: wensen.lws
 * @description: the AMD define function
 * @TODO: throws error when id re-defined
 */

const global = require('zero-lang/global');
const arrayUtils = require('zero-lang/array');
const objectUtils = require('zero-lang/object');
const typeCheck = require('zero-lang/type');
const event = require('zero-events/event');

function Module(meta) {
  /*
   * @description: Module constructor
   */
  let mod = this;
  return mod.initialise(meta);
}

let data = Module._data = {};
let moduleByUri = data.moduleByUri = {};
let exportsByUri = data.exportsByUri = {};
let executedByUri = data.executedByUri = {};
let queueByUri = data.queueByUri = {}; // queue to be executed

let undef;

event(Module); // add evented functions: on(), off(), emit(), trigger()

Module.prototype = {
  initialise(meta) {
    let mod = this;
    let id;
    let uri;
    let relativeUri;

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
  processDeps() {
    let mod = this;
    Module.emit('module-deps-processed', mod);
    return mod;
  },
  execute() {
    let mod = this;
    let depModExports = [];
    if ('exports' in mod) {
      delete queueByUri[mod.relativeUri];
      return mod;
    }

    if (arrayUtils.every(mod.deps, function (uri) {
      return !!executedByUri[uri];
    })) {
      let modFactory = mod.factory;
      let modUri = mod.uri;
      let modId = mod.id;
      let modRelativeUri = mod.relativeUri;

      arrayUtils.each(mod.deps, function (uri) {
        depModExports.push(exportsByUri[uri]);
      });
      mod.exports =
        exportsByUri[modUri] =
        exportsByUri[modId] =
        exportsByUri[modRelativeUri] = typeCheck.isFunction(modFactory) ?
        modFactory.apply(undef, depModExports) : modFactory;
      executedByUri[modUri] =
        executedByUri[modId] =
        executedByUri[modRelativeUri] = true;
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
  objectUtils.forIn(queueByUri, function (mod2BeExecuted/*, uri */) {
    if (mod2BeExecuted instanceof Module) {
      mod2BeExecuted.execute();
    }
  });
});

module.exports = Module;

