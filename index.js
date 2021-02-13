// @ts-check
// @

var emojiter = (function () {
  
  /**
   * Break the input text into individual graphemes,
   * where each grapheme will be a whole atomic character glyph
   * with any possible accents, skin tones, combining marks etc.
   * Whitespace or control characters are conidered each a separate grapheme too.
   * But CR+LF combination is considered a single grapheme.
   * @param {string} text
   * @param {string[]=} pushable An optional receptacle array (but can be any object with a push method) - when omitted, an empty array will be created and returned.  
   * @param {number=} textOffsetStart Character offset in input text to start, when omitted implied as zero.
   * @param {number=} textOffsetEnd Character offset in input text to end, when omitted means to iterate to the end of text.
   * @returns {string[]} Array of graphemes as individual strings. If pushable argument is provided, that same instance will be returned.
   */
  function emojiter(text, pushable, textOffsetStart, textOffsetEnd) {
    var result = pushable || [];
    if (typeof textOffsetStart !== 'number') textOffsetStart = 0;

    if (text) {
      if (!breakMap) breakMap = unpackBreakMap();

      var pos = 0;
      while (pos < text.length) {
        var codePoint = codePointAt(text, pos);
        var bcat = breakCategory(codePoint);

        pos += codePoint ^ 0xFFFF ? 2 : 1; 
      }
    }

    if (!pushable) return result;
  }

  /**
   * Determine the break category of the character.
   * Aut-generated from https://www.unicode.org/Public/13.0.0/ucd/auxiliary/GraphemeBreakProperty.txt
   * @param {number} codePoint 
   */
  function breakCategory(codePoint) {
    var lo = 0;
    var hi = breakMap.length;
    while (true) {
      var halfIndex = lo + ((hi-lo) / 2) % 2;
      var start = breakMap[halfIndex];
      var end = breakMap[halfIndex + 1];
      
    }
  }

  function unpackBreakMap() {

    /** @type {{
     *    [breakCategory: string]: (
     *      number // skip after last character
     *      | ([skipAfterLastCharacter: number, countOfCharacters: number])
     *      | ([skipAfterLastCharacter: number, countOfCharacters: number, spaceBetweenRepeatClusters: number, repeatClusterCount: number])
     *    )[]
     * }} */
    var breakRanges = {
      Prepend: [ // ARABIC NUMBER SIGN...MASARAM GONDI REPHA
        [0x600,6],215,49,466,1131,66414,15,[244,2],1915,1,248,[73,6],700],
      CR: [0xD], // <CR>
      LF: [0xA], // <LF>
      Control: [ // <control-0000>...<reserved-E0FFF>
        [0x0,10],[1,2],[1,18],[95,33],13,1390,4593,2044,[2,2],24,0,[0,5],[49,5],0,[0,10],56975,[240,9],[0,3],[13364,9],[34919,4],[5327,8],
        798341,0,[0,30],[96,128],[240,3600]],
      Extend: [ // COMBINING GRAVE ACCENT...VARIATION SELECTOR-256
        [0x300,112],[275,5],[0,2],[263,45],1,[1,2],[1,2],1,[72,11],[48,21],16,[101,7],[2,6],[2,2],[1,4],35,[30,27],[91,11],[58,9],9,[24,4],
        [1,9],[1,3],[1,5],[43,3],[119,15],[1,32],55,1,[4,8],4,[3,7],[10,2],29,58,1,[2,4],8,9,[10,2],26,[2,2],57,[4,2],[4,2],[2,3],3,[30,2],
        3,[11,2],57,[4,5],[1,2],4,[20,2],[22,6],1,58,1,0,[1,4],8,[7,2],0,[10,2],30,59,1,12,9,40,3,[57,3],[5,3],[1,4],[7,2],[11,2],29,58,2,2,3,
        [5,2],[7,2],[11,2],[28,2],[57,2],1,[2,4],8,9,[10,2],29,72,4,[2,3],1,8,81,[2,7],[12,8],98,[2,9],[11,6],[74,2],27,1,1,[55,14],[1,5],
        [1,2],[5,11],[1,36],9,[102,4],[1,6],[1,2],[2,2],[25,2],[4,3],[16,4],13,[2,2],6,15,[703,3],[946,3],[29,3],[29,2],[30,2],[64,2],
        [1,7],8,[2,11],9,[45,3],[119,2],34,[118,3],[4,2],9,[6,3],[219,2],2,58,[1,7],1,1,[2,8],[6,10],2,[48,14],0,[0,2],[63,4],48,0,[0,5],
        1,5,[40,9],[12,2],[32,4],[2,2],[1,3],56,[1,2],3,[1,3],[58,8],[2,2],[152,3],[1,13],[1,7],4,6,[3,2],[198,58],[1,5],524,[195,13],
        [0,4],0,[0,3],[0,12],[3070,3],141,[96,32],[554,4],[0,2],[105,2],30164,[0,3],[1,10],[32,2],[80,2],272,3,4,[25,2],5,[151,2],[26,18],
        13,[38,8],[25,11],[46,3],48,[2,4],[2,2],39,[67,6],[2,2],[2,2],12,8,47,51,[1,3],[2,2],[5,2],1,[42,2],8,238,2,4,20272,[737,16],[16,16],
        [366,2],605,226,[149,5],[1670,3],[1,2],[5,4],[40,3],4,[165,2],[573,4],[387,2],[153,11],176,[54,15],[56,3],[49,4],[2,2],[69,3],
        [36,5],[1,8],62,[12,2],[52,9],[10,4],2,[95,3],2,[1,2],6,160,[3,8],[21,2],[57,2],1,1,22,[14,7],[3,5],[195,8],[2,3],1,23,81,[2,6],
        1,2,[1,2],[1,2],235,[2,4],[6,2],[1,2],[27,2],[85,8],2,[1,2],106,1,[2,6],1,[101,3],[2,4],[1,5],[259,9],[1,2],245,[10,2],1,4,[144,4],
        [2,2],4,[32,10],[40,6],[2,4],8,[9,6],[2,3],[46,13],[1,2],[406,7],[1,6],1,[82,22],[2,7],[1,2],[1,2],[122,6],3,[1,2],[1,7],1,[72,2],
        3,1,[347,2],[19451,5],[59,7],1048,[63,4],81,[19640,2],5318,[1,3],[4,5],[8,8],[2,7],[30,4],[148,3],[1979,55],[4,50],8,14,[22,5],
        [1,15],[1360,7],[1,17],[2,7],[1,2],[1,5],[261,7],[437,4],[1504,7],[109,7],[2736,5],[789536,96],[128,240]],
      Regional_Indicator: [[0x1F1E6,26]], // REGIONAL INDICATOR SYMBOL LETTER A...REGIONAL INDICATOR SYMBOL LETTER Z
      SpacingMark: [ // DEVANAGARI SIGN VISARGA...MUSICAL SYMBOL COMBINING AUGMENTATION DOT
        0x903,55,[2,3],[8,4],[1,2],[50,2],[59,2],[6,2],[2,2],54,[58,3],66,[58,3],8,[1,2],[53,2],60,[6,2],[2,2],114,[1,2],[3,3],[1,3],[52,3],
        [61,4],[61,2],58,[1,2],[1,2],[2,2],[1,2],[54,2],[59,2],[5,3],[1,3],[53,2],[76,2],[6,7],[19,2],63,127,[138,2],63,177,[9,2],[25,2],
        44,1841,[7,8],[1,2],[346,4],[2,3],[4,2],[1,6],[224,2],58,1,[21,6],145,54,[1,5],[1,2],61,30,[4,2],2,60,[2,3],1,[3,2],[48,8],[8,2],
        171,21,[35627,2],2,[88,2],[50,16],[142,2],47,[48,2],[4,2],[2,3],[110,2],[2,2],24,157,[2,2],5,[237,2, 1,3],1,25619,1,127,[45,3],
        [4,2],115,[24,2],59,[48,3],[9,2],13,[93,3],[3,2],1,[170,3],[31,2],59,[1,4],[2,2],[2,3],[20,2],[209,3],[8,2],3,[107,2],6,[1,2],
        1,2,[238,2],[6,4],2,[113,3],[8,2],1,109,[1,2],6,[105,2],4,[261,3],9,[248,5],[1,2],4,2,1,[142,3],[8,4],4,84,[29,2],62,407,14,106,7,2,
        [213,5],[4,2],1,[350,2],[20570,55],[104,2],24948,6],
      L: [ // HANGUL CHOSEONG KIYEOK...HANGUL CHOSEONG SSANGYEORINHIEUH
        [0x1100,96],[38912,29]],
      V: [ // HANGUL JUNGSEONG FILLER...HANGUL JUNGSEONG ARAEA-E
        [0x1160,72],[50696,23]],
      T: [ // HANGUL JONGSEONG KIYEOK...HANGUL JONGSEONG PHIEUPH-THIEUTH
        [0x11A8,88],[50635,49]],
      LV: [[0xAC00,1, 27,399]], // HANGUL SYLLABLE GA...HANGUL SYLLABLE HI
      LVT: [[0xAC01,27, 1,399]], // HANGUL SYLLABLE GAG...HANGUL SYLLABLE HIH
      ZWJ: [0x200D] // ZERO WIDTH JOINER
    };

    /** @type {number[]} */
    var ranges = [];
    for (var cat in breakRanges) {
      var catRanges = breakRanges[cat];
      if (catRanges && Array.isArray(catRanges)) {
        var code = 0;
        for (var i = 0; i < catRanges.length; i++) {
          var r = catRanges[i];
          var skip = 0, count = 0, space = 0, repeats = 0;
          if (typeof r === 'number') {
            skip = r;
            count = 1;
          }
          else {
            skip = r[0];
            count = r[1];
            space = r[2];
            repeats = r[3];
          }
          code += skip;
          ranges.push(code);
          ranges.push(count);
          code += count;
          if (repeats) {
            for (var j = 1; j < repeats; j++) {
              code += space;
              ranges.push(code);
              ranges.push(count);
              code += count;
            }
          }
        }
      }
    }

    return typeof Uint32Array === 'undefined' || !Uint32Array ? ranges : new Uint32Array(ranges);
  }

  /** @type {number[] | Uint32Array} */
  var breakMap;

  /**
   * Unicode point, taking account of pair surrogates.
   * @param {string} text
   * @param {number} offset
   */
  function codePointAt(text, offset) {
    var chCode = text.charCodeAt(offset);

    if (chCode >= 0xD800 && offset < text.length - 1) {
      var chCodeNext = text.charCodeAt(offset + 1);
      if (chCode < 0xDC00) return 0x10000 | ((chCode - 0xD800) << 10) | (chCodeNext - 0xDC00); // high surrogate
      else if (chCode <= 0xDBFF) return 0x10000 | ((chCodeNext - 0xD800) << 10) | (chCode - 0xDC00) // low surrogate, swap
    }

    return chCode;
  }

  if (typeof module !== 'undefined' && module) {
    if ((require.main || process.mainModule) === /** @type {*} */(module)) {
      console.log('This file is not meant to run as a command line script (yet).')
    }
    else {
      module.exports = emojiter;
    }
  }
  else if (typeof WScript !== 'undefined' && WScript) {
    // TODO: read from input and print out in neat way, for testing
    WScript.Echo('This file is not meant to run in Windows Script Host (yet).');
  }
  else {
    emojiter.breakCategory = breakCategory;
    emojiter.codePointAt = codePointAt;
    emojiter.emojiter = emojiter;
    return emojiter;
  }

})();