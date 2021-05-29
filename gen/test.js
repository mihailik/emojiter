// @ts-check

var fs = require('fs');
var path = require('path');

var emojiter = require('../index');
var generate = require('./generate');

function loadGraphemeBreaks() {
  return new Promise(function (resolve, reject) {
    fs.readFile(generate.urlGraphemeBreakPropertyDefaultPath, { encoding: 'utf8' },
      function (error, data) {
        if (error) throw error;

        console.log('Loaded ' + data.length + ' chars...');
        var parsedBreaks = generate.parseGraphemeBreakPropertyFile(data);
        console.log('Parsed ' + parsedBreaks.length + ' break runs...');

        // ASCII sanity test
        parsedBreaks.push(
          { cat: 'Other', code1: 32, code2: 126, name1: 'Space', name2: 'ch126~tilda' });

        var categoryReverseKey = { 0: 'Other' };
        for (var k in emojiter.categoryKey) {
          var v = emojiter.categoryKey[k];
          if (typeof v === 'number') categoryReverseKey[v] = k;
        }

        for (var iRun = 0; iRun < parsedBreaks.length; iRun++) {
          var r = parsedBreaks[iRun];

          process.stdout.write('u' + (0x10000 + r.code1).toString(16).slice(1).toUpperCase() + (r.code2 ? '..' + (0x10000 + r.code2).toString(16).slice(1).toUpperCase() : '') + ' ' + r.cat);

          for (var c = r.code1; r.code2 ? c < r.code2 : c === r.code1; c++) {
            var typeCode = emojiter.breakCategory(c);
            var typeKey = categoryReverseKey[typeCode];
            if (typeKey === r.cat) process.stdout.write('.');
            else process.stdout.write(' u' + (0x10000 + c).toString(16).slice(1).toUpperCase() + ':' +  typeKey + '?' + r.cat);
          }
          console.log();
        }

        resolve();
      });
  });
}

loadGraphemeBreaks();
