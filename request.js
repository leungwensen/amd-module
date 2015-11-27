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