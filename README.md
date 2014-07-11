Introduction
======

This is a port of [facebook/xhprof](https://github.com/facebook/xhprof) to nodejs

It is intended to promote the creation of better UI's for XHProf data.

Writing of XHProf data is not supported.

### Dependencies
------

node-xhprof requires that [graphviz](http://www.graphviz.org/) be installed on your system (specifically the `dot` command)

**RHEL/Centos/etc:**

```
yum install graphviz
```

**Debian/Ubuntu/etc:** *(need to confirm package name)*

```
apt-get install graphviz
```

### Install
------

```
npm install xhprof
```

### Usage
------

Basic generation of a report from XHProf data saved in a file:

```javascript
var fs = require('fs');
var xhprof = new (require('xhprof'))({adapter: {type: 'file'}, report: 'default'});

xhprof.report.getXHProfReport({run: 'abc1234', params: {}}, function (html) {
  fs.writeFileSync('./report.html', html);
  process.exit();
});
```

Generate a callgraph from XHProf data saved in a file:

```javascript
var fs = require('fs');
var xhprof = new (require('xhprof'))({adapter: {type: 'file'}});

var runId = '53235ace524be';
var type = 'jpg';
var threshold = 0.01;
var func = null;
var source = null;
var criticalPath = true;

xhprof.callgraph.renderImage(runId, type, threshold, func, source, criticalPath, function (err, imageStream) {
  if (err) {
    console.log(err.track || err);
    process.exit();
  }

  var outStream = fs.createWriteStream(__dirname + '/callgraph.' + type, {flags: 'w'});

  imageStream.pipe(outStream);

  outStream.on('close', function () {
    process.exit();
  });

  //
  // error handling
  //
  outStream.on('error', function (err) {
    console.log('outStream.error');
    console.log(err);
    process.exit();
  });

  imageStream.on('error', function (err) {
    console.log('imageStream.error');
    console.log(err);
    process.exit();
  });
});
```

See tests for more examples.

### Licence
------

    Copyright (c) 2014 Sazze, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.`