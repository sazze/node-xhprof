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
 *
 *
 * This is a derivative work of the xhprof_lib/utils/callgraph_utils.php file from https://github.com/facebook/xhprof.
 *
 * The original copyright and license from xhprof_lib/utils/callgraph_utils.php is below:
 *
 *   Copyright (c) 2009 Facebook
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
var _ = require('lodash');
var xhprofLib = require('./xhprof');
var sprintf = require('sprintf').sprintf;
var async = require('async');
var MemStream = require('memorystream');

function Callgraph() {

}

module.exports = new Callgraph();

var legalImageTypes = {
  jpg: 1,
  gif: 1,
  png: 1,
  ps: 1,
  svg: 1
};

var imageMimes = {
  jpg: 'image/jpeg',
  gif: 'image/gif',
  png: 'image/png',
  ps: 'image/postscript',
  svg: 'image/svg+xml'
};

function addslashes(str) {
  return str.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'').replace(/\"/g, '\\"').replace(/\0/g, '\\0');
}

/**
 *
 * @param runId
 * @param type
 * @param threshold
 * @param func
 * @param source
 * @param criticalPath
 * @param callback
 */
Callgraph.prototype.renderImage = function (runId, type, threshold, func, source, criticalPath, callback) {
  var self = this;

  xhprofLib.getRun(runId, function (err, run) {
    if (err) {
      if (_.isFunction(callback)) {
        callback(err);
      }

      return;
    }

    var script = self.generateDotScript(run, threshold, source, func, criticalPath);

    self.generateImageByDot(script, type, function (err, image) {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err);
        }

        return;
      }

      if (_.isFunction(callback)) {
        callback(null, image);
      }
    });
  });
};

/**
 *
 * @param runId1
 * @param runId2
 * @param type
 * @param threshold
 * @param source
 * @param callback
 */
Callgraph.prototype.renderDiffImage = function (runId1, runId2, type, threshold, source, callback) {
  var self = this;

  async.parallel([
    function (callback) {
      xhprofLib.getRun(runId1, callback);
    },
    function (callback) {
      xhprofLib.getRun(runId2, callback);
    }
  ], function (err, runs) {
    if (err) {
      if (_.isFunction(callback)) {
        callback(err);
      }

      return;
    }

    var run1 = runs[0];
    var run2 = runs[1];

    var total1 = {};
    var total2 = {};

    //var childrenTable1 = self.getChildrenTable(run1.content);
    //var childrenTable2 = self.getChildrenTable(run2.content);
    var symbolTab1 = xhprofLib.computeFlatInfo(run1, total1);
    var symbolTab2 = xhprofLib.computeFlatInfo(run2, total2);
    var delta = xhprofLib.computeDiff(run1, run2);

    var script = self.generateDotScript(delta, threshold, source, null, true, symbolTab1, symbolTab2);

    self.generateImageByDot(script, type, function (err, image) {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err);
        }

        return;
      }

      if (_.isFunction(callback)) {
        callback(null, image);
      }
    });
  });
};

Callgraph.prototype.getMimeHeader = function (type, length) {
  if (_.isUndefined(imageMimes[type])) {
    return false;
  }

  return imageMimes[type];
};

Callgraph.prototype.generateDotScript = function (run, threshold, source, func, criticalPath, right, left) {
  right = right || null;
  left = left || null;

  var rawData = run.content;
  var page = run.description;

  var maxWidth = 5;
  var maxHeight = 3.5;
  var maxFontSize = 35;
  var maxSizingRatio = 20;

  var totals = {};

  var symTable = xhprofLib.computeFlatInfo(run, totals);

  if (criticalPath) {
    var childrenTable = this.getChildrenTable(rawData);
    var node = 'main()';
    var path = {};
    var pathEdges = {};
    var visited = {};

    while (node) {
      visited[node] = true;

      if (!_.isUndefined(childrenTable[node])) {
        var maxChild = null;

        _.forEach(childrenTable[node], function (child) {
          if (!_.isUndefined(visited[child])) {
            return;
          }

          if (maxChild === null || Math.abs(rawData[xhprofLib.buildParentChildKey(node, child)]['wt']) > Math.abs(rawData[xhprofLib.buildParentChildKey(node, maxChild)]['wt'])) {
            maxChild = child;
          }
        });

        if (maxChild !== null) {
          path[maxChild] = true;
          pathEdges[xhprofLib.buildParentChildKey(node, maxChild)] = true;
        }

        node = maxChild;
      } else {
        node = null;
      }
    }
  }

  // if it is a benchmark callgraph, we make the benchmarked function the root.
  if (source == 'bm' && !_.isUndefined(symTable['main()'])) {
    var totalTimes = symTable['main()']['ct'];
    var removeFuncs = ['main()', 'hotprofiler_disable', 'call_user_func_array', 'xhprof_disable'];

    _.forEach(removeFuncs, function (curDelFunc) {
      if (!_.isUndefined(symTable[curDelFunc]) && symTable[curDelFunc]['ct'] == totalTimes) {
        delete symTable[curDelFunc];
      }
    });
  }

  // use the function to filter out irrelevant functions.
  if (func) {
    var interestedFuncs = {};

    _.forEach(rawData, function (info, parentChild) {
      xhprofLib.parseParentChild(parentChild, function (parent, child) {
        if (parent == func || child == func) {
          interestedFuncs[parent] = 1;
          interestedFuncs[child] = 1;
        }
      });
    });

    _.forEach(symTable, function (info, symbol) {
      if (_.isUndefined(interestedFuncs[symbol])) {
        delete symTable[symbol];
      }
    });
  }

  var script = "digraph call_graph {\n";

  // Filter out functions whose exclusive time ratio is below threshold, and
  // also assign a unique integer id for each function to be generated. In the
  // meantime, find the function with the most exclusive time (potentially the
  // performance bottleneck).

  var currId = 0;
  var maxWt = 0;

  _.forEach(symTable, function (info, symbol) {
    if (!func && Math.abs(info['wt'] / totals['wt']) < threshold) {
      delete symTable[symbol];
      return;
    }

    if (maxWt == 0 || maxWt < Math.abs(info['excl_wt'])) {
      maxWt = Math.abs(info['excl_wt']);
    }

    symTable[symbol]['id'] = currId;
    currId++;
  });

  // Generate all nodes' information.
  _.forEach(symTable, function (info, symbol) {
    var sizingFactor;

    if (info['excl_wt'] == 0) {
      sizingFactor = maxSizingRatio;
    } else {
      sizingFactor = maxWt / Math.abs(info['excl_wt']);
      sizingFactor = Math.min(sizingFactor, maxSizingRatio);
    }

    var fillColor = (sizingFactor < 1.5 ? ', style=filled, fillcolor=red' : '');

    if (criticalPath) {
      // highlight nodes along critical path.
      if (!fillColor && !_.isUndefined(path[symbol])) {
        fillColor = ", style=filled, fillcolor=yellow";
      }
    }

    var fontSize = ', fontsize=' + parseInt(maxFontSize / ((sizingFactor - 1) / 10 + 1));
    var width = ', width=' + sprintf('%.1f', maxWidth / sizingFactor);
    var height = ', height=' + sprintf('%.1f', maxHeight / sizingFactor);

    var shape = 'box';
    var name = addslashes(symbol) + "\\nInc: " + sprintf('%.3f', info['wt'] / 1000) + ' ms (' + sprintf('%.1f%%', 100 * info['wt'] / totals['wt']) + ')';
    var label;

    if (symbol == 'main()') {
      shape = 'octagon';
      name = 'Total: ' + (totals['wt'] / 1000.0) + " ms\\n" + addslashes(_.isUndefined(page) ? symbol : page);
    }

    if (left === null) {
      label = ', label="' + name + "\\nExcl: " + sprintf('%.3f', info['excl_wt'] / 1000.0) + ' ms (' + sprintf('%.1f%%', 100 * info['excl_wt'] / totals['wt']) + ")\\n" + info['ct'] + ' total calls"';
    } else {
      if (!_.isUndefined(left[symbol]) && !_.isUndefined(right[symbol])) {
        label = ', label="' + addslashes(symbol) + "\\nInc: " + sprintf('%.3f', left[symbol]['wt'] / 1000.0) + ' ms - ' + sprintf('%.3f', right[symbol]['wt'] / 1000.0) + ' ms = ' + sprintf('%.3f', info['wt'] / 1000.0) + " ms\\nExcl: " + sprintf('%.3f', left[symbol]['excl_wt'] / 1000.0) + ' ms - ' + sprintf('%.3f', right[symbol]['excl_wt'] / 1000.0) + ' ms = ' + sprintf('%.3f', info['excl_wt'] / 1000.0) + " ms\\nCalls: " + sprintf('%.3f', left[symbol]['ct']) + ' - ' + sprintf('%.3f', right[symbol]['ct']) + ' = ' + sprintf('%.3f', info['ct']) + '"';
      } else if (!_.isUndefined(left[symbol])) {
        label = ', label="' + addslashes(symbol) + "\\nInc: " + sprintf('%.3f', left[symbol]['wt'] / 1000.0) + ' ms - 0 ms = ' + sprintf('%.3f', info['wt'] / 1000.0) + " ms\\nExcl: " + sprintf('%.3f', left[symbol]['excl_wt'] / 1000.0) + ' ms - 0 ms = ' + sprintf('%.3f', info['excl_wt'] / 1000.0) + " ms\\nCalls: " + sprintf('%.3f', left[symbol]['ct']) + ' - 0 = ' + sprintf('%.3f', info['ct']) + '"';
      } else {
        label = ', label="' + addslashes(symbol) + "\\nInc: 0 ms - " + sprintf('%.3f', right[symbol]['wt'] / 1000.0) + ' ms = ' + sprintf('%.3f', info['wt'] / 1000.0) + " ms\\nExcl: 0 ms - " + sprintf('%.3f', right[symbol]['excl_wt'] / 1000.0) + ' ms = ' + sprintf('%.3f', info['excl_wt'] / 1000.0) + " ms\\nCalls: 0 - " + sprintf('%.3f', right[symbol]['ct']) + ' = ' + sprintf('%.3f', info['ct']) + '"';
      }
    }

    script += 'N' + symTable[symbol]['id'];
    script += '[shape=' + shape + ' ' + label + width + height + fontSize + fillColor + "];\n";
  });

  // Generate all the edges' information.
  _.forEach(rawData, function (info, parentChild) {
    xhprofLib.parseParentChild(parentChild, function (parent, child) {
      if (!_.isUndefined(symTable[parent]) && !_.isUndefined(symTable[child]) && (!func || (func && (parent == func || child == func)))) {
        var label = (info['ct'] == 1 ? info['ct'] + ' call' : info['ct'] + ' calls');
        var headLabel = (symTable[child]['wt'] > 0 ? sprintf('%.1f%%', 100 * info['wt'] / symTable[child]['wt']) : '0.0%');
        var tailLabel = (symTable[parent]['wt'] > 0 ? sprintf('%.1f%%', 100 * info['wt'] / (symTable[parent]['wt'] - symTable[parent]['excl_wt'])) : '0.0%');
        var lineWidth = 1;
        var arrowSize = 1;

        if (criticalPath && !_.isUndefined(pathEdges[xhprofLib.buildParentChildKey(parent, child)])) {
          lineWidth = 10;
          arrowSize = 2;
        }

        script += "N" + symTable[parent]['id'] + ' -> N' + symTable[child]['id'] + '[arrowsize=' + arrowSize + ', color=grey, style="setlinewidth(' + lineWidth + ')", label="' + label + '", headlabel="' + headLabel + '", taillabel="' + tailLabel + '" ];' + "\n";
      }
    });
  });

  script += "\n}";

  return script;
};

Callgraph.prototype.generateImageByDot = function (script, type, callback) {
  var inStream = new MemStream(script, {readable: true, writable: false});
  var outStream = new MemStream();

  var proc = require('child_process').spawn('dot', ['-T' + type], {env: process.env, cwd: process.cwd, stdio: 'pipe'});

  proc.stdout.pipe(outStream);

  proc.stdin.resume();

  inStream.pipe(proc.stdin);

  proc.stdin.on('close', function () {
    callback(null, outStream);
  });

  //
  // error handling
  //

  proc.stderr.on('data', function (data) {
    callback(new Error(data));
    callback = function noop() {};
  });

  inStream.on('error', function (err) {
    callback(err);
  });

  proc.stdout.on('error', function (err) {
    callback(err);
  });

  proc.stdin.on('error', function (err) {
    callback(err);
  });

  outStream.on('error', function (err) {
    callback(err);
  });
};

Callgraph.prototype.getChildrenTable = function (rawData) {
  var childrenTable = {};

  _.forEach(rawData, function (info, parentChild) {
    xhprofLib.parseParentChild(parentChild, function (parent, child) {
      if (_.isUndefined(childrenTable[parent])) {
        childrenTable[parent] = [];
      }

      childrenTable[parent].push(child);
    });
  });

  return childrenTable;
};