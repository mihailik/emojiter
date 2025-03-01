// @ts-check

var urlGraphemeBreakProperty = 'https://www.unicode.org/Public/13.0.0/ucd/auxiliary/GraphemeBreakProperty.txt';

var fs = require('fs');
var path = require('path');

var urlGraphemeBreakPropertyDefaultPath = path.resolve(__dirname, urlGraphemeBreakProperty.split('/').slice(-1)[0]);

if ((require.main || process.mainModule) === module) {
  handleCommandLineArgs();
}
else {
  module.exports.parseGraphemeBreakPropertyFile = parseGraphemeBreakPropertyFile;
  module.exports.urlGraphemeBreakProperty = urlGraphemeBreakProperty;
  module.exports.urlGraphemeBreakPropertyDefaultPath = urlGraphemeBreakPropertyDefaultPath;
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
      var insertionPointRegExp = /([\r\n])(\s*)(var breakRanges =\s*)([^;]+)(;)/gm;
      var updatedJS = existingJS.replace(
        insertionPointRegExp,
        function (whole, newLine, indent, varAssign, value, semicolon) {
          matched = true;
          return (
            newLine + indent + varAssign +
            injectJS.split(/[\r\n]/g).join('\n' + indent) +
            semicolon
          );
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

  var str = ''; // open curly bracket will be added there after the processing
  var lineStart = 0;
  var idealLineLength = 140;
  var afterLineComment = true;
  var maxSkip = 0;
  var maxRange = 0;
  for (var i = 0; i < compacted.length; i++) {
    var category = compacted[i];
    lineStart = str.length + 1;
    str += '\n  ' + category.cat + ': [';

    if (category.ranges.length > 1) {
      str += ' // ' + category.nameStart + (!category.nameEnd ? '' : '...' + category.nameEnd);
      afterLineComment = true;
    }

    var prevSimpleNumber = false;
    for (var j = 0; j < category.ranges.length; j++) {
      var r = category.ranges[j];
      maxSkip = Math.max(maxSkip, r.skip);
      maxRange = Math.max(maxRange, r.extra + 1);

      var simpleNumber = !r.extra && !r.repeats;
      var breakBefore =
        prevSimpleNumber && simpleNumber ? false :
          category.ranges.length === 1 ? false :
            true;
      
      if (breakBefore &&
        !afterLineComment && str.length - lineStart < idealLineLength) breakBefore = false;

      if (breakBefore) {
        afterLineComment = false;
        str += '\n';
        lineStart = str.length;
      }
      
      var indent = !breakBefore || category.ranges.length === 1 ? '' : '    ';

      var skipOrCode = (j ? r.skip : '0x' + r.skip.toString(16).toUpperCase());
      
      if (simpleNumber) {
        str += (prevSimpleNumber ? '' : indent) + skipOrCode;
        prevSimpleNumber = true;
      }
      else {
        prevSimpleNumber = false;
        if (r.repeats) {
          str += indent + '[' + skipOrCode + ',' + (r.extra + 1) + ', ' + r.spaced + ',' + r.repeats + ']';
        }
        else {
          str += indent + '[' + skipOrCode + ',' + (r.extra + 1) + ']';
        }
      }
      if (j < category.ranges.length - 1) {
        str += ',';
        // if (r.extra >= 15 && str.length - lineStart > idealLineLength * 0.65) {
        //   str += ' // ' + escapeHexChar(r.codeStart) + ' ' + r.nameStart + (!r.nameEnd ? '' : '...' + r.nameEnd);
        //   afterLineComment = true;
        // }
      }
    }
    str += ']' + (i === compacted.length - 1 ? '' : ',');
    if (category.ranges.length === 1) {
      str += ' // ' + category.nameStart + (!category.nameEnd ? '' : '...' + category.nameEnd);
      afterLineComment = true;
    }
  }
  str += '\n}';

  str = '{ // skip...' + maxSkip + ', range...' + maxRange + str;

  return str;
}

/**
 * @param {number} chCode
 */
function escapeHexChar(chCode) {
  if (chCode <= 0xFF) return '\\x' + (0x100 + chCode).toString(16).slice(1).toUpperCase();
  else if (chCode <= 0xFFFF) return '\\u' + (0x10000 + chCode).toString(16).slice(1).toUpperCase();
  var hexStr = chCode.toString(16).toUpperCase();
  return '0x0' + hexStr.slice(0, hexStr.length - 4) + '_' + hexStr.slice(hexStr.length - 4);
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
    var comp = {
      cat: catEntries[0].cat,
      nameStart: catEntries[0].name1,
      nameEnd: catEntries.length === 1 ? catEntries[0].name2 :
        catEntries[catEntries.length - 1].name2 || catEntries[catEntries.length - 1].name1,
      ranges: []
    };
    compactedCategories.push(comp);
    var lastPos = 0;

    for (var j = 0; j < catEntries.length; j++) {
      var entry = catEntries[j];
      var skip = entry.code1 - lastPos;
      // extra is number of points minus 1
      var extra = entry.code2 ? entry.code2 - entry.code1 : 0;
      lastPos += skip + 1 + extra;

      var prev = comp.ranges.length && comp.ranges[comp.ranges.length - 1];
      if (prev && !skip && !prev.repeats) {
        // if two ranges are immediately side by side with no gap,
        // and no repeating pattern caught already in prev
        // -- merge the ranges
        prev.extra += 1 + extra;
        continue;
      }

      if (prev && prev.extra === extra) {
        // possible repeating pattern

        if (prev.repeats) {
          // if prev already has repeating pattern,
          // can only continue with the same rhythm
          if (prev.spaced === skip) {
            prev.repeats++;
            prev.nameEnd = entry.name2 || entry.name1;
            continue;
          }
        }
        else if (prev.skip === skip) {
          // if prev not yet repeating (enough)
          var expectRepeats = extra ? 3 : 5;

          var repeatStart = prev;
          for (var repeats = 2; repeats < expectRepeats; repeats++) {
            // skip after candidate must fit the pattern
            if (repeatStart.skip !== skip) break;

            var repeatStartCandidate = comp.ranges.length >= repeats && comp.ranges[comp.ranges.length - repeats];

            if (!repeatStartCandidate || repeatStartCandidate.repeats || repeatStartCandidate.extra !== extra) break;
            repeatStart = repeatStartCandidate;
          }

          if (repeats >= expectRepeats) {
            repeatStart.repeats = repeats;
            repeatStart.spaced = skip;
            repeatStart.nameEnd = entry.name2 || entry.name1;

            while (comp.ranges[comp.ranges.length - 1] !== repeatStart)
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
  for (var i = 0; i < lines.length; i++) {
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