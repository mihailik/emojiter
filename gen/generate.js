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

    var js = processAndGenerateJS(data);

    // TODO: read index.js, find insertion point and inject it
  });
}

/**
 * @param {string} text
 * @returns {string}
 */
function processAndGenerateJS(text) {
  // TODO: parse, compact the categories, produce JS
  return text;
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