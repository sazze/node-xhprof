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
var mysql = require('mysql2');
var _ = require('lodash');
var unserialize = require('../lib/unserialize');

function MySQLAdapter() {
  this.defaults = {
    host: '127.0.0.1',
    user: 'xhprof',
    password: 'password',
    database: 'xhprof',
    runTable: 'run',
    runTableId: 'run_id',
    perfDataColumn: 'perfdata',
    descriptionColumn: 'url'
  };
}

module.exports = new MySQLAdapter();

MySQLAdapter.prototype.getRun = function (runId, cb) {
  var opts = _.merge(this.defaults, options.adapter.options);
  var query = 'SELECT * FROM ' + opts.runTable + ' WHERE ' + opts.runTableId + ' = ? LIMIT 1';
  var params = [];
  var callback = (_.isFunction(cb) ? cb : function () {});

  params.push(runId);

  var connection = mysql.createConnection(opts);

  connection.execute(query, params, function(err, rows) {
    connection.end();

    if (err) {
      // query error
      callback(err);
      return;
    }

    if (rows.length != 1) {
      // nothing returned
      callback(new Error('Run ' + runId + ' not found'));
      return;
    }

    var data = rows[0];
    var content = data[opts.perfDataColumn];
    var description = 'XHProf Run: ' + (!_.isUndefined(data[opts.descriptionColumn]) ? data[opts.descriptionColumn] : runId);

    delete data[opts.perfDataColumn];

    unserialize.unserialize(content, function (err, rawData) {
      if (err) {
        // unserialize failed
        callback(err);
        return;
      }

      // return the run info
      callback(null, {content: rawData, row: data, description: description, runId: data[opts.runTableId]});
    });
  });
};