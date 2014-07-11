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

var opts = require('./config/options');
var _ = require('lodash');

module.exports = function (options) {

  opts = _.merge(opts, options);

  return {
    report: (opts.report ? new (require('./reports/' + opts.report))() : null),
    xhprof: require('./lib/xhprof'),
    callgraph: require('./lib/callgraph')
  }
};