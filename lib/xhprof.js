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
 * This is a derivative work of the xhprof_lib/utils/xhprof_lib.php file from https://github.com/facebook/xhprof.
 * 
 * The original copyright and license from xhprof_lib/utils/xhprof_lib.php is below:
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

var options = require('../config/options');
var async = require('async');
var _ = require('lodash');


function XHprofLib() {
  this.adapter = require('../adapters/' + options.adapter.type);
  this.displayCalls = true;
}

module.exports = lib = new XHprofLib();

var possibleMetrics = {
  wt: ['Wall', 'microseconds', 'walltime'],
  ut: ['User', 'microseconds', 'user cpu time'],
  st: ['Sys', 'microseconds', 'system cpu time'],
  cpu: ['Cpu', 'microseconds', 'cpu time'],
  mu: ['MUse', 'bytes', 'memory usage'],
  pmu: ['PMUse', 'bytes', 'peak memory usage'],
  samples: ['Samples', 'samples', 'cpu time']
};

XHprofLib.prototype.getRun = function (runId, callback) {
  this.adapter.getRun(runId, callback);
};

XHprofLib.prototype.trimRun = function (run, functionsToKeep) {
  // convert list of functions to a hash with function as the key
  var functionMap = {};

  _.forEach(functionsToKeep, function (func) {
    functionMap[func] = 1;
  });

  // always keep main() as well so that overall totals can still
  // be computed if need be.
  functionMap['main()'] = 1;

  var newRawData = {};

  _.forEach(run.content, function (info, parentChild) {
    this.parseParentChild(parentChild, function (parent, child) {
      if (!_.isUndefined(functionMap[parent]) || !_.isUndefined(functionMap[child])) {
        newRawData[parentChild] = info;
      }
    });
  }, this);

  return newRawData;
};

XHprofLib.prototype.parseParentChild = function (parentChild, cb) {
  var ret = parentChild.split('==>');

  if (ret.length == 2) {
    cb(ret[0], ret[1]);
    return;
  }

  cb(null, ret[0]);
};

XHprofLib.prototype.buildParentChildKey = function (parent, child) {
  if (parent) {
    return parent + '==>' + child;
  }

  return child;
};

XHprofLib.prototype.computeDiff = function (run1, run2) {
  var metrics = this.getMetrics(run2);
  var delta = _.cloneDeep(run2.content);

  _.forEach(run1.content, function (info, parentChild) {
    if (_.isUndefined(delta[parentChild])) {
      // this pc combination was not present in run1;
      // initialize all values to zero.
      if (this.displayCalls) {
        delta[parentChild] = {ct: 0};
      } else {
        delta[parentChild] = {};
      }

      _.forEach(metrics, function (metric) {
        delta[parentChild][metric] = 0
      });
    }

    if (this.displayCalls) {
      delta[parentChild]['ct'] -= info['ct'];
    }

    _.forEach(metrics, function (metric) {
      delta[parentChild][metric] -= info[metric];
    });
  }, this);

  return {runId: run1.runId + '/' + run2.runId, content: delta, row: [run1.row, run2.row], description: 'Delta - ' + run1.description};
};

XHprofLib.prototype.getMetrics = function (run) {
  var metrics = [];

  _.forEach(this.getPossibleMetrics(), function (desc, metric) {
    if (!_.isUndefined(run.content['main()'][metric])) {
      metrics.push(metric);
    }
  });

  return metrics;
};

XHprofLib.prototype.getPossibleMetrics = function () {
  return possibleMetrics;
};

XHprofLib.prototype.computeFlatInfo = function (run, overallTotals) {
  var metrics = this.getMetrics(run);

  // this method of assignment is necessary for overallTotals to be treated as a pass by reference
  overallTotals.ct = 0;
  overallTotals.wt = 0;
  overallTotals.ut = 0;
  overallTotals.st = 0;
  overallTotals.cpu = 0;
  overallTotals.mu = 0;
  overallTotals.pmu = 0;
  overallTotals.samples = 0;

  // compute inclusive times for each function
  var symbolTab = this.computeInclusiveTimes(run);

  /* total metric value is the metric value for "main()" */
  _.forEach(metrics, function(metric) {
    overallTotals[metric] = symbolTab['main()'][metric];
  });

  /*
   * initialize exclusive (self) metric value to inclusive metric value
   * to start with.
   * In the same pass, also add up the total number of function calls.
   */
  _.forEach(symbolTab, function (info, symbol) {
    _.forEach(metrics, function (metric) {
      symbolTab[symbol]['excl_' + metric] = symbolTab[symbol][metric];
    });
    
    if (this.displayCalls && !_.isUndefined(info['ct'])) {
      overallTotals['ct'] += info['ct'];
    }
  }, this);

  /* adjust exclusive times by deducting inclusive time of children */
  _.forEach(run.content, function (info, parentChild) {
    this.parseParentChild(parentChild, function (parent, child) {
      if (parent) {
        _.forEach(metrics, function (metric) {
          // make sure the parent exists hasn't been pruned.
          if (!_.isUndefined(symbolTab[parent])) {
            symbolTab[parent]['excl_' + metric] -= info[metric];
          }
        });
      }
    });
  }, this);

  return symbolTab;
};

/**
 * @param run
 */
XHprofLib.prototype.computeInclusiveTimes = function (run) {
  var metrics = this.getMetrics(run);
  var symbolTab = {};
  var self = this;

  try {
    _.forEach(run.content, function (info, parentChild) {
      this.parseParentChild(parentChild, function (parent, child) {
        if (parent == child) {
          throw new Error('Error in Raw Data: parent & child are both: ', parent);
        }

        if (_.isUndefined(symbolTab[child])) {
          if (self.displayCalls) {
            symbolTab[child] = {ct: info['ct']};
          } else {
            symbolTab[child] = {};
          }
          
          _.forEach(metrics, function (metric) {
            symbolTab[child][metric] = info[metric];
          });
        } else {
          if (self.displayCalls) {
            symbolTab[child]['ct'] += info['ct'];
          }

          _.forEach(metrics, function (metric) {
            symbolTab[child][metric] += info[metric];
          });
        }
      });
    }, this);
  } catch (e) {
    console.log(e.stack);
    return null;
  }
  
  return symbolTab;
};

/**
 *
 * @param  {array} runs an array of runs
 * @param {array} wts
 * @param {string} source
 * @param {bool} useScriptName
 */
XHprofLib.prototype.aggregateRuns = function (runs, wts, source, useScriptName) {
  source = source || 'phprof';
  useScriptName = useScriptName || false;

  wts = wts || [];

  var rawDataTotal = {};
  var metrics = [];

  var runCount = runs.length;
  var wtsCount = _.isUndefined(wts) || !_.isArray(wts) ? 0 : wts.length;
  var runIds = [];

  if (runCount == 0 || (wtsCount > 0 && runCount != wtsCount)) {
    return {description: 'Invalid input..', raw: null};
  }

  var badRuns = [];

  _.forEach(runs, function (run, idx) {
    // use the first run to derive what metrics to aggregate on.
    if (idx == 0) {
      _.forEach(run.content['main()'], function (val, metric) {
        if (metric != 'pmu') {
          // for now, just to keep data size small, skip "peak" memory usage
          // data while aggregating.
          // The "regular" memory usage data will still be tracked.
          if (!_.isUndefined(val)) {
            metrics.push(metric);
          }
        }
      });
    }

    runIds.push(run.runId);

    if (!this.validRun(run.runId, run.content)) {
      badRuns.push(run);
      return;
    }

    if (useScriptName) {
      var page = run.description;

      // create a fake function '__script::$page', and have and edge from
      // main() to '__script::$page'. We will also need edges to transfer
      // all edges originating from main() to now originate from
      // '__script::$page' to all function called from main().
      //
      // We also weight main() ever so slightly higher so that
      // it shows up above the new entry in reports sorted by
      // inclusive metrics or call counts.
      if (page) {
        var fakeEdge = {};
        var newMain = {};

        _.forEach(run.content['main()'], function (val, metric) {
          fakeEdge[metric] = val;
          newMain[metric] = (val * 1) + 0.00001;
        });

        run.content['main()'] = newMain;
        run.content[this.buildParentChildKey('main()', '__script::' + page)] = fakeEdge;
      } else {
        useScriptName = false;
      }
    }

    // if no weights specified, use 1 as the default weightage..
    var wt = (wtsCount == 0 ? 1 : wts[idx]);

    // aggregate $raw_data into $raw_data_total with appropriate weight ($wt)
    _.forEach(run.content, function (info, parentChild) {
      if (useScriptName) {
        // if this is an old edge originating from main(), it now
        // needs to be from '__script::$page'
        if (parentChild.substr(0, 9) == 'main()==>') {
          var child = parentChild.substr(9);

          // ignore the newly added edge from main()
          if (child.substr(0, 10) != '__script::') {
            parentChild = this.buildParentChildKey('__script::' + page, child);
          }
        }
      }

      if (_.isUndefined(rawDataTotal[parentChild])) {
        rawDataTotal[parentChild] = {};

        _.forEach(metrics, function (metric) {
          rawDataTotal[parentChild][metric] = wt * info[metric];
        });
      } else {
        _.forEach(metrics, function (metric) {
          rawDataTotal[parentChild][metric] += wt * info[metric];
        });
      }
    }, this);
  }, this);

  var wtsString = '';
  var normalizationCount = runCount;

  if (!_.isUndefined(wts)) {
    wtsString = 'in the ratio (' + wts.join(':') + ')';
    normalizationCount = _.reduce(wts, function (sum, num) {
      return sum + (num * 1);
    });
  }

  var runsString = runIds.join(',');

  runCount = runCount - badRuns.length;

  return {
    runId: runsString,
    row: {},
    description: 'Aggregated Report for ' + runCount + ' runs: ' + runsString + ' ' + wtsString,
    content: this.normalizeMetrics(rawDataTotal, normalizationCount),
    badRuns: badRuns
  };
};

XHprofLib.prototype.validRun = function (runId, rawData) {
  var mainInfo = rawData['main()'];
  var metric = null;

  if (!mainInfo) {
    return false;
  }

  // raw data should contain either wall time or samples information...
  if (!_.isUndefined(mainInfo['wt'])) {
    metric = 'wt';
  } else if (!_.isUndefined(mainInfo['samples'])) {
    metric = 'samples';
  } else {
    return false;
  }

  var ret = true;

  _.forEach(rawData, function (info) {
    var val = info[metric] * 1;

    // basic sanity checks...
    if (val < 0) {
      ret = false;
      return;
    }

    if (val > 86400000000) {
      ret = false;
      return;
    }
  });

  return ret;
};

XHprofLib.prototype.normalizeMetrics = function (rawData, numRuns) {
  if (!rawData || numRuns == 0) {
    return rawData;
  }

  var rawDataTotal = {};

  if (!_.isUndefined(rawData['==>main()']) && !_.isUndefined(rawData['main()'])) {
    // error, but doesn't stop execution of the function
  }

  _.forEach(rawData, function (info, parentChild) {
    rawDataTotal[parentChild] = {};

    _.forEach(info, function (val, metric) {
      rawDataTotal[parentChild][metric] = val / numRuns;
    });
  });

  return rawDataTotal;
};