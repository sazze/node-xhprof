/**
 * @author Craig Thayer <cthayer@sazze.com>
 * @copyright 2014 Sazze, Inc.
 *
 * Copyright (c) 2014 Sazze, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var options = require('../config/options');
var _ = require('lodash');
var zlib = require('zlib');
var phpUnserialize = require('php-unserialize');

function Unserialize() {

}

module.exports = new Unserialize();

Unserialize.prototype.unserialize = function (data, cb) {
  this._decompress(data, function (err, data) {
    if (err) {
      //decompression failure
      cb(err);
      return;
    }

    this._unserialize(data, cb);
  }.bind(this));
};

Unserialize.prototype._decompress = function (data, cb, format, encoding) {
  format = format || options.xhprof.dataCompressionFormat;
  encoding = encoding || options.xhprof.dataCompressionEncoding;
  cb = (_.isFunction(cb) ? cb : function noop() {});

  // decompress data
  switch (format) {
    case 'gzip':
      zlib.gunzip(new Buffer(data, encoding), cb);
      break;

    case 'deflate':
      zlib.inflate(new Buffer(data, encoding), cb);
      break;

    case 'deflateRaw':
      zlib.inflateRaw(new Buffer(data, encoding), cb);
      break;

    case 'zip':
      zlib.unzip(new Buffer(data, encoding), cb);
      break;

    default:
      cb(null, content);
      break;
  }
};

Unserialize.prototype._unserialize = function (data, callback) {
  var cb = (_.isFunction(callback) ? callback : function noop() {});

  // unserialize data
  switch (options.xhprof.dataSerializationFormat) {
    case 'php':
      data = phpUnserialize.unserialize(data);
      break;

    case 'json':
      data = JSON.parse(data);
      break;

    default:
      break;
  }

  cb(null, data);
};