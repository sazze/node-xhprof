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
 * This is a derivative work of the xhprof_lib/display/xhprof.php file from https://github.com/facebook/xhprof
 *
 * The original copyright and license from xhprof_lib/display/xhprof.php is below:
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
var xhprofLib = require('../lib/xhprof');
var queryString = require('querystring');
var sprintf = require('sprintf').sprintf;
var numeral = require('numeral');

var oddEven = 0;

function XHprof() {
  this.diffMode = false;
  this.sortCol = null;
  this.stats = [];
  this.pcStats = [];
  this.metrics = [];
  this.displayCalls = true;
  this.totals = {};
  this.totals1 = {};
  this.totals2 = {};
  
  //
  // things that don't change
  //
  
  this.vbar = ' class="vbar"';
  this.vwbar = ' class="vwbar"';
  this.vwlbar = ' class="vwlbar"';
  this.vbbar = ' class="vbbar"';
  this.vrbar = ' class="vrbar"';
  this.vgbar = ' class="vgbar"';
  
  this.descriptions = {
    'fn': 'Function Name',
    'ct': 'Calls',
    'Calls%': 'Calls%',

    'wt': 'Incl. Wall Time<br>(microsec)',
    'IWall%': 'IWall%',
    'excl_wt': 'Excl. Wall Time<br>(microsec)',
    'EWall%': 'EWall%',

    'ut': 'Incl. User<br>(microsecs)',
    'IUser%': 'IUser%',
    'excl_ut': 'Excl. User<br>(microsec)',
    'EUser%': 'EUser%',

    'st': 'Incl. Sys <br>(microsec)',
    'ISys%': 'ISys%',
    'excl_st': 'Excl. Sys <br>(microsec)',
    'ESys%': 'ESys%',

    'cpu': 'Incl. CPU<br>(microsecs)',
    'ICpu%': 'ICpu%',
    'excl_cpu': 'Excl. CPU<br>(microsec)',
    'ECpu%': 'ECPU%',

    'mu': 'Incl.<br>MemUse<br>(bytes)',
    'IMUse%': 'IMemUse%',
    'excl_mu': 'Excl.<br>MemUse<br>(bytes)',
    'EMUse%': 'EMemUse%',

    'pmu': 'Incl.<br> PeakMemUse<br>(bytes)',
    'IPMUse%': 'IPeakMemUse%',
    'excl_pmu': 'Excl.<br>PeakMemUse<br>(bytes)',
    'EPMUse%': 'EPeakMemUse%',

    'samples': 'Incl. Samples',
    'ISamples%': 'ISamples%',
    'excl_samples': 'Excl. Samples',
    'ESamples%': 'ESamples%'
  };
  
  this.sortableColumns = {
    'fn': 1,
    'ct': 1,
    'wt': 1,
    'excl_wt': 1,
    'ut': 1,
    'excl_ut': 1,
    'st': 1,
    'excl_st': 1,
    'mu': 1,
    'excl_mu': 1,
    'pmu': 1,
    'excl_pmu': 1,
    'cpu': 1,
    'excl_cpu': 1,
    'samples': 1,
    'excl_samples': 1
  };
  
  this.diffDescriptions = {
    'fn': 'Function Name',
    'ct': 'Calls Diff',
    'Calls%': 'Calls<br>Diff%',

    'wt': 'Incl. Wall<br>Diff<br>(microsec)',
    'IWall%': 'IWall<br> Diff%',
    'excl_wt': 'Excl. Wall<br>Diff<br>(microsec)',
    'EWall%': 'EWall<br>Diff%',

    'ut': 'Incl. User Diff<br>(microsec)',
    'IUser%': 'IUser<br>Diff%',
    'excl_ut': 'Excl. User<br>Diff<br>(microsec)',
    'EUser%': 'EUser<br>Diff%',

    'cpu': 'Incl. CPU Diff<br>(microsec)',
    'ICpu%': 'ICpu<br>Diff%',
    'excl_cpu': 'Excl. CPU<br>Diff<br>(microsec)',
    'ECpu%': 'ECpu<br>Diff%',

    'st': 'Incl. Sys Diff<br>(microsec)',
    'ISys%': 'ISys<br>Diff%',
    'excl_st': 'Excl. Sys Diff<br>(microsec)',
    'ESys%': 'ESys<br>Diff%',

    'mu': 'Incl.<br>MemUse<br>Diff<br>(bytes)',
    'IMUse%': 'IMemUse<br>Diff%',
    'excl_mu': 'Excl.<br>MemUse<br>Diff<br>(bytes)',
    'EMUse%': 'EMemUse<br>Diff%',

    'pmu': 'Incl.<br> PeakMemUse<br>Diff<br>(bytes)',
    'IPMUse%': 'IPeakMemUse<br>Diff%',
    'excl_pmu': 'Excl.<br>PeakMemUse<br>Diff<br>(bytes)',
    'EPMUse%': 'EPeakMemUse<br>Diff%',

    'samples': 'Incl. Samples Diff',
    'ISamples%': 'ISamples Diff%',
    'excl_samples': 'Excl. Samples Diff',
    'ESamples%': 'ESamples Diff%'
  };
  
  this.formatCallback = {
    'fn': '',
    'ct': this.countFormat,
    'Calls%': this.percentFormat,

    'wt': function (num) { return numeral(num).format('0,0'); },
    'IWall%': this.percentFormat,
    'excl_wt': function (num) { return numeral(num).format('0,0'); },
    'EWall%': this.percentFormat,

    'ut': function (num) { return numeral(num).format('0,0'); },
    'IUser%': this.percentFormat,
    'excl_ut': function (num) { return numeral(num).format('0,0'); },
    'EUser%': this.percentFormat,

    'st': function (num) { return numeral(num).format('0,0'); },
    'ISys%': this.percentFormat,
    'excl_st': function (num) { return numeral(num).format('0,0'); },
    'ESys%': this.percentFormat,

    'cpu': function (num) { return numeral(num).format('0,0'); },
    'ICpu%': this.percentFormat,
    'excl_cpu': function (num) { return numeral(num).format('0,0'); },
    'ECpu%': this.percentFormat,

    'mu': function (num) { return numeral(num).format('0,0'); },
    'IMUse%': this.percentFormat,
    'excl_mu': function (num) { return numeral(num).format('0,0'); },
    'EMUse%': this.percentFormat,

    'pmu': function (num) { return numeral(num).format('0,0'); },
    'IPMUse%': this.percentFormat,
    'excl_pmu': function (num) { return numeral(num).format('0,0'); },
    'EPMUse%': this.percentFormat,

    'samples': function (num) { return numeral(num).format('0,0'); },
    'ISamples%': this.percentFormat,
    'excl_samples': function (num) { return numeral(num).format('0,0'); },
    'ESamples%': this.percentFormat
  };
}

module.exports = XHprof;

XHprof.prototype.countFormat = function (num) {
  return numeral(num).format('0,0.[00]');
};

XHprof.prototype.getXHProfReport = function (options, callback) {
  if (!_.isUndefined(options['run'])) { // specific run to display?
    this._singleRunReport(options.run, options.wts, options.symbol, options.sort, options.params, callback);
  } else if (!_.isUndefined(options['run1']) && !_.isUndefined(options['run2'])) {  // diff report for two runs
    this._diffReport(options.run1, options.run2, options.symbol, options.sort, options.params, callback);
  } else {
    callback('No XHProf runs specified in the URL.');
  }
};

XHprof.prototype._singleRunReport = function (runId, wts, symbol, sort, urlParams, callback) {
  var self = this;

  // runId may be a single run or a comma separated list of runs
  // that'll be aggregated. If "wts" (a comma separated list
  // of integral weights is specified), the runs will be
  // aggregated in that ratio.
  //
  var runIds = runId.split(',');

  if (runIds.length != 1) {
    if (wts) {
      wts = wts.split(',');
    } else {
      wts = null;
    }

    async.map(runIds, function (id, callback) {
      xhprofLib.getRun(id, callback);
    }, function (err, runs) {
      var html = '';

      if (err) {
        if (_.isFunction(callback)) {
          callback('');
        }

        return;
      }

      var run = xhprofLib.aggregateRuns(runs, wts);

      self._initMetrics(run, symbol, sort, false);

      var html = self._profilerReport(run, null, symbol, sort, urlParams);

      if (_.isFunction(callback)) {
        callback(html);
      }
    });
  } else {
    xhprofLib.getRun(runId, function (err, run) {
      if (err) {
        console.log(err);
        if (_.isFunction(callback)) {
          callback('');
        }

        return;
      }

      self._initMetrics(run, symbol, sort, false);

      var html = self._profilerReport(run, null, symbol, sort, urlParams);

      if (_.isFunction(callback)) {
        callback(html);
      }
    });
  }
};

XHprof.prototype._diffReport = function (runId1, runId2, symbol, sort, urlParams, callback) {
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

    self._initMetrics(runs[1], symbol, sort, true);

    var html = self._profilerReport(runs[0], runs[1], symbol, sort, urlParams);

    if (_.isFunction(callback)) {
      callback(html);
    }
  });
};

XHprof.prototype._profilerReport = function (run1, run2, symbol, sort, urlParams) {
  var symbolTab = {};
  var html = '';

  if (symbol) {
    run1.content = xhprofLib.trimRun(run1, [symbol]);

    if (this.diffMode) {
      run2.content = xhprofLib.trimRun(run2, [symbol]);
    }
  }

  if (this.diffMode) {
    var delta = xhprofLib.computeDiff(run1, run2);
    symbolTab = xhprofLib.computeFlatInfo(delta, this.totals);
    var symbolTab1 = xhprofLib.computeFlatInfo(run1, this.totals1);
    var symbolTab2 = xhprofLib.computeFlatInfo(run2, this.totals2);
  } else {
    symbolTab = xhprofLib.computeFlatInfo(run1, this.totals);
  }

  var run1Txt = '<b>Run #' + run1.runId + '</b> ' + run1.description;

  var baseUrlParams = _.cloneDeep(urlParams);

  delete baseUrlParams['symbol'];
  delete baseUrlParams['all'];

  var topLinkQueryString = options.xhprof.baseUrl + '/?' + queryString.stringify(baseUrlParams);

  var diffText = 'Run';

  if (this.diffMode) {
    diffText = 'Diff';
    delete baseUrlParams['run1'];
    delete baseUrlParams['run2'];

    var run1Link = this.renderLink('View Run #' + run1.runId, options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(baseUrlParams, {run: run1.runId})));
    var run2Txt = '<b>Run #' + run2.runId + '</b> ' + run2.description;
    var run2Link = this.renderLink('View Run #' + run2.runId, options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(baseUrlParams, {run: run2.runId})));
  }

  // set up the action links for operations that can be done on this report
  var links = [this.renderLink('View Top Level ' + diffText + ' Report', topLinkQueryString)];

  if (this.diffMode) {
    var invertedParams = _.cloneDeep(urlParams);
    invertedParams['run1'] = urlParams['run2'];
    invertedParams['run2'] = urlParams['run1'];

    // view the different runs or invert the current diff
    links.push(run1Link);
    links.push(run2Link);
    links.push(this.renderLink('Invert ' + diffText + ' Report', options.xhprof.baseUrl + '/?' + queryString.stringify(invertedParams)));
  }

  // lookup function typeahead form
  links.push('<input class="function_typeahead" type="input" size="40" maxlength="100" />');

  html = this.renderActions(links);

  html += '<dl class="phprof_report_info">' +
    '   <dt>' + diffText + ' Report</dt>' +
    '   <dd>' + (this.diffMode ? run1Txt + '<br><b>vs.</b><br>' + run2Txt : run1Txt) + '</dd>' +
    '   <dt>Tip</dt>' +
    '   <dd>Click a function name below to drill down.</dd>' +
    '</dl>' +
    '<div style="clear: both; margin: 3em 0em;"></div>';

  // data tables
  if (symbol) {
    if (_.isUndefined(symbolTab[symbol])) {
      html += '<hr>Symbol <b>' + symbol + '</b> not found in XHProf run</hr>';
      return html;
    }

    /* single function report with parent/child information */
    if (this.diffMode) {
      var info1 = (!_.isUndefined(symbolTab1[symbol]) ? symbolTab1[symbol] : null);
      var info2 = (!_.isUndefined(symbolTab2[symbol]) ? symbolTab2[symbol] : null);

      html += this.symbolReport(delta, run1, run2, urlParams, symbolTab[symbol], sort, symbol, info1, info2);
    } else {
      html += this.symbolReport(run1, null, null, urlParams, symbolTab[symbol], sort, symbol);
    }
  } else {
    html += this.fullReport(urlParams, symbolTab, sort, run1, run2);
  }

  return html;
};

XHprof.prototype._initMetrics = function (run, symbol, sort, diffReport) {
  this.diffMode = diffReport || false;
  this.sortCol = 'excl_wt';

  if (sort) {
    if (_.has(this.sortableColumns, sort)) {
      this.sortCol = sort;
    }
  }

  this.displayCalls = true;

  // For C++ profiler runs, walltime attribute isn't present.
  // In that case, use "samples" as the default sort column.
  if (_.isUndefined(run.content['main()']['wt'])) {
    if (this.sortCol == 'wt') {
      this.sortCol = 'samples';
    }

    this.displayCalls = false;
  }

  // parent/child report doesn't support exclusive times yet.
  // So, change sort hyperlinks to closest fit.
  if (symbol) {
    this.sortCol = this.sortCol.replace('excl_', '');
  }

  if (this.displayCalls) {
    this.stats = ['fn', 'ct', 'Calls%'];
  } else {
    this.stats = ['fn'];
  }

  this.pcStats = _.clone(this.stats);

  _.forEach(xhprofLib.getPossibleMetrics(), function (desc, metric) {
    if (_.isUndefined(run.content['main()'][metric])) {
      return;
    }

    this.metrics.push(metric);

    // flat (top-level reports): we can compute
    // exclusive metrics reports as well.
    this.stats.push(metric);
    this.stats.push('I' + desc[0] + '%');
    this.stats.push('excl_' + metric);
    this.stats.push('E' + desc[0] + '%');

    // parent/child report for a public function: we can
    // only breakdown inclusive times correctly.
    this.pcStats.push(metric);
    this.pcStats.push('I' + desc[0] + '%');
  }, this);
};

XHprof.prototype.renderLink = function (content, href, cssClass, id, title, target, onClick, style, access, onMouseOver, onMouseOut, onMouseDown) {
  var link = '';

  if (!content) {
    return link;
  }

  if (href) {
    link = '<a href="' + href + '"';
  } else {
    link = '<span';
  }

  if (cssClass) {
    link += ' class="' + cssClass + '"';
  }

  if (id) {
    link += ' id="' + id + '"';
  }

  if (title) {
    link += ' title="' + title + '"';
  }

  if (target) {
    link += ' target="' + target + '"';
  }

  if (onClick && href) {
    link += ' onclick="' + onClick + '"';
  }

  if (style && href) {
    link += ' style="' + style + '"';
  }

  if (access && href) {
    link += ' accesskey="' + access + '"';
  }

  if (onMouseOver) {
    link += ' onmouseover="' + onMouseOver + '"';
  }

  if (onMouseOut) {
    link += ' onmouseout="' + onMouseOut + '"';
  }

  if (onMouseDown) {
    link += ' onmousedown="' + onMouseDown + '"';
  }

  link += '>' + content;

  if (href) {
    link += '</a>';
  } else {
    link += '</span>';
  }

  return link;
};

XHprof.prototype.renderActions = function (actions) {
  var out = [];

  if (_.isArray(actions) && actions.length > 0) {
    out.push('<ul class="xhprof_actions">');

    _.forEach(actions, function (action) {
      out.push('<li>' + action + '</li>');
    });

    out.push('</ul>');
  }

  return out.join('');
};

XHprof.prototype.fullReport = function (urlParams, symbolTab, sort, run1, run2) {
  var possibleMetrics = xhprofLib.getPossibleMetrics();
  var callGraphReportTitle = '[View Full Callgraph]';
  var html = '';
  var baseUrlParams = _.cloneDeep(urlParams);

  if (this.diffMode) {
    delete baseUrlParams['run1'];
    delete baseUrlParams['run2'];
    
    var href1 = options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(baseUrlParams, {run: run1.runId}));
    var href2 = options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(baseUrlParams, {run: run2.runId}));
    
    html += '<h3><center>Overall Diff Summary</center></h3>' +
      '<table border="1" cellpadding="2" cellspacing="1" width="30%" rules="rows" bordercolor="#bdc7d8" align="center">' +
      '   <tr bgcolor="#bdc7d8" align="right">' +
      '       <th></th>' +
      '       <th ' + this.vwbar + '>' + this.renderLink('Run #' + run1.runId, href1) + '</th>' +
      '       <th ' + this.vwbar + '>' + this.renderLink('Run #' + run2.runId, href2) + '</th>' +
      '       <th ' + this.vwbar + '>Diff</th>' +
      '       <th ' + this.vwbar + '>Diff%</th>' +
      '   </tr>';
    
    if (this.displayCalls) {
      html += '<tr>' +
        '   <td>Number of Function Calls</td>';
      
      html += this.printTdNum(this.totals1['ct'], this.formatCallback['ct']);
      html += this.printTdNum(this.totals2['ct'], this.formatCallback['ct']);
      html += this.printTdNum(this.totals2['ct'] - this.totals1['ct'], this.formatCallback['ct'], true);
      html += this.printTdPct(this.totals2['ct'] - this.totals1['ct'], this.totals1['ct'], true);
      
      html +=
        '</tr>';
    }
    
    _.forEach(this.metrics, function (metric) {
      html += '<tr>' +
        '   <td>' + this.descriptions[metric].replace('<br>', ' ') + '</td>';

      html += this.printTdNum(this.totals1[metric], this.formatCallback[metric]);
      html += this.printTdNum(this.totals2[metric], this.formatCallback[metric]);
      html += this.printTdNum(this.totals2[metric] - this.totals1[metric], this.formatCallback[metric], true);
      html += this.printTdPct(this.totals2[metric] - this.totals1[metric], this.totals1[metric], true);
      
      html +=
        '</tr>';
    }, this);
    
    html +=
      '</table>';
    
    callGraphReportTitle = '[View Regressions/Improvements using Callgraph Diff]';
  } else {
    html += '<p><center>' +
      '   <table cellpadding="2" cellspacing="1" width="30%" bgcolor="#bdc7d8" align="center">' +
      '       <tr>' +
      '           <th style="text-align: right;">Overall Summary</th><th></th>' +
      '       </tr>';

    _.forEach(this.metrics, function (metric) {
      html += '<tr>' +
        '   <td style="text-align: right; font-weight: bold;">Total ' + this.descriptions[metric].replace('<br>', ' ') + ':</td>' +
        '   <td>' + this.totals[metric] + ' ' + possibleMetrics[metric][1] + '</td>' +
        '</tr>';
    }, this);
    
    if (this.displayCalls) {
      html += '<tr>' +
        '   <td style="text-align: right; font-weight: bold">Number of Function Calls:</td>' +
        '   <td>' + this.totals['ct'] + '</td>' +
        '</tr>';
    }
    
    html +=
      '   </table>' +
      '</center></p>';
  }
  
  html += '<center><br><h3>' + this.renderLink(callGraphReportTitle, options.xhprof.baseUrl + '/callgraph?' + queryString.stringify(urlParams)) + '</h3></center>';
  
  var flatData = [];
  
  _.forEach(symbolTab, function (info, symbol) {
    flatData.push(_.merge(info, {fn: symbol}));
  });

  flatData.sort(this.sortCallback.bind(this));

  html += '<br>';
  
  var all = false;
  var limit = 100;
  var title = '';
  
  if (!_.isUndefined(urlParams['all']) && urlParams['all']) {
    all = true;
    limit = 0;
  }

  var desc = this.descriptions[this.sortCol].replace('<br>', ' ');
  
  if (this.diffMode) {
    if (all) {
      title = 'Total Diff Report: Sorted by absolute value of regression/improvement in ' + desc;
    } else {
      title = 'Top 100 <i style="color: red;">Regressions</i>/<i style="color: green;">Improvements</i>: Sorted by ' + desc + ' Diff';
    }
  } else {
    if (all) {
      title = 'Sorted by ' + desc;
    } else {
      title = 'Displaying top ' + limit + ' functions: Sorted by ' + desc;
    }
  }
  
  html += this.printFlatData(urlParams, title, flatData, sort, run1, run2, limit);
  
  return html;
};

XHprof.prototype.printFlatData = function (urlParams, title, flatData, sort, run1, run2, limit) {
  var size = flatData.length;
  var displayLink = '';
  var html = '';
  
  if (!limit) {
    limit = size;
  } else {
    displayLink = this.renderLink(' [ <b class="bubble">display all </b>]', options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(urlParams, {all: 1})));
  }
  
  html += '<h3 align="center">' + title + ' ' + displayLink + '</h3><br>' +
    '<table border="1" cellpadding="2" cellspacing="1" width="90%" rules="rows" bordercolor="#bdc7d8" align="center">' +
    '   <tr bgcolor="#bdc7d8" align="right">';

  _.forEach(this.stats, function (stat) {
    if (this.diffMode) {
      desc = this.diffDescriptions[stat];
    } else {
      desc = this.descriptions[stat];
    }
    
    var header = desc;
    
    if (!_.isUndefined(this.sortableColumns[stat])) {
      header = this.renderLink(desc, options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(urlParams, {sort: stat})));
    }
    
    if (stat == 'fn') {
      html += '<th align="left"><nobr>' + header + '</th>';
    } else {
      html += '<th ' + this.vwbar + '><nobr>' + header + '</th>';
    }
  }, this);
  
  html +=
    '</tr>';
  
  if (limit >= 0) {
    limit = Math.min(size, limit);
    
    for (var i = 0; i < limit; i++) {
      html += this.printFunctionInfo(urlParams, flatData[i]);
    }
  } else {
    // if $limit is negative, print abs($limit) items starting from the end
    limit = Math.min(size, Math.abs(limit));
    
    for (var j = 0; j < limit; j++) {
      html += this.printFunctionInfo(urlParams, flatData[size - j - 1]);
    }
  }
  
  html +=
    '</table>';

  // let's print the display all link at the bottom as well...
  if (displayLink) {
    html += '<div style="text-align: left; padding: 2em;">' + displayLink + '</div>';
  }
  
  return html;
};

XHprof.prototype.printFunctionInfo = function (urlParams, info) {
  var html = '';

  if (oddEven !== 1 && oddEven !== 0) {
    oddEven = 0;
  }
  
  oddEven = 1 - oddEven;
  
  if (oddEven) {
    html += '<tr>';
  } else {
    html += '<tr bgcolor="#e5e5e5">';
  }
  
  html += '<td>' + this.renderLink(info['fn'], options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(urlParams, {symbol: info['fn']}))) + '</td>';
  
  if (this.displayCalls) {
    // Call Count..
    html += this.printTdNum(info['ct'], this.formatCallback['ct'], (this.sortCol == 'ct'));
    html += this.printTdPct(info['ct'], this.totals['ct'], (this.sortCol == 'ct'));
  }
  
  // Other metrics..
  _.forEach(this.metrics, function (metric) {
    if (_.isUndefined(info[metric])) {
      html += '<td></td>'
      return;
    }

    // Inclusive metric
    html += this.printTdNum(info[metric], this.formatCallback[metric], (this.sortCol == metric));
    html += this.printTdPct(info[metric], this.totals[metric], (this.sortCol == metric));
    
    // Exclusive metric
    html += this.printTdNum(info['excl_' + metric], this.formatCallback['excl_' + metric], (this.sortCol == 'excl_' + metric));
    html += this.printTdPct(info['excl_' + metric], this.totals[metric], (this.sortCol == 'excl_' + metric));
  }, this);

  html += '</tr>';

  return html;
};

XHprof.prototype.symbolReport = function (run, run1, run2, urlParams, symbolInfo, sort, symbol, symbolInfo1, symbolInfo2) {
  var possibleMetrics = xhprofLib.getPossibleMetrics();
  var diffText = '';
  var regrImpr = '';
  var html = '';
  var baseUrlParams = _.cloneDeep(urlParams);

  if (this.diffMode) {
    diffText = '<b>Diff</b>';
    regrImpr = '<i style="color:red">Regression</i>/<i style="color:green">Improvement</i>';

    delete baseUrlParams['run1'];
    delete baseUrlParams['run2'];

    var href1 = options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(baseUrlParams, {run: run1.runId}));
    var href2 = options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(baseUrlParams, {run: run2.runId}));

    html += '<h3 align="center">' + regrImpr + ' summary for ' + diffText + '<br><br></h3>' +
      '<table border="1" cellpadding="2" cellspacing="1" width="30%" rules="rows" bordercolor="#bdc7d8" align="center">' +
      '   <tr bgcolor="#bdc7d8" align="right">' +
      '       <th align="left">' + symbol + '</th>' +
      '       <th ' + this.vwbar + '><a href="' + href1 + '">Run #' + run1.runId + '</a></th>' +
      '       <th ' + this.vwbar + '><a href="' + href2 + '">Run #' + run2.runId + '</a></th>' +
      '       <th ' + this.vwbar + 'Diff</th>' +
      '       <th ' + this.vwbar + 'Diff%</th>' +
      '   </tr>' +
      '   <tr>' +
      '</table>';

    if (this.displayCalls) {
      html += '<td>Number of Function Calls</td>';
      html += this.printTdNum(symbolInfo1['ct'], this.formatCallback['ct']);
      html += this.printTdNum(symbolInfo2['ct'], this.formatCallback['ct']);
      html += this.printTdNum((symbolInfo2['ct'] - symbolInfo1['ct']), this.formatCallback['ct'], true);
      html += this.printTdPct((symbolInfo2['ct'] - symbolInfo1['ct']), symbolInfo1['ct'], true);
      html += '</tr>';
    }
    
    _.forEach(this.metrics, function (metric) {
      if (_.isUndefined(symbolInfo1[metric]) || _.isUndefined(symbolInfo1[metric])) {
        html += '<td></td>'
        return;
      }

      // Inclusive stat for metric
      html += '<tr>' +
        '   <td>' + this.descriptions[metric].replace('<br>', '') + '</td>';
      
      html += this.printTdNum(symbolInfo1[metric], this.formatCallback[metric]);
      html += this.printTdNum(symbolInfo2[metric], this.formatCallback[metric]);
      html += this.printTdNum(symbolInfo2[metric] - symbolInfo1[metric], this.formatCallback[metric], true);
      html += this.printTdPct(symbolInfo2[metric] - symbolInfo1[metric], symbolInfo1[metric], true);
      html += '</tr>';
      
      // AVG (per call) Inclusive stat for metric
      html += '<tr>' +
        '   <td>' + this.descriptions[metric].replace('<br>', '') + ' per call </td>';
      
      var avgInfo1 = 'N/A';
      var avgInfo2 = 'N/A';
      
      if (symbolInfo1['ct'] > 0) {
        avgInfo1 = (symbolInfo1[metric] / symbolInfo1['ct']);
      }
      
      if (symbolInfo2['ct'] > 0) {
        avgInfo2 = (symbolInfo2[metric] / symbolInfo2['ct']);
      }
      
      html += this.printTdNum(avgInfo1, this.formatCallback[metric]);
      html += this.printTdNum(avgInfo2, this.formatCallback[metric]);
      html += this.printTdNum(avgInfo2 - avgInfo1, this.formatCallback[metric], true);
      html += this.printTdPct(avgInfo2 - avgInfo1, avgInfo1, true);
      html += '</tr>';
      
      // Exclusive stat for metric
      var m = 'excl_' + metric;
      html += '<tr>' +
        '   <td>' + this.descriptions[m].replace('<br>', '') + '</td>';

      html += this.printTdNum(symbolInfo1[m], this.formatCallback[m]);
      html += this.printTdNum(symbolInfo2[m], this.formatCallback[m]);
      html += this.printTdNum(symbolInfo2[m] - symbolInfo1[m], this.formatCallback[m], true);
      html += this.printTdPct(symbolInfo2[m] - symbolInfo1[m], symbolInfo1[m], true);
      html += '</tr>';
    }, this);
    
    html += '</table>';
  }
  
  var callgraphHref = options.xhprof.baseUrl + '/callgraph?' + queryString.stringify(_.merge(urlParams, {func: symbol}));
  
  html += '<br><h4><center>Parent/Child ' + regrImpr + ' report for <b>' + symbol + '</b> <a href="' + callgraphHref + '">[View Callgraph ' + diffText + ']</a><br></center></h4><br>' +
    '<table border="1" cellpadding="2" cellspacing="1" width="90%" rules="rows" bordercolor="#bdc7d8" align="center">' +
    '   <tr bgcolor="#bdc7d8" align="right">';
  
  _.forEach(this.pcStats, function (stat) {
    var desc = this.statDescription(stat);
    
    var header = desc;
    
    if (!_.isUndefined(this.sortableColumns[stat])) {
      header = this.renderLink(desc, options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(urlParams, {sort: stat})));
    }
    
    if (stat == 'fn') {
      html += '<th align="left"><nobr>' + header + '</th>';
    } else {
      html += '<th ' + this.vwbar + '><nobr>' + header + '</th>';
    }
  }, this);
  
  html += '</tr>' +
    '   <tr bgcolor="#e0e0ff">' +
    '       <td><b><i><center>Current Function</center></i></b></td>' +
    '   </tr>' +
    '   <tr>' +
    // make this a self-reference to facilitate copy-pasting snippets to e-mails
    '       <td><a href="">' + symbol + '</a></td>';
  
  if (this.displayCalls) {
    // Call Count
    this.printTdNum(symbolInfo['ct'], this.formatCallback['ct']);
    this.printTdPct(symbolInfo['ct'], this.totals['ct']);
  }
  
  // Inclusive Metrics for current function
  _.forEach(this.metrics, function (metric) {
    this.printTdNum(symbolInfo[metric], this.formatCallback[metric], (this.sortCol == metric));
    this.printTdPct(symbolInfo[metric], this.totals[metric], (this.sortCol == metric));
  }, this);

  html += '</tr>' +
    '   <tr bgcolor="#ffffff">' +
    '       <td style="text-align: right; color: #0000ff;">Exclusive Metrics ' + diffText + ' for Current Function</td>';

  if (this.displayCalls) {
    html += '<td ' + this.vbar + '></td>';
    html += '<td ' + this.vbar + '></td>';
  }

  // Exclusive Metrics for current function
  _.forEach(this.metrics, function (metric) {
    if (_.isUndefined(symbolInfo['excl_' + metric])) {
      html += '<td></td>'
      return;
    }

    this.printTdNum(symbolInfo['excl_' + metric], this.formatCallback['excl_' + metric], (this.sortCol == metric), this.getToolTipAttributes('Child', metric));
    this.printTdPct(symbolInfo['excl_' + metric], symbolInfo[metric], (this.sortCol == metric), this.getToolTipAttributes('Child', metric));
  }, this);

  html += '</tr>';

  // list of callers/parent functions
  var results = [];
  var baseCt = 0;
  var baseInfo = {};

  if (this.displayCalls) {
    baseCt = symbolInfo['ct'];
  }

  _.forEach(this.metrics, function (metric) {
    baseInfo[metric] = symbolInfo[metric];
  });

  _.forEach(run.content, function (info, parentChild) {
    xhprofLib.parseParentChild(parentChild, function (parent, child) {
      if (child == symbol && parent) {
        results.push(_.merge(info, {fn: parent}));
      }
    });
  });

  results.sort(this.sortCallback.bind(this));

  if (results.length > 1) {
    this.printPcArray(urlParams, results, baseCt, baseInfo, true, run1, run2);
  }

  // list of callees/child functions
  results = [];
  baseCt = 0;

  _.forEach(run.content, function (info, parentChild) {
    var self = this;

    xhprofLib.parseParentChild(parentChild, function (parent, child) {
      if (parent == symbol) {
        results.push(_.merge(info, {fn: child}));

        if (self.displayCalls) {
          baseCt += info[ct];
        }
      }
    });
  }, this);

  results.sort(this.sortCallback.bind(this));

  if (results.length > 1) {
    this.printPcArray(urlParams, results, baseCt, baseInfo, false, run1, run2);
  }

  html += '</table>';

  // These will be used for pop-up tips/help.
  // Related javascript code is in: xhprof_report.js
  html += '<script language="javascript">' +
    ' var func_name = "' + symbol + '";' +
    ' var total_child_ct = ' + baseCt + ';' +
    ' ' + (this.displayCalls ? 'var func_ct = ' + symbolInfo['ct'] + ';' : '') +
    ' var func_metrics = new Array();' +
    ' var metrics_col = new Array();' +
    ' var metrics_desc = new Array();' +
    ' var diff_mode = ' + (this.diffMode ? 'true' : 'false') + ';';

  var columnIndex = 3; // First three columns are Func Name, Calls, Calls%

  _.forEach(this.metrics, function (metric) {
    html += 'func_metrics["' + metric + '"] = ' + Math.round(symbolInfo[metric]) + ';' +
      ' metrics_col["' + metric + '"] = ' + columnIndex + ';' +
      ' metrics_desc["' + metric + '"] = ' + possibleMetrics[metric][2] + ';';

      // each metric has two columns..
      columnIndex += 2;
  });

  html += '</script>';

  return html;
};

XHprof.prototype.printPcArray = function (urlParams, results, baseCt, baseInfo, isParent, run1, run2) {
  // Construct the section title
  var title = 'Child function';
  var html = '';

  if (isParent) {
    title = 'Parent function';
  }

  if (results.length > 1) {
    title += 's';
  }

  html += '<tr bgcolor="#e0e0ff">' +
    '   <td><b><i><center>' + title + '</center></i></b></td>' +
    '</tr>';

  var oddEven = 0;

  _.forEach(results, function (info) {
    var href = options.xhprof.baseUrl + '/?' + queryString.stringify(_.merge(urlParams, {symbol: info['fn']}));

    oddEven = 1 - oddEven;

    if (oddEven) {
      html += '<tr>';
    } else {
      html += '<tr bgcolor="#e5e5e5">';
    }

    html += '<td>' + this.renderLink(info['fn'], href) + '</td>';
    html += this.pcInfo(info, baseCt, baseInfo, isParent);
    html += '</tr>';
  });

  return html;
};

XHprof.prototype.pcInfo = function (info, baseCt, baseInfo, isParent) {
  var type = (isParent ? 'Parent' : 'Child');
  var html = '';

  if (this.displayCalls) {
    /* call count */
    html += this.printTdNum(info['ct'], this.formatCallback['ct'], (this.sortCol == 'ct'), this.getToolTipAttributes(type, 'ct'));
    html += this.printTdPct(info['ct'], baseCt, (this.sortCol == 'ct'), this.getToolTipAttributes(type, 'ct'));
  }

  /* Inclusive metric values */
  _.forEach(this.metrics, function (metric) {
    if (_.isUndefined(info[metric])) {
      html += '<td></td>'
      return;
    }

    html += this.printTdNum(info[metric], this.formatCallback[metric], (this.sortCol == metric), this.getToolTipAttributes(type, metric));
    html += this.printTdPct(info[metric], baseInfo[metric], (this.sortCol == metric), this.getToolTipAttributes(type, metric));
  }, this);

  return html;
};

XHprof.prototype.sortCallback = function (a, b) {
  var valA;
  var valB;

  if (this.sortCol == 'fn') {
    // case insensitive ascending sort for function names
    valA = a['fn'].toUpperCase();
    valB = b['fn'].toUpperCase();

    if (valA < valB) {
      return -1;
    }

    if (valA > valB) {
      return 1;
    }

    return 0;
  }

  // descending sort for all others
  if (this.diffMode) {
    // if diff mode, sort by absolute value of regression/improvement
    valA = Math.abs(a[this.sortCol]);
    valB = Math.abs(b[this.sortCol]);
  } else {
    valA = a[this.sortCol];
    valB = b[this.sortCol];
  }

  if (valA < valB) {
    return 1;
  }

  if (valA > valB) {
    return -1;
  }

  return 0;
};

XHprof.prototype.printTdNum = function (num, fmtFunc, bold, attributes) {
  var cssClass = this.getPrintClass(num, bold);

  if (_.isFunction(fmtFunc)) {
    num = fmtFunc(num);
  }

  return '<td ' + (attributes ? attributes : '') + ' ' + cssClass + '>' + num + '</td>';
};

XHprof.prototype.printTdPct = function (numer, denom, bold, attributes) {
  var cssClass = this.getPrintClass(numer, bold);
  var pct = 'N/A%';

  if (denom != 0) {
    pct = this.percentFormat((numer * 1) / Math.abs(denom));
  }

  return '<td ' + (attributes ? attributes : '') + ' ' + cssClass + '>' + pct + '</td>';
};

XHprof.prototype.percentFormat = function (s, precision) {
  precision = precision || 1;

  return sprintf('%.' + precision + 'f%%', 100 * s);
};

XHprof.prototype.getPrintClass = function (num, bold) {
  if (!bold) {
    return this.vbar;
  }

  if (this.diffMode) {
    if (num <= 0) {
      return this.vgbar;
    }

    return this.vrbar;
  }

  return this.vbbar;
};

XHprof.prototype.getToolTipAttributes = function (type, metric) {
  return 'type="' + type + '" metric="' + metric + '"';
}