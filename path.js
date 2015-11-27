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