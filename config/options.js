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

module.exports = {
  adapter: {
    type: 'mysql',
    options: {}   // these are the options for the adapter (see adapter constructor for defaults)
  },
  xhprof: {
    dataSerializationFormat: 'json',   // can be one of: 'json' or 'php'
    dataCompressionFormat: 'gzip',    // can be one of: 'gzip', 'deflate', or 'zip'
    dataCompressionEncoding: 'base64',  // the character encoding of the compressed data
    baseUrl: 'http://localhost'   // used in report generation
  },
  report: null   // the name of the report to load (set to 'default' for the facebook default  report which is used mainly as an example and for testing)
};