// @ts-check

var urlGraphemeBreakProperty = 'https://www.unicode.org/Public/13.0.0/ucd/auxiliary/GraphemeBreakProperty.txt';

var fs = require('fs');
var path = require('path');

var urlGraphemeBreakPropertyDefaultPath = path.resolve(__dirname, urlGraphemeBreakProperty.split('/').slice(-1)[0]);


if ((require.main || process.mainModule) === module) {
  handleCommandLineArgs();
}

function handleCommandLineArgs() {
  var downloadArg = process.argv.slice(1).some(function (arg) { return /^(\-+)?(d|download)$/i.test(arg); });
  var generateArg = process.argv.slice(1).some(function (arg) { return /^(\-+)?(g|gen|generate)$/i.test(arg); });

  if (downloadArg === generateArg) {
    console.log('Downloading ' + urlGraphemeBreakProperty + ' to process into JS ...');
    downloadGraphemeBreakPropertyToFile(function (error) {
      if (error) return console.error(error);
      console.log('Unicode details file is downloaded OK.');
      console.log('Processing downloaded Unicode file into JS ...');
      parseAndProcess(function (error) {
        if (error) return console.error(error);
        console.log('File is generated OK.');
      });
    });
  }
  else if (downloadArg) {
    console.log('Downloading ' + urlGraphemeBreakProperty + ' ...');
    downloadGraphemeBreakPropertyToFile(function (error) {
      if (error) console.error(error);
      else console.log('Unicode details file is downloaded OK.');
    });
  }
  else {
    console.log('Processing downloaded Unicode file into JS ...');
    parseAndProcess(function (error) {
      if (error) return console.error(error);
      console.log('File is generated OK.');
    });
  }
}

/**
 * @param {(string | ((error?: Error) => void))=} file
 * @param {((error?: Error) => void)=} callback
 */
function parseAndProcess(file, callback) {
  if (!callback) {
    callback = /** @type {(error?: Error) => void} */(file);
    file = urlGraphemeBreakPropertyDefaultPath;
  }

  fs.readFile(/** @type {string} */(file), 'utf8', function (error, data) {
    if (error) return callback(error);

    var injectJS = processAndGenerateJS(data);

    fs.readFile(/** @type {string} */(file), function (error, data) {
      if (error) return callback(error);

      var existingJS = data.toString('utf8');
      var matched = false;
      var updatedJS = existingJS.replace(
        /(var breakingRanges =\s*)([^;]+)(;)/gm,
        function (whole, lead, inner, trail) {
          matched = true;
          return lead + injectJS + trail;
        }
      );

      fs.writeFile(/** @type {string} */(file), updatedJS, callback);
    });
  });
}

/**
 * @param {string} text
 * @returns {string}
 */
function processAndGenerateJS(text) {
  var ranges = parseGraphemeBreakPropertyFile(text);
  var compacted = compactRanges(ranges);

  var str = '{';
  for (var i = 0; i < compacted.length; i++) {
    var category = compacted[i];
    str += i ? ',\n' : '\n';
    str += '  ' + category.cat + ': [\n';
    for (var j = 0; j < category.ranges.length; j++) {
      str += j ? ',\n' : '\n';
      var r = category.ranges[j];
      if (!r.extra && !r.repeats) {
        str += '  ' + r.skip;
      }
      else {
        if (r.repeats) {
          str += '  [' + r.skip + ',' + r.extra + ', ' + r.repeats + ',' + r.spaced + ']';
        }
        else {
          str += '  [' + r.skip + ',' + r.extra + ']';
        }
      }
    }
    str += ']';
  }
    
  return str;
}

/** @typedef {{ cat: string, ranges: { skip: number, extra: number, repeats: number, spaced: number }[]}} CompactedCategory */

/**
 * @param {ReturnType<typeof parseGraphemeBreakPropertyFile>} ranges
 */
function compactRanges(ranges) {
  // group entries by category
  /** @type {{[cat: string]: typeof ranges}} */
  var byCat = {};
  /** @type{(typeof ranges)[]} */
  var catList = [];
  for (var i = 0; i < ranges.length; i++) {
    var catEntries = byCat[ranges[i].cat];
    if (!catEntries) {
      catEntries = [];
      catList.push(catEntries);
    }
    catEntries.push(ranges[i]);
  }

  // sort and then compact categories
  /** @type {CompactedCategory[]} */
  var compactedCategories = [];
  for (var i = 0; i < catList.length; i++) {
    var catEntries = catList[i];
    catEntries.sort(function (catEntry1, catEntry2) { return catEntry1.code1 - catEntry2.code1; });

    // compact
    /** @type {CompactedCategory} */
    var comp = { cat: catEntries[0].cat, ranges: [] };
    compactedCategories.push(comp);
    var lastPos = 0;
    for (var j = 0; j < catEntries.length; j++) {
      var skip = catEntries[j].code1 - lastPos;
      var extra = catEntries[j].code2 ? catEntries[j].code2 - catEntries[j].code1 : 0;
      lastPos += skip + extra;

      var prev = comp.ranges.length && comp.ranges[comp.ranges.length - 1];
      if (prev && prev.extra === extra) {
        if (!prev.repeats || prev.spaced === skip) {
          prev.spaced = skip;
          prev.repeats++;
          continue;
        }
      }

      comp.ranges.push({
        skip: skip,
        extra: extra,
        repeats: 0,
        spaced: 0
      });
    }
  }

  return compactedCategories;
}

/**
 * @param {string} text
 */
function parseGraphemeBreakPropertyFile(text) {
  var lines = text.split(/\r|\n/g);
  var ranges = [];
  for (let i = 0; i < lines.length; i++) {
    var match = /^\s*([0-9a-f]+)(\s*\.\.\s*([0-9a-f]+))?\s*\;\s*([0-9a-z]+)/i.exec(lines[i]);
    if (!match) continue;
    var code1 = match[1];
    var code2 = match[3];
    var cat = match[4];
    ranges.push({
      code1: parseInt(code1, 16),
      code2: code2 ? parseInt(code2, 16) : void 0,
      cat: cat
    });
  }

  return ranges;
}

/**
 * @param {(string | ((error?: Error) => void))=} file
 * @param {((error?: Error) => void)=} callback
 */
function downloadGraphemeBreakPropertyToFile(file, callback) {
  if (!callback) {
    callback = /** @type {(error?: Error) => void} */(file);
    file = urlGraphemeBreakPropertyDefaultPath;
  }

  downloadUrl(urlGraphemeBreakProperty, function (data) {
    fs.writeFile(/** @type {string} */(file), data, function (error) {
      callback(error);
    });
  });
}

/**
 * @param {string} url
 * @param {(data: Buffer) => void} callback 
 */
function downloadUrl(url, callback) {
  var http = /^https/i.test(url) ? require('https') : require('http');

  http.get(url, function (res) {
    /** @type {Buffer[]} */
    var buffers = [];
    res.on('data', function (data) {
      buffers.push(data);
    });

    res.on('end', function () {
      var data = Buffer.concat(buffers);
      callback(data);
    });

    res.read();
  });
}