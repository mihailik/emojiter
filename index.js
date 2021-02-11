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

  }

  var breakRanges = {};

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