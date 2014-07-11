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
var mongo = require('mongodb').MongoClient;

function MongodbAdapter() {
  this.defaults = {
    uri: 'mongodb://localhost:27017/exampleDb',
    collection: 'xhprof',
    documentId: '_id',
    perfDataAttribute: 'perfdata',
    descriptionAttribute: 'url',
    options: {   // options to pass to MongoClient.connect
      server: {
        auto_reconnect: true,
        poolSize: 1
      }
    }
  };
}

module.exports = new MongodbAdapter();

MongodbAdapter.prototype.getRun = function (runId, cb) {
  var opts = _.merge(this.defaults, options.adapter.options);
  var callback = (_.isFunction(cb) ? cb : function () {});

  mongo.connect(opts.uri, opts.options, function (err, db) {
    if (err) {
      callback(err);
      return;
    }

    var query = {};

    query[opts.documentId] = runId;

    try {
      db.collection(opts.collection).findOne(query, function (err, item) {
        if (err) {
          callback(err);
          return;
        }

        var content = item[opts.perfDataAttribute];
        var description = 'XHProf Run: ' + (!_.isUndefined(item[opts.descriptionAttribute]) ? item[opts.descriptionAttribute] : runId);

        delete item[opts.perfDataAttribute];

        unserialize.unserialize(content, function (err, rawData) {
          if (err) {
            // unserialize failed
            callback(err);
            return;
          }

          // return the run info
          callback(null, {content: rawData, row: item, description: description, runId: item[opts.documentId]});
        });
      });
    } catch (e) {
      callback(e);
    }
  });
};