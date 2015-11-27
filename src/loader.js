/* jshint undef: true, unused: true, node: true */
/* global document, window */

/*
 * @author: wensen.lws
 * @description: the AMD module loader
 * @note: browser only
 */

const typeCheck = require('zero-lang/type');
const arrayUtils = require('zero-lang/array');
const Module = require('./Module');
const define = require('./define');
const path = require('./path');
const request = require('./request');

const doc = document;
const id2Uri = path.id2Uri;

let interactiveScript;
let data = Module._data;
let moduleByUri = data.moduleByUri;
let executedByUri = data.executedByUri;
let loadingByUri = data.loadingByUri = {};

Module.resolve = id2Uri;
Module.request = request;

function getCurrentScript() {
  if (Module.currentlyAddingScript) {
    return Module.currentlyAddingScript.src;
  }
  if (doc.currentScript) { // firefox 4+
    return doc.currentScript.src;
  }
  // reference: https://github.com/samyk/jiagra/blob/master/jiagra.js
  let stack;
  try {
    throw new Error();
  } catch(e) { // safari: only `line`, `sourceId` and `sourceURL`
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
    stack = stack.split( /[@ ]/g).pop(); // at last line, after the last space or @
    stack = (stack[0] === '(') ? stack.slice(1, -1) : stack;
    return stack.replace(/(:\d+)?:\d+$/i, '');
  }
  if (interactiveScript && interactiveScript.readyState === "interactive") {
    return interactiveScript.src;
  }
  let nodes = doc.getElementsByTagName('script');
  for (let i = 0, node; node = nodes[i++];) {
    if (node.readyState === 'interactive') {
      interactiveScript = node;
      return node.src;
    }
  }
}

let relativeIdCounter = 0;
let uuid = 0;

Module
  .on('module-meta-got', function (meta) {
    const src = getCurrentScript();
    if (src) {
      meta.uri = src;
    } else {
      meta.uri = data.cwd;
    }
    if (src === '' || (typeCheck.isString(src) && src === data.cwd)) {
      if (meta.id) { // named module in script tag
        // meta.id = './' + meta.id; // @FIXME
      } else { // script tag
        meta.uri = data.cwd + ('#' + uuid ++);
      }
    }
  })
  .on('module-initialised', function (mod) {
    if (!(typeCheck.isString(mod.uri) && mod.uri.indexOf('/') > -1)) {
      mod.uri = id2Uri(mod.id);
    }
    const uri = mod.uri;
    const id = mod.id || relativeIdCounter ++;
    mod.relativeUri = uri.indexOf(id+'.') > -1 ? uri : id2Uri('./' + id, uri);
  })
  .on('module-deps-processed', function (mod) {
    arrayUtils.each(mod.deps, function (id, index) {
      let uri;
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

