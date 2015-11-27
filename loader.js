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