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
      for (var i = 0; i < text.length; i++) {
        // TODO: get proper character code, adjust i if needed for multi-chars
        var chCode = text.charCodeAt(i);
      }
    }

    if (!pushable) return result;
  }

  /**
   * Determine the break category of the character.
   * Aut-generated from https://www.unicode.org/Public/13.0.0/ucd/auxiliary/GraphemeBreakProperty.txt
   * @param {number} chCode 
   */
  function breakCategory(chCode) {
    // TODO: bisect through breakRanges
  }

  /** @type {{
   *    [breakCategory: string]: (
   *      number // skip after last character
   *      | ([skipAfterLastCharacter: number, countOfCharacters: number])
   *      | ([skipAfterLastCharacter: number, countOfCharacters: number, spaceBetweenRepeatClusters: number, repeatClusterCount: number])
   *    )[]
   * }} */
  var breakRanges = {
  Prepend: [ // ARABIC NUMBER SIGN...MASARAM GONDI REPHA
    [0x600,6],216,50,467,1132,66415,16,[245,2],1916,2,249,[74,6],701],
  CR: [0xD], // <CR>
  LF: [0xA], // <LF>
  Control: [ // <control-0000>...<reserved-E0FFF>
    [0x0,10],[2,2],[2,18],[96,33],14,1391,4594,2045,[3,2],25,1,[1,5],[50,5],1,[1,10],56976,[241,9],[1,3],[13365,9],[34920,4],[5328,8],
    798342,1,[1,30],[97,128],[241,3600]],
  Extend: [ // COMBINING GRAVE ACCENT...VARIATION SELECTOR-256
    [0x300,112],[276,5],[1,2],[264,45],2,[2,2],[2,2],2,[73,11],[49,21],17,[102,7],[3,6],[3,2],[2,4],36,[31,27],[92,11],[59,9],10,[25,4],
    [2,9],[2,3],[2,5],[44,3],[120,15],[2,32],56,2,[5,8],5,[4,7],[11,2],30,59,2,[3,4],9,10,[11,2],27,[3,2],58,[5,2],[5,2],[3,3],4,[31,2],
    4,[12,2],58,[5,5],[2,2],5,[21,2],[23,6],2,59,2,1,[2,4],9,[8,2],1,[11,2],31,60,2,13,10,41,4,[58,3],[6,3],[2,4],[8,2],[12,2],30,59,3,3,4,
    [6,2],[8,2],[12,2],[29,2],[58,2],2,[3,4],9,10,[11,2],30,73,5,[3,3],2,9,82,[3,7],[13,8],99,[3,9],[12,6],[75,2],28,2,2,[56,14],[2,5],
    [2,2],[6,11],[2,36],10,[103,4],[2,6],[2,2],[3,2],[26,2],[5,3],[17,4],14,[3,2],7,16,[704,3],[947,3],[30,3],[30,2],[31,2],[65,2],
    [2,7],9,[3,11],10,[46,3],[120,2],35,[119,3],[5,2],10,[7,3],[220,2],3,59,[2,7],2,2,[3,8],[7,10],3,[49,14],1,[1,2],[64,4],49,1,[1,5],
    2,6,[41,9],[13,2],[33,4],[3,2],[2,3],57,[2,2],4,[2,3],[59,8],[3,2],[153,3],[2,13],[2,7],5,7,[4,2],[199,58],[2,5],525,[196,13],
    [1,4],1,[1,3],[1,12],[3071,3],142,[97,32],[555,4],[1,2],[106,2],30165,[1,3],[2,10],[33,2],[81,2],273,4,5,[26,2],6,[152,2],[27,18],
    14,[39,8],[26,11],[47,3],49,[3,4],[3,2],40,[68,6],[3,2],[3,2],13,9,48,52,[2,3],[3,2],[6,2],2,[43,2],9,239,3,5,20273,[738,16],[17,16],
    [367,2],606,227,[150,5],[1671,3],[2,2],[6,4],[41,3],5,[166,2],[574,4],[388,2],[154,11],177,[55,15],[57,3],[50,4],[3,2],[70,3],
    [37,5],[2,8],63,[13,2],[53,9],[11,4],3,[96,3],3,[2,2],7,161,[4,8],[22,2],[58,2],2,2,23,[15,7],[4,5],[196,8],[3,3],2,24,82,[3,6],
    2,3,[2,2],[2,2],236,[3,4],[7,2],[2,2],[28,2],[86,8],3,[2,2],107,2,[3,6],2,[102,3],[3,4],[2,5],[260,9],[2,2],246,[11,2],2,5,[145,4],
    [3,2],5,[33,10],[41,6],[3,4],9,[10,6],[3,3],[47,13],[2,2],[407,7],[2,6],2,[83,22],[3,7],[2,2],[2,2],[123,6],4,[2,2],[2,7],2,[73,2],
    4,2,[348,2],[19452,5],[60,7],1049,[64,4],82,[19641,2],5319,[2,3],[5,5],[9,8],[3,7],[31,4],[149,3],[1980,55],[5,50],9,15,[23,5],
    [2,15],[1361,7],[2,17],[3,7],[2,2],[2,5],[262,7],[438,4],[1505,7],[110,7],[2737,5],[789537,96],[129,240]],
  Regional_Indicator: [[0x1F1E6,26]], // REGIONAL INDICATOR SYMBOL LETTER A...REGIONAL INDICATOR SYMBOL LETTER Z
  SpacingMark: [ // DEVANAGARI SIGN VISARGA...MUSICAL SYMBOL COMBINING AUGMENTATION DOT
    0x903,56,[3,3],[9,4],[2,2],[51,2],[60,2],[7,2],[3,2],55,[59,3],67,[59,3],9,[2,2],[54,2],61,[7,2],[3,2],115,[2,2],[4,3],[2,3],[53,3],
    [62,4],[62,2],59,[2,2],[2,2],[3,2],[2,2],[55,2],[60,2],[6,3],[2,3],[54,2],[77,2],[7,7],[20,2],64,128,[139,2],64,178,[10,2],[26,2],
    45,1842,[8,8],[2,2],[347,4],[3,3],[5,2],[2,6],[225,2],59,2,[22,6],146,55,[2,5],[2,2],62,31,[5,2],3,61,[3,3],2,[4,2],[49,8],[9,2],
    172,22,[35628,2],3,[89,2],[51,16],[143,2],48,[49,2],[5,2],[3,3],[111,2],[3,2],25,158,[3,2],6,[238,2, 2,3],2,25620,2,128,[46,3],
    [5,2],116,[25,2],60,[49,3],[10,2],14,[94,3],[4,2],2,[171,3],[32,2],60,[2,4],[3,2],[3,3],[21,2],[210,3],[9,2],4,[108,2],7,[2,2],
    2,3,[239,2],[7,4],3,[114,3],[9,2],2,110,[2,2],7,[106,2],5,[262,3],10,[249,5],[2,2],5,3,2,[143,3],[9,4],5,85,[30,2],63,408,15,107,8,3,
    [214,5],[5,2],2,[351,2],[20571,55],[105,2],24949,7],
  L: [ // HANGUL CHOSEONG KIYEOK...HANGUL CHOSEONG SSANGYEORINHIEUH
    [0x1100,96],[38913,29]],
  V: [ // HANGUL JUNGSEONG FILLER...HANGUL JUNGSEONG ARAEA-E
    [0x1160,72],[50697,23]],
  T: [ // HANGUL JONGSEONG KIYEOK...HANGUL JONGSEONG PHIEUPH-THIEUTH
    [0x11A8,88],[50636,49]],
  LV: [[0xAC00,1, 28,399]], // HANGUL SYLLABLE GA...HANGUL SYLLABLE HI
  LVT: [[0xAC01,27, 2,399]], // HANGUL SYLLABLE GAG...HANGUL SYLLABLE HIH
  ZWJ: [0x200D] // ZERO WIDTH JOINER
};

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