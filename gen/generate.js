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

    var targetFile = path.resolve(__dirname, '../index.js');

    fs.readFile(targetFile, function (error, data) {
      if (error) return callback(error);

      var existingJS = data.toString('utf8');
      var matched = false;
      var insertionPointRegExp = /(var breakRanges =\s*)([^;]+)(;)/gm;
      var updatedJS = existingJS.replace(
        insertionPointRegExp,
        function (whole, lead, inner, trail) {
          matched = true;
          return lead + injectJS + trail;
        }
      );

      if (!matched) return callback(new Error('Insertion point ' + insertionPointRegExp + ' not found in ' + file));

      fs.writeFile(targetFile, updatedJS, callback);
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
    str += '\n  ' + category.cat + ': [';

    if (category.ranges.length > 1)
      str += ' // ' + escapeHexChar(category.ranges[0].codeStart) + ' ' + category.nameStart + (!category.nameEnd ? '' : '...' + category.nameEnd);

    var prevSimpleNumber = false;
    for (var j = 0; j < category.ranges.length; j++) {
      var r = category.ranges[j];
      var simpleNumber = !r.extra && !r.repeats;
      str +=
        prevSimpleNumber && simpleNumber ? '' :
          category.ranges.length === 1 ? '' :
            '\n';
      
      var indent = category.ranges.length === 1 ? '' : '    ';
      
      if (simpleNumber) {
        str += (prevSimpleNumber ? '' : indent) + r.skip;
        prevSimpleNumber = true;
      }
      else {
        prevSimpleNumber = false;
        if (r.repeats) {
          str += indent + '[' + r.skip + ',' + (r.extra + 1) + ', ' + r.spaced + ',' + r.repeats + ']';
        }
        else {
          str += indent + '[' + r.skip + ',' + (r.extra + 1) + ']';
        }
      }
      if (j < category.ranges.length -1) {
        str += ',';
        if (r.extra >= 15) str += ' // ' + escapeHexChar(r.codeStart) + ' ' + r.nameStart + (!r.nameEnd ? '' : '...' + r.nameEnd);
      }
    }
    str += ']' + (i === compacted.length - 1 ? '' : ',');
    if (category.ranges.length === 1)
      str += ' // ' + escapeHexChar(category.ranges[0].codeStart) + ' ' + category.nameStart + (!category.nameEnd ? '' : '...' + category.nameEnd);
  }
  str += '\n}';
    
  return str;
}

/**
 * @param {number} chCode
 */
function escapeHexChar(chCode) {
  if (chCode <= 0xFF) return '\\x' + (0x100 + chCode).toString(16).slice(1).toUpperCase();
  else if (chCode <= 0xFFFF) return '\\u' + (0x10000 + chCode).toString(16).slice(1).toUpperCase();
  var hexStr = chCode.toString(16).toUpperCase();
  return '0x' + hexStr.slice(0, hexStr.length - 4) + '_' + hexStr.slice(hexStr.length - 4);
}

/** @typedef {{
 *  cat: string,
 *  nameStart: string;
 *  nameEnd?: string;
 *  ranges: {
 *      codeStart: number,
 *      skip: number,
 *      extra: number, 
 *      repeats: number, 
 *      spaced: number,
 *      nameStart: string,
 *      nameEnd?: string
 *  }[]
 * }} CompactedCategory */

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
      byCat[ranges[i].cat] = catEntries;
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
    var comp = { cat: catEntries[0].cat, nameStart: catEntries[0].name1, ranges: [] };
    compactedCategories.push(comp);
    var lastPos = 0;

    for (var j = 0; j < catEntries.length; j++) {
      var entry = catEntries[j];
      var skip = entry.code1 - lastPos;
      var extra = entry.code2 ? entry.code2 - entry.code1 : 0;
      if (j)
        comp.nameEnd = entry.name2 || entry.name1;
      lastPos += skip + extra;

      var prev = comp.ranges.length && comp.ranges[comp.ranges.length - 1];
      if (prev && prev.extra === extra) {
        if (prev.repeats) {
          if (prev.spaced === skip) {
            prev.repeats++;
            prev.nameEnd = entry.name2 || entry.name1;
            continue;
          }
        }
        else if (prev.skip === skip) {
          var expectRepeats = extra ? 3 : 5;

          var prevBefore = prev;
          for (var repeats = 2; repeats < expectRepeats; repeats++) {
            if (prevBefore.skip !== skip) break;
            prevBefore = comp.ranges.length >= repeats && comp.ranges[comp.ranges.length - repeats];
            if (!prevBefore || prevBefore.extra !== extra || prevBefore.repeats) break;
          }

          if (repeats >= expectRepeats) {
            prevBefore.repeats = repeats;
            prevBefore.spaced = skip;
            prevBefore.nameEnd = entry.name2 || entry.name1;

            while (comp.ranges[comp.ranges.length - 1] !== prevBefore)
              comp.ranges.pop();

            continue;
          }
        }
      }

      comp.ranges.push({
        codeStart: entry.code1,
        skip: skip,
        extra: extra,
        repeats: 0,
        spaced: 0,
        nameStart: entry.name1,
        nameEnd: entry.name2
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
    var match = /^\s*([0-9a-f]+)(\s*\.\.\s*([0-9a-f]+))?\s*\;\s*([0-9a-z_\-]+)(\s*#\s*[0-9a-z_\-]+\s*(\[[0-9]+\]\s+)?([^\.]+)(\.\.([^.]+))?)?/i.exec(lines[i]);
    if (!match) continue;

    ranges.push({
      code1: parseInt(match[1], 16),
      code2: match[3] ? parseInt(match[3], 16) : void 0,
      cat: match[4],
      name1: prettifyNames(match[7]),
      name2: prettifyNames(match[9])
    });
  }

  return ranges;
}

/**
 * @param {string} nm
 */
function prettifyNames(nm) {
  return nm && nm.replace(/control-000D/, 'CR').replace(/control-000A/, 'LF');
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