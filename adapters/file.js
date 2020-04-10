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
var unserialize = require('../lib/unserialize');
var fs = require('fs');

function FileAdapter() {
  this.defaults = {
    rootDir: '/tmp',
    type: 'xhprof'
  };
}

module.exports = new FileAdapter();

FileAdapter.prototype.getRun = function (runId, cb) {
  var opts = _.merge(this.defaults, options.adapter.options);
  var file = opts.rootDir.trim().replace(/\/+$/, '') + '/' + runId + '.' + opts.type.trim().replace(/^\.+/, '');
  var callback = (_.isFunction(cb) ? cb : function () {});

  fs.exists(file, function (exists) {
    if (!exists) {
      callback(new Error(file + ' does not exist'));
      return;
    }

    fs.readFile(file, function (err, data) {
      if (err) {
        callback(err);
        return;
      }

      var description = 'XHProf Run: ' + runId;

      unserialize.unserialize(data, function (err, rawData) {
        if (err) {
          // unserialize failed
          callback(err);
          return;
        }

        // return the run info
        callback(null, {content: rawData, row: null, description: description, runId: runId});
      });
    });
  });
};
