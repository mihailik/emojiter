// @ts-check
// @

var emojiter = (function () {

  var categoryKey = {
    Other: 0,
    Prepend: 9,
    Control: 0xC0,
    CR: 0xD,
    LF: 0xA,
    Extend: 2,
    Regional_Indicator: 4,
    SpacingMark: 32,
    L: 1,
    V: 5,
    T: 3,
    LV: 15,
    LVT: 153,
    ZWJ: 100
  };
  
  /**
   * Break the input text into individual graphemes,
   * where each grapheme will be a whole atomic character glyph
   * with any possible accents, skin tones, combining marks etc.
   * Whitespace or control characters are conidered each a separate grapheme too.
   * But CR+LF combination is considered a single grapheme.
   * @param {string} text
   * @param {{push(str: string)}=} pushable An optional receptacle array (but can be any object with a push method) - when omitted, an empty array will be created and returned.  
   * @param {number=} textOffsetStart Character offset in input text to start, when omitted implied as zero.
   * @param {number=} textOffsetEnd Character offset in input text to end, when omitted means to iterate to the end of text.
   * @returns {string[]} Array of graphemes as individual strings. If pushable argument is provided, that same instance will be returned.
   */
  function emojiter(text, pushable, textOffsetStart, textOffsetEnd) {
    if (typeof textOffsetStart !== 'number') textOffsetStart = 0;
    if (typeof textOffsetEnd !== 'number') textOffsetEnd = text ? text.length : 0;
    if (text && textOffsetEnd < textOffsetStart && !breakMap) breakMap = unpackBreakMap();

    var pushArray = pushable || [];
    var start = 0;
    var pos = 0;
    var prevBcat = 0;
    var graphemeCodepointCount = 0;

    while (pos < textOffsetEnd) {
      var codePoint = codePointAt(text, pos);
      var nextBcat = breakCategory(codePoint);

      if (graphemeCodepointCount && expectBreak(prevBcat, nextBcat, graphemeCodepointCount)) {
        var slice = text.slice(start, pos);
        start = pos;

        pushArray.push(slice);
      }

      pos += (codePoint >> 16) ? 2 : 1;
      graphemeCodepointCount++;
    }

    if (pos > start) pushArray.push(text.slice(start));

    if (!pushable) return /** @type {string[]} */(pushArray);
  }

  /**
   * Break is needed between codepoints with break categories,
   * See http://www.unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries for the official rules (represented pretty exactly below).
   * @param {number} prevBcat
   * @param {number} nextBcat
   * @param {number} graphemeCodepointCount
   */
  function expectBreak(prevBcat, nextBcat, graphemeCodepointCount) {
    // Do not break between a CR and LF. Otherwise, break before and after controls.
    if (prevBcat == 0xD /*CR*/ && nextBcat === 0xA /*LF*/) return false; // GB3 CR-LF
    if (prevBcat == 0xC0 /*Control*/ || prevBcat == 0xD /*CR*/ || prevBcat === 0xA /*LF*/ ||
      nextBcat == 0xC0 /*Control*/ || nextBcat == 0xD /*CR*/ || nextBcat === 0xA /*LF*/) return true; // GB4,5 (Control | CR | LF)x x(Control | CR | LF)
    // Do not break Hangul syllable sequences.
    if (prevBcat == 1 /*L*/ && (nextBcat == 1 /*L*/ || nextBcat == 5 /*V*/ || nextBcat === 15 /*LV*/ || nextBcat === 153 /*LVT*/)) return false; // GB6 Lx(L | V | LV | LVT)
    if ((prevBcat == 15 /*LV*/ || prevBcat == 5 /*V*/) && (nextBcat == 5 /*V*/ || nextBcat === 3 /*T*/)) return false; // GB7 (LV | V)x(V | T)
    if ((prevBcat == 153 /*LVT*/ || prevBcat == 3 /*T*/) && nextBcat === 3 /*T*/) return false; // GB8 (LVT | T)xT
    // Do not break before extending characters or ZWJ.
    if ((nextBcat === 2 /*Extend*/ || nextBcat === 100 /*ZWJ*/)) return true; // GB9 x(Extend | ZWJ)

    // The GB9a and GB9b rules only apply to extended grapheme clusters:
     // Do not break before SpacingMarks, or after Prepend characters.
    if (nextBcat === 32 /*SpacingMk*/ || prevBcat === 9 /*Prepend*/) return false; // GB9a,b x(SpacingMark) (Prepend)x
    
    // Do not break within emoji modifier sequences or emoji zwj sequences (SIMPLIFIED INCOMPLETE HERE)
    if (prevBcat === 100 /*ZWJ*/) return false;
    
    // Do not break within emoji flag sequences. That is, do not break between regional indicator (RI) symbols if there is an odd number of RI characters before the break point.
    if (prevBcat == 4 /*Reg.Ind*/ && nextBcat === 4 /*Reg.Ind*/) return graphemeCodepointCount === 1 ? false : true; // GB 12,13
    return true;
  }

  function isEmoji(codePoint) {
    if (codePoint >= 0x1F000 && codePoint <= 0x1FAFF) return true;
    if (codePoint >= 0x1FC00 && codePoint <= 0x1FFFD) return true;
    return false;
  }

  /**
   * Determine the break category of the character.
   * Aut-generated from https://www.unicode.org/Public/13.0.0/ucd/auxiliary/GraphemeBreakProperty.txt
   * @param {number} codePoint 
   */
  function breakCategory(codePoint) {
    if (!breakMap) breakMap = unpackBreakMap();
    // bisect
    var lo = 0;
    var hi = breakMap.length / 2;
    while (true) {
      var midIndex = lo + ((hi-lo) / 2) | 0;
      var start = breakMap[midIndex * 2];
      var countAndKey = breakMap[midIndex * 2 + 1];
      var end = start + (countAndKey >> 8);
      if (codePoint < start) hi = midIndex;
      else if (codePoint < end) return countAndKey & 0xFF;
      else lo = midIndex + 1;
      if (hi <= lo) return 0; // 'other' category      
    }
  }

  /**
   * Converts succint break map into flat bisect-searchable Uint32Array encoding ordered ranges into numbers.
   * Each range is encoded as 2 numbers: `start` and bit-packed ()`count` and `key`): low 8 bits are `key` and the rest is `count`.
   */
  function unpackBreakMap() {
    /**
     * Set of of Unicode ranges for a break category.
     * Range can be: a single codepoint (denoted by skip since the last), [start,count] range, or repeating range [start, count, spacing, repeat-count]
     * @type {{
     *    [breakCategory: string]: (
     *      number // skip after last character
     *      | ([skipAfterLastCharacter: number, countOfCharacters: number])
     *      | ([skipAfterLastCharacter: number, countOfCharacters: number, spaceBetweenRepeatClusters: number, repeatClusterCount: number])
     *    )[]
     * }} */
    var breakRanges = { // skip...798341, range...3600
      Prepend: [ // ARABIC NUMBER SIGN...MASARAM GONDI REPHA
        [0x600,6],215,49,466,1131,66414,15,[244,2],1915,1,248,[73,6],700],
      CR: [0xD], // <CR>
      LF: [0xA], // <LF>
      Control: [ // <control-0000>...<reserved-E0FFF>
        [0x0,10],[1,2],[1,18],[95,33],13,1390,4593,2044,[2,2],[24,7],[49,16],56975,[240,12],[13364,9],[34919,4],[5327,8],[798341,32],[96,128],[240,3600]],
      Extend: [ // COMBINING GRAVE ACCENT...VARIATION SELECTOR-256
        [0x300,112],[275,7],[263,45],1,[1,2],[1,2],1,[72,11],[48,21],16,[101,7],[2,6],[2,2],[1,4],35,[30,27],[91,11],[58,9],9,[24,4],[1,9],[1,3],
        [1,5],[43,3],[119,15],[1,32],55,1,[4,8],4,[3,7],[10,2],29,58,1,[2,4],8,9,[10,2],26,[2,2],57,[4,2],[4,2],[2,3],3,[30,2],3,[11,2],57,[4,5],
        [1,2],4,[20,2],[22,6],1,58,[1,2],[1,4],8,[7,3],[10,2],30,59,1,12,9,40,3,[57,3],[5,3],[1,4],[7,2],[11,2],29,58,2,2,3,[5,2],[7,2],[11,2],[28,2],
        [57,2],1,[2,4],8,9,[10,2],29,72,4,[2,3],1,8,81,[2,7],[12,8],98,[2,9],[11,6],[74,2],27,1,1,[55,14],[1,5],[1,2],[5,11],[1,36],9,[102,4],[1,6],
        [1,2],[2,2],[25,2],[4,3],[16,4],13,[2,2],6,15,[703,3],[946,3],[29,3],[29,2],[30,2],[64,2],[1,7],8,[2,11],9,[45,3],[119,2],34,[118,3],[4,2],
        9,[6,3],[219,2],2,58,[1,7],1,1,[2,8],[6,10],2,[48,17],[63,4],[48,7],1,5,[40,9],[12,2],[32,4],[2,2],[1,3],56,[1,2],3,[1,3],[58,8],[2,2],[152,3],
        [1,13],[1,7],4,6,[3,2],[198,58],[1,5],524,[195,33],[3070,3],141,[96,32],[554,6],[105,2],[30164,4],[1,10],[32,2],[80,2],272,3,4,[25,2],5,
        [151,2],[26,18],13,[38,8],[25,11],[46,3],48,[2,4],[2,2],39,[67,6],[2,2],[2,2],12,8,47,51,[1,3],[2,2],[5,2],1,[42,2],8,238,2,4,20272,[737,16],
        [16,16],[366,2],605,226,[149,5],[1670,3],[1,2],[5,4],[40,3],4,[165,2],[573,4],[387,2],[153,11],176,[54,15],[56,3],[49,4],[2,2],[69,3],[36,5],
        [1,8],62,[12,2],[52,9],[10,4],2,[95,3],2,[1,2],6,160,[3,8],[21,2],[57,2],1,1,22,[14,7],[3,5],[195,8],[2,3],1,23,81,[2,6],1,2,[1,2],[1,2],
        235,[2,4],[6,2],[1,2],[27,2],[85,8],2,[1,2],106,1,[2,6],1,[101,3],[2,4],[1,5],[259,9],[1,2],245,[10,2],1,4,[144,4],[2,2],4,[32,10],[40,6],
        [2,4],8,[9,6],[2,3],[46,13],[1,2],[406,7],[1,6],1,[82,22],[2,7],[1,2],[1,2],[122,6],3,[1,2],[1,7],1,[72,2],3,1,[347,2],[19451,5],[59,7],
        1048,[63,4],81,[19640,2],5318,[1,3],[4,5],[8,8],[2,7],[30,4],[148,3],[1979,55],[4,50],8,14,[22,5],[1,15],[1360,7],[1,17],[2,7],[1,2],[1,5],
        [261,7],[437,4],[1504,7],[109,7],[2736,5],[789536,96],[128,240]],
      Regional_Indicator: [[0x1F1E6,26]], // REGIONAL INDICATOR SYMBOL LETTER A...REGIONAL INDICATOR SYMBOL LETTER Z
      SpacingMark: [ // DEVANAGARI SIGN VISARGA...MUSICAL SYMBOL COMBINING AUGMENTATION DOT
        0x903,55,[2,3],[8,4],[1,2],[50,2],[59,2],[6,2],[2,2],54,[58,3],66,[58,3],8,[1,2],[53,2],60,[6,2],[2,2],114,[1,2],[3,3],[1,3],[52,3],[61,4],
        [61,2],58,[1,2],[1,2],[2,2],[1,2],[54,2],[59,2],[5,3],[1,3],[53,2],[76,2],[6,7],[19,2],63,127,[138,2],63,177,[9,2],[25,2],44,1841,[7,8],
        [1,2],[346,4],[2,3],[4,2],[1,6],[224,2],58,1,[21,6],145,54,[1,5],[1,2],61,30,[4,2],2,60,[2,3],1,[3,2],[48,8],[8,2],171,21,[35627,2],2,[88,2],
        [50,16],[142,2],47,[48,2],[4,2],[2,3],[110,2],[2,2],24,157,[2,2],5,[237,2, 1,3],1,25619,1,127,[45,3],[4,2],115,[24,2],59,[48,3],[9,2],13,
        [93,3],[3,2],1,[170,3],[31,2],59,[1,4],[2,2],[2,3],[20,2],[209,3],[8,2],3,[107,2],6,[1,2],1,2,[238,2],[6,4],2,[113,3],[8,2],1,109,[1,2],
        6,[105,2],4,[261,3],9,[248,5],[1,2],4,2,1,[142,3],[8,4],4,84,[29,2],62,407,14,106,7,2,[213,5],[4,2],1,[350,2],[20570,55],[104,2],24948,6],
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

    /** @type {[number, number][]} */
    var biRanges = [];
    for (var cat in breakRanges) {
      var catRanges = breakRanges[cat];
      if (catRanges && catRanges.length) {
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
          var countAndCat = (count << 8) | categoryKey[cat];
          biRanges.push([code, countAndCat]);
          code += count;
          if (repeats) {
            for (var j = 1; j < repeats; j++) {
              code += space;
              biRanges.push([code, countAndCat]);
              code += count;
            }
          }
        }
      }
    }
    biRanges.sort(function (r1, r2) { return r1[0] - r2[0]; });

    var ranges = typeof Uint32Array === 'undefined' || !Uint32Array ? /** @type {Uint32Array} */(/** @type {*} */([])) : new Uint32Array(biRanges.length * 2);
    for (var i = 0; i < biRanges.length; i++) {
      ranges[i * 2] = biRanges[i][0];
      ranges[i * 2 + 1] = biRanges[i][1];
    }

    return ranges;
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

  emojiter.breakCategory = breakCategory;
  emojiter.codePointAt = codePointAt;
  emojiter.emojiter = emojiter;
  emojiter.categoryKey = categoryKey;


  if (typeof module !== 'undefined' && module) {
    if ((require.main || process.mainModule) === /** @type {*} */(module)) {
      var rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
      runInteractive(
        function (callback) { rl.question('', callback); },
        function (str) { rl.write(str); },
        function() {rl.close(); });
    }
    else {
      module.exports = emojiter;
    }
  }
  else if (typeof WScript !== 'undefined' && WScript) {
    if (/cscript(\.exe)?$/.test(WScript.FullName)) {
      var callbacks = []; // flatten recursion
      runInteractive(
        function (callback) { callbacks.push(callback); },
        function (str) { WScript.StdOut.Write(str); },
        function() {}
      );
      while (callbacks.length) {
        callbacks.shift()(WScript.StdIn.ReadLine());
      }
    }
    else { // restart with CSCRIPT
      WScript.CreateObject('WScript.Shell').Run('cscript "' + WScript.ScriptFullName + '"');
    }
  }
  else {
    return emojiter;
  }

  /**
   * @param {(callback: (str: string) => void) => (void | string)} read
   * @param {(str: string) => void} write
   * @param {() => void} close
   */
  function runInteractive(read, write, close) {
    write('Splitting strings in Unicode graphemes. Please type below:\n');
    read(handleRead);

    /**
     * @param {string} str
     */
    function handleRead(str) {
      if (!str) {
        write('Done.');
        close();
        return;
      }

      var chunks = emojiter(str);
      var formatted = ' [' + str.length + '] character' + (str.length === 1 ? '' : 's') + ' -> [' + chunks.length + '] grapheme' + (chunks.length === 1 ? '' : 's') + ': ';
      for (var i = 0; i < chunks.length; i++) {
        var ch = chunks[i];
        formatted += i ? ' [' : '[';
        for (var j = 0; j < ch.length; j++) {
          formatted += j ? ' ' : '';
          if (ch.charCodeAt(j) > 32 && ch.charCodeAt(j) < 128) formatted += '{' + ch.charAt(j) + '}';
          else formatted += '\\u' + (0x10000 + ch.charCodeAt(j)).toString(16).slice(1).toUpperCase();
        }
        formatted += ']';
      }

      write(formatted + '\n');
      read(handleRead);
    }
  }

})();