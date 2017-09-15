(function () {
'use strict';

var i;
var stack = [];

function h(tag, data) {
  var arguments$1 = arguments;

  var node;
  var children = [];

  for (i = arguments.length; i-- > 2; ) {
    stack.push(arguments$1[i]);
  }

  while (stack.length) {
    if (Array.isArray((node = stack.pop()))) {
      for (i = node.length; i--; ) {
        stack.push(node[i]);
      }
    } else if (node != null && node !== true && node !== false) {
      if (typeof node === "number") {
        node = node + "";
      }
      children.push(node);
    }
  }

  return typeof tag === "string"
    ? {
        tag: tag,
        data: data || {},
        children: children
      }
    : tag(data, children)
}

var globalInvokeLaterStack = [];

function app(props) {
  var appState;
  var appView = props.view;
  var appActions = {};
  var appEvents = {};
  var appMixins = props.mixins || [];
  var appRoot = props.root || document.body;
  var element;
  var oldNode;
  var renderLock;

  appMixins.concat(props).map(function(mixin) {
    mixin = typeof mixin === "function" ? mixin(emit) : mixin;

    Object.keys(mixin.events || []).map(function(key) {
      appEvents[key] = (appEvents[key] || []).concat(mixin.events[key]);
    });

    appState = merge(appState, mixin.state);
    initialize(appActions, mixin.actions);
  });

  requestRender(
    (oldNode = emit("load", (element = appRoot.children[0]))) === element &&
      (oldNode = element = null)
  );

  return emit

  function initialize(actions, withActions, lastName) {
    Object.keys(withActions || []).map(function(key) {
      var action = withActions[key];
      var name = lastName ? lastName + "." + key : key;

      if (typeof action === "function") {
        actions[key] = function(data) {
          emit("action", { name: name, data: data });

          var result = emit("resolve", action(appState, appActions, data));

          return typeof result === "function" ? result(update) : update(result)
        };
      } else {
        initialize(actions[key] || (actions[key] = {}), action, name);
      }
    });
  }

  function render(cb) {
    element = patch(
      appRoot,
      element,
      oldNode,
      (oldNode = emit("render", appView)(appState, appActions)),
      (renderLock = !renderLock)
    );
    while ((cb = globalInvokeLaterStack.pop())) { cb(); }
  }

  function requestRender() {
    if (appView && !renderLock) {
      requestAnimationFrame(render, (renderLock = !renderLock));
    }
  }

  function update(withState) {
    if (typeof withState === "function") {
      return update(withState(appState))
    }
    if (withState && (withState = emit("update", merge(appState, withState)))) {
      requestRender((appState = withState));
    }
    return appState
  }

  function emit(name, data) {
    return (
      (appEvents[name] || []).map(function(cb) {
        var result = cb(appState, appActions, data);
        if (result != null) {
          data = result;
        }
      }),
      data
    )
  }

  function merge(a, b) {
    var obj = {};

    for (var i in a) {
      obj[i] = a[i];
    }

    for (var i in b) {
      obj[i] = b[i];
    }

    return obj
  }

  function getKey(node) {
    if (node && (node = node.data)) {
      return node.key
    }
  }

  function createElement(node, isSVG) {
    if (typeof node === "string") {
      var element = document.createTextNode(node);
    } else {
      var element = (isSVG = isSVG || node.tag === "svg")
        ? document.createElementNS("http://www.w3.org/2000/svg", node.tag)
        : document.createElement(node.tag);

      if (node.data && node.data.oncreate) {
        globalInvokeLaterStack.push(function() {
          node.data.oncreate(element);
        });
      }

      for (var i in node.data) {
        setData(element, i, node.data[i]);
      }

      for (var i = 0; i < node.children.length; ) {
        element.appendChild(createElement(node.children[i++], isSVG));
      }
    }

    return element
  }

  function setData(element, name, value, oldValue) {
    if (name === "key") {
    } else if (name === "style") {
      for (var i in merge(oldValue, (value = value || {}))) {
        element.style[i] = value[i] || "";
      }
    } else {
      try {
        element[name] = value;
      } catch (_) {}

      if (typeof value !== "function") {
        if (value) {
          element.setAttribute(name, value);
        } else {
          element.removeAttribute(name);
        }
      }
    }
  }

  function updateElement(element, oldData, data) {
    for (var i in merge(oldData, data)) {
      var value = data[i];
      var oldValue = i === "value" || i === "checked" ? element[i] : oldData[i];

      if (value !== oldValue) {
        setData(element, i, value, oldValue);
      }
    }

    if (data && data.onupdate) {
      globalInvokeLaterStack.push(function() {
        data.onupdate(element, oldData);
      });
    }
  }

  function removeElement(parent, element, data) {
    if (data && data.onremove) {
      data.onremove(element);
    } else {
      parent.removeChild(element);
    }
  }

  function patch(parent, element, oldNode, node, isSVG, nextSibling) {
    if (oldNode == null) {
      element = parent.insertBefore(createElement(node, isSVG), element);
    } else if (node.tag != null && node.tag === oldNode.tag) {
      updateElement(element, oldNode.data, node.data);

      isSVG = isSVG || node.tag === "svg";

      var len = node.children.length;
      var oldLen = oldNode.children.length;
      var oldKeyed = {};
      var oldElements = [];
      var keyed = {};

      for (var i = 0; i < oldLen; i++) {
        var oldElement = (oldElements[i] = element.childNodes[i]);
        var oldChild = oldNode.children[i];
        var oldKey = getKey(oldChild);

        if (null != oldKey) {
          oldKeyed[oldKey] = [oldElement, oldChild];
        }
      }

      var i = 0;
      var j = 0;

      while (j < len) {
        var oldElement = oldElements[i];
        var oldChild = oldNode.children[i];
        var newChild = node.children[j];

        var oldKey = getKey(oldChild);
        if (keyed[oldKey]) {
          i++;
          continue
        }

        var newKey = getKey(newChild);

        var keyedNode = oldKeyed[newKey] || [];

        if (null == newKey) {
          if (null == oldKey) {
            patch(element, oldElement, oldChild, newChild, isSVG);
            j++;
          }
          i++;
        } else {
          if (oldKey === newKey) {
            patch(element, keyedNode[0], keyedNode[1], newChild, isSVG);
            i++;
          } else if (keyedNode[0]) {
            element.insertBefore(keyedNode[0], oldElement);
            patch(element, keyedNode[0], keyedNode[1], newChild, isSVG);
          } else {
            patch(element, oldElement, null, newChild, isSVG);
          }

          j++;
          keyed[newKey] = newChild;
        }
      }

      while (i < oldLen) {
        var oldChild = oldNode.children[i];
        var oldKey = getKey(oldChild);
        if (null == oldKey) {
          removeElement(element, oldElements[i], oldChild.data);
        }
        i++;
      }

      for (var i in oldKeyed) {
        var keyedNode = oldKeyed[i];
        var reusableNode = keyedNode[1];
        if (!keyed[reusableNode.data.key]) {
          removeElement(element, keyedNode[0], reusableNode.data);
        }
      }
    } else if (element && node !== element.nodeValue) {
      if (typeof node === "string" && typeof oldNode === "string") {
        element.nodeValue = node;
      } else {
        element = parent.insertBefore(
          createElement(node, isSVG),
          (nextSibling = element)
        );
        removeElement(parent, nextSibling, oldNode.data);
      }
    }

    return element
  }
}

'use strict';

// util
function fillStr (s, num) { return Array(num + 1).join(s) }
function isNum (x) { return typeof x === 'number' }
function midiToFreq (midi, tuning) {
  return Math.pow(2, (midi - 69) / 12) * (tuning || 440)
}

var REGEX = /^([a-gA-G])(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)\s*$/;
/**
 * A regex for matching note strings in scientific notation.
 *
 * @name regex
 * @function
 * @return {RegExp} the regexp used to parse the note name
 *
 * The note string should have the form `letter[accidentals][octave][element]`
 * where:
 *
 * - letter: (Required) is a letter from A to G either upper or lower case
 * - accidentals: (Optional) can be one or more `b` (flats), `#` (sharps) or `x` (double sharps).
 * They can NOT be mixed.
 * - octave: (Optional) a positive or negative integer
 * - element: (Optional) additionally anything after the duration is considered to
 * be the element name (for example: 'C2 dorian')
 *
 * The executed regex contains (by array index):
 *
 * - 0: the complete string
 * - 1: the note letter
 * - 2: the optional accidentals
 * - 3: the optional octave
 * - 4: the rest of the string (trimmed)
 *
 * @example
 * var parser = require('note-parser')
 * parser.regex.exec('c#4')
 * // => ['c#4', 'c', '#', '4', '']
 * parser.regex.exec('c#4 major')
 * // => ['c#4major', 'c', '#', '4', 'major']
 * parser.regex().exec('CMaj7')
 * // => ['CMaj7', 'C', '', '', 'Maj7']
 */


var SEMITONES = [0, 2, 4, 5, 7, 9, 11];
/**
 * Parse a note name in scientific notation an return it's components,
 * and some numeric properties including midi number and frequency.
 *
 * @name parse
 * @function
 * @param {String} note - the note string to be parsed
 * @param {Boolean} isTonic - true the strings it's supposed to contain a note number
 * and some category (for example an scale: 'C# major'). It's false by default,
 * but when true, en extra tonicOf property is returned with the category ('major')
 * @param {Float} tunning - The frequency of A4 note to calculate frequencies.
 * By default it 440.
 * @return {Object} the parsed note name or null if not a valid note
 *
 * The parsed note name object will ALWAYS contains:
 * - letter: the uppercase letter of the note
 * - acc: the accidentals of the note (only sharps or flats)
 * - pc: the pitch class (letter + acc)
 * - step: s a numeric representation of the letter. It's an integer from 0 to 6
 * where 0 = C, 1 = D ... 6 = B
 * - alt: a numeric representation of the accidentals. 0 means no alteration,
 * positive numbers are for sharps and negative for flats
 * - chroma: a numeric representation of the pitch class. It's like midi for
 * pitch classes. 0 = C, 1 = C#, 2 = D ... 11 = B. Can be used to find enharmonics
 * since, for example, chroma of 'Cb' and 'B' are both 11
 *
 * If the note has octave, the parser object will contain:
 * - oct: the octave number (as integer)
 * - midi: the midi number
 * - freq: the frequency (using tuning parameter as base)
 *
 * If the parameter `isTonic` is set to true, the parsed object will contain:
 * - tonicOf: the rest of the string that follows note name (left and right trimmed)
 *
 * @example
 * var parse = require('note-parser').parse
 * parse('Cb4')
 * // => { letter: 'C', acc: 'b', pc: 'Cb', step: 0, alt: -1, chroma: -1,
 *         oct: 4, midi: 59, freq: 246.94165062806206 }
 * // if no octave, no midi, no freq
 * parse('fx')
 * // => { letter: 'F', acc: '##', pc: 'F##', step: 3, alt: 2, chroma: 7 })
 */
function parse (str, isTonic, tuning) {
  if (typeof str !== 'string') { return null }
  var m = REGEX.exec(str);
  if (!m || (!isTonic && m[4])) { return null }

  var p = { letter: m[1].toUpperCase(), acc: m[2].replace(/x/g, '##') };
  p.pc = p.letter + p.acc;
  p.step = (p.letter.charCodeAt(0) + 3) % 7;
  p.alt = p.acc[0] === 'b' ? -p.acc.length : p.acc.length;
  var pos = SEMITONES[p.step] + p.alt;
  p.chroma = pos < 0 ? 12 + pos : pos % 12;
  if (m[3]) { // has octave
    p.oct = +m[3];
    p.midi = pos + 12 * (p.oct + 1);
    p.freq = midiToFreq(p.midi, tuning);
  }
  if (isTonic) { p.tonicOf = m[4]; }
  return p
}

var LETTERS = 'CDEFGAB';
function accStr (n) { return !isNum(n) ? '' : n < 0 ? fillStr('b', -n) : fillStr('#', n) }
function octStr (n) { return !isNum(n) ? '' : '' + n }

/**
 * Create a string from a parsed object or `step, alteration, octave` parameters
 * @param {Object} obj - the parsed data object
 * @return {String} a note string or null if not valid parameters
 * @since 1.2
 * @example
 * parser.build(parser.parse('cb2')) // => 'Cb2'
 *
 * @example
 * // it accepts (step, alteration, octave) parameters:
 * parser.build(3) // => 'F'
 * parser.build(3, -1) // => 'Fb'
 * parser.build(3, -1, 4) // => 'Fb4'
 */
function build (s, a, o) {
  if (s === null || typeof s === 'undefined') { return null }
  if (s.step) { return build(s.step, s.alt, s.oct) }
  if (s < 0 || s > 6) { return null }
  return LETTERS.charAt(s) + accStr(a) + octStr(o)
}

/**
 * Get midi of a note
 *
 * @name midi
 * @function
 * @param {String|Integer} note - the note name or midi number
 * @return {Integer} the midi number of the note or null if not a valid note
 * or the note does NOT contains octave
 * @example
 * var parser = require('note-parser')
 * parser.midi('A4') // => 69
 * parser.midi('A') // => null
 * @example
 * // midi numbers are bypassed (even as strings)
 * parser.midi(60) // => 60
 * parser.midi('60') // => 60
 */


/**
 * Get freq of a note in hertzs (in a well tempered 440Hz A4)
 *
 * @name freq
 * @function
 * @param {String} note - the note name or note midi number
 * @param {String} tuning - (Optional) the A4 frequency (440 by default)
 * @return {Float} the freq of the number if hertzs or null if not valid note
 * @example
 * var parser = require('note-parser')
 * parser.freq('A4') // => 440
 * parser.freq('A') // => null
 * @example
 * // can change tuning (440 by default)
 * parser.freq('A4', 444) // => 444
 * parser.freq('A3', 444) // => 222
 * @example
 * // it accepts midi numbers (as numbers and as strings)
 * parser.freq(69) // => 440
 * parser.freq('69', 442) // => 442
 */

// shorthand tonal notation (with quality after number)
var IVL_TNL = '([-+]?)(\\d+)(d{1,4}|m|M|P|A{1,4})';
// standard shorthand notation (with quality before number)
var IVL_STR = '(AA|A|P|M|m|d|dd)([-+]?)(\\d+)';
var COMPOSE = '(?:(' + IVL_TNL + ')|(' + IVL_STR + '))';
var IVL_REGEX = new RegExp('^' + COMPOSE + '$');

/**
 * Parse a string with an interval in shorthand notation (https://en.wikipedia.org/wiki/Interval_(music)#Shorthand_notation)
 * and returns an object with interval properties.
 *
 * @param {String} str - the string with the interval
 * @param {Boolean} strict - (Optional) if its false, it doesn't check if the
 * interval is valid or not. For example, parse('P2') returns null
 * (because a perfect second is not a valid interval), but
 * parse('P2', false) it returns { num: 2, dir: 1, q: 'P'... }
 * @return {Object} an object properties or null if not valid interval string
 * The returned object contains:
 * - `num`: the interval number
 * - `q`: the interval quality string (M is major, m is minor, P is perfect...)
 * - `simple`: the simplified number (from 1 to 7)
 * - `dir`: the interval direction (1 ascending, -1 descending)
 * - `type`: the interval type (P is perfectable, M is majorable)
 * - `alt`: the alteration, a numeric representation of the quality
 * - `oct`: the number of octaves the interval spans. 0 for simple intervals.
 * - `size`: the size of the interval in semitones
 * @example
 * var parse = require('interval-notation').parse
 * parse('M3')
 * // => { num: 3, q: 'M', dir: 1, simple: 3,
 * //      type: 'M', alt: 0, oct: 0, size: 4 }
 */
function parse$1 (str, strict) {
  if (typeof str !== 'string') { return null }
  var m = IVL_REGEX.exec(str);
  if (!m) { return null }
  var i = { num: +(m[3] || m[8]), q: m[4] || m[6] };
  i.dir = (m[2] || m[7]) === '-' ? -1 : 1;
  var step = (i.num - 1) % 7;
  i.simple = step + 1;
  i.type = TYPES[step];
  i.alt = qToAlt(i.type, i.q);
  i.oct = Math.floor((i.num - 1) / 7);
  i.size = i.dir * (SIZES[step] + i.alt + 12 * i.oct);
  if (strict !== false) {
    if (i.type === 'M' && i.q === 'P') { return null }
  }
  return i
}
var SIZES = [0, 2, 4, 5, 7, 9, 11];

var TYPES = 'PMMPPMM';
/**
 * Get the type of interval. Can be perfectavle ('P') or majorable ('M')
 * @param {Integer} num - the interval number
 * @return {String} `P` if it's perfectable, `M` if it's majorable.
 */
function type (num) {
  return TYPES[(num - 1) % 7]
}


/**
 * Build a special shorthand interval notation string from properties.
 * The special shorthand interval notation changes the order or the standard
 * shorthand notation so instead of 'M-3' it returns '-3M'.
 *
 * The standard shorthand notation has a string 'A4' (augmented four) that can't
 * be differenciate from 'A4' (the A note in 4th octave), so the purpose of this
 * notation is avoid collisions
 *
 * @param {Integer} simple - the interval simple number (from 1 to 7)
 * @param {Integer} alt - the quality expressed in numbers. 0 means perfect
 * or major, depending of the interval number.
 * @param {Integer} oct - the number of octaves the interval spans.
 * 0 por simple intervals. Positive number.
 * @param {Integer} dir - the interval direction: 1 ascending, -1 descending.
 * @example
 * var interval = require('interval-notation')
 * interval.build(3, 0, 0, 1) // => '3M'
 * interval.build(3, -1, 0, -1) // => '-3m'
 * interval.build(3, 1, 1, 1) // => '10A'
 */


/**
 * Get an alteration number from an interval quality string.
 * It accepts the standard `dmMPA` but also sharps and flats.
 *
 * @param {Integer|String} num - the interval number or a string representing
 * the interval type ('P' or 'M')
 * @param {String} quality - the quality string
 * @return {Integer} the interval alteration
 * @example
 * qToAlt('M', 'm') // => -1 (for majorables, 'm' is -1)
 * qToAlt('P', 'A') // => 1 (for perfectables, 'A' means 1)
 * qToAlt('M', 'P') // => null (majorables can't be perfect)
 */
function qToAlt (num, q) {
  var t = typeof num === 'number' ? type(num) : num;
  if (q === 'M' && t === 'M') { return 0 }
  if (q === 'P' && t === 'P') { return 0 }
  if (q === 'm' && t === 'M') { return -1 }
  if (/^A+$/.test(q)) { return q.length }
  if (/^d+$/.test(q)) { return t === 'P' ? -q.length : -q.length - 1 }
  return null
}

function fillStr$1 (s, n) { return Array(Math.abs(n) + 1).join(s) }
/**
 * Get interval quality from interval type and alteration
 *
 * @function
 * @param {Integer|String} num - the interval number of the the interval
 * type ('M' for majorables, 'P' for perfectables)
 * @param {Integer} alt - the interval alteration
 * @return {String} the quality string
 * @example
 * altToQ('M', 0) // => 'M'
 */
function altToQ (num, alt) {
  var t = typeof num === 'number' ? type(Math.abs(num)) : num;
  if (alt === 0) { return t === 'M' ? 'M' : 'P' }
  else if (alt === -1 && t === 'M') { return 'm' }
  else if (alt > 0) { return fillStr$1('A', alt) }
  else if (alt < 0) { return fillStr$1('d', t === 'P' ? alt : alt + 1) }
  else { return null }
}

/**
 * Functions to encoding and decoding pitches into fifths/octaves notation.
 *
 * This functions are very low level and it's probably you wont need them.
 * @private
 * @module encoding
 */

function isNum$1(n) {
  return typeof n === "number";
}

// Map from letter step to number of fifths starting from 'C':
// { C: 0, D: 2, E: 4, F: -1, G: 1, A: 3, B: 5 }
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
// Given a number of fifths, return the octaves they span
function fOcts(f) {
  return Math.floor(f * 7 / 12);
}
// Get the number of octaves it span each step
var FIFTH_OCTS = FIFTHS.map(fOcts);

/**
 * Given a note's step, alteration and octave returns the fiths/octave
 * note encoding.
 * @param {number} step - the step number (0 = C, 1 = D, ...)
 * @param {number} alteration - the note alteration (..., -1 = 'b', 0 = '', 1 = '#', ...)
 * @param {number} octave - the note octave
 * @return {Array} the [fifths, octave] representation of that note
 */
function encode$2(step, alt, oct) {
  var f = FIFTHS[step] + 7 * alt;
  if (!isNum$1(oct)) { return [f]; }
  var o = oct - FIFTH_OCTS[step] - 4 * alt;
  return [f, o];
}

// Return the number of fifths as if it were unaltered
function unaltered(f) {
  var i = (f + 1) % 7;
  return i < 0 ? 7 + i : i;
}

// We need to get the steps from fifths
// Fifths for CDEFGAB are [ 0, 2, 4, -1, 1, 3, 5 ]
// We add 1 to fifths to avoid negative numbers, so:
// for ['F', 'C', 'G', 'D', 'A', 'E', 'B'] we have:
var STEPS = [3, 0, 4, 1, 5, 2, 6];

/**
 * Decode a encoded pitch
 * @param {Number} fifths - the number of fifths
 * @param {Number} octs - the number of octaves to compensate the fifhts
 * @return {Array} in the form [step, alt, oct]
 */
function decode$2(f, o) {
  var step = STEPS[unaltered(f)];
  var alt = Math.floor((f + 1) / 7);
  if (!isNum$1(o)) { return [step, alt]; }
  var oct = o + 4 * alt + FIFTH_OCTS[step];
  return [step, alt, oct];
}

/**
 * Functions to deal with pitches (either notes or intervals).
 *
 * This functions are very low level and more developer friendly of this functions
 * are exposed in the note and interval packages. It's unlikely you need them.
 * That's why __this module is NOT exported in the tonal package__.
 *
 * @private
 * @module pitch
 */
function pitch(fifths, focts, dir) {
  return dir ? ["tnlp", [fifths, focts], dir] : ["tnlp", [fifths, focts]];
}
/**
 * Test if an object is a pitch
 * @param {Pitch}
 * @return {Boolean}
 */
function isPitch(p) {
  return Array.isArray(p) && p[0] === "tnlp";
}
/**
 * Encode a pitch
 * @param {Integer} step
 * @param {Integer} alt
 * @param {Integer} oct
 * @param {Integer} dir - (Optional)
 */
function encode$1(s, a, o, dir) {
  return dir ? ["tnlp", encode$2(s, a, o), dir] : ["tnlp", encode$2(s, a, o)];
}

/**
 * Decode a pitch
 * @param {Pitch} the pitch
 * @return {Array} An array with [step, alt, oct]
 */
function decode$1(p) {
  return decode$2.apply(null, p[1]);
}

/**
 * Get pitch type
 * @param {Pitch}
 * @return {String} 'ivl' or 'note' or null if not a pitch
 */
function pType(p) {
  return !isPitch(p) ? null : p[2] ? "ivl" : "note";
}
/**
 * Test if is a pitch note (with or without octave)
 * @param {Pitch}
 * @return {Boolean}
 */
function isNotePitch(p) {
  return pType(p) === "note";
}
/**
 * Test if is an interval
 * @param {Pitch}
 * @return {Boolean}
 */
function isIvlPitch(p) {
  return pType(p) === "ivl";
}
/**
 * Test if is a pitch class (a pitch note without octave)
 * @param {Pitch}
 * @return {Boolean}
 */
function isPC(p) {
  return isPitch(p) && p[1].length === 1;
}

/**
 * Get direction of a pitch (even for notes)
 * @param {Pitch}
 * @return {Integer} 1 or -1
 */
function dir(p) {
  return p[2] === -1 ? -1 : 1;
}

/**
 * Get encoded fifths from pitch.
 * @param {Pitch}
 * @return {Integer}
 */
function fifths(p) {
  return p[2] === -1 ? -p[1][0] : p[1][0];
}
/**
 * Get encoded octaves from pitch.
 * @param {Pitch}
 * @return {Integer}
 */
function focts(p) {
  return p[2] === -1 ? -p[1][1] : p[1][1];
}
/**
 * Get height of a pitch.
 * @param {Pitch}
 * @return {Integer}
 */
function height(p) {
  return fifths(p) * 7 + focts(p) * 12;
}

/**
 * Get chroma of a pitch. The chroma is a number between 0 and 11 to represent
 * the position of a pitch inside an octave. Is the numeric equivlent of a
 * pitch class.
 *
 * @param {Pitch}
 * @return {Integer}
 */
function chr(p) {
  var f = fifths(p);
  return 7 * f - 12 * Math.floor(f * 7 / 12);
}

// memoize parsers
function memoize(fn) {
  var cache = {};
  return function(str) {
    if (typeof str !== "string") { return null; }
    return cache[str] || (cache[str] = fn(str));
  };
}

/**
 * Parse a note
 * @function
 * @param {String} str
 * @return {Pitch} the pitch or null if not valid note string
 */
var parseNote = memoize(function(s) {
  var p = parse(s);
  return p ? encode$1(p.step, p.alt, p.oct) : null;
});

/**
 * Parse an interval
 * @function
 * @param {String} str
 * @return {Pitch} the pitch or null if not valid interval string
 */
var parseIvl = memoize(function(s) {
  var p = parse$1(s);
  if (!p) { return null; }
  return p ? encode$1(p.simple - 1, p.alt, p.oct, p.dir) : null;
});

/**
 * Parse a note or an interval
 * @param {String} str
 * @return {Pitch} the pitch or null if not valid pitch string
 */
function parsePitch(s) {
  return parseNote(s) || parseIvl(s);
}

/**
 * Ensure the given object is a note pitch. If is a string, it will be
 * parsed. If not a note pitch or valid note string, it returns null.
 * @param {Pitch|String}
 * @return {Pitch}
 */
function asNotePitch(p) {
  return isNotePitch(p) ? p : parseNote(p);
}
/**
 * Ensure the given object is a interval pitch. If is a string, it will be
 * parsed. If not a interval pitch or valid interval string, it returns null.
 * @param {Pitch|String}
 * @return {Pitch}
 */
function asIvlPitch(p) {
  return isIvlPitch(p) ? p : parseIvl(p);
}
/**
 * Ensure the given object is a pitch. If is a string, it will be
 * parsed. If not a pitch or valid pitch string, it returns null.
 * @param {Pitch|String}
 * @return {Pitch}
 */
function asPitch(p) {
  return isPitch(p) ? p : parsePitch(p);
}

/**
 * Convert a note pitch to string representation
 * @param {Pitch}
 * @return {String}
 */
function strNote(p) {
  if (!isNotePitch(p)) { return null; }
  return build.apply(null, decode$1(p));
}

/**
 * Convert a interval pitch to string representation
 * @param {Pitch}
 * @return {String}
 */
function strIvl(p) {
  if (!isIvlPitch(p)) { return null; }
  // decode to [step, alt, oct]
  var d = decode$1(p);
  // d = [step, alt, oct]
  var num = d[0] + 1 + 7 * d[2];
  return p[2] * num + altToQ(num, d[1]);
}

/**
 * Convert a pitch to string representation (either notes or intervals)
 * @param {Pitch}
 * @return {String}
 */
function strPitch(p) {
  return strNote(p) || strIvl(p);
}

// A function that creates a decorator
// The returned function can _decorate_ other functions to parse and build
// string representations
function decorator(is, parse$$1, str) {
  return function(fn) {
    return function(v) {
      var i = is(v);
      // if the value is in pitch notation no conversion
      if (i) { return fn(v); }
      // else parse the pitch
      var p = parse$$1(v);
      // if parsed, apply function and back to string
      return p ? str(fn(p)) : null;
    };
  };
}

/**
 * Decorate a function to work internally with note pitches, even if the
 * parameters are provided as strings. Also it converts back the result
 * to string if a note pitch is returned.
 * @function
 * @param {Function} fn
 * @return {Function} the decorated function
 */
var noteFn = decorator(isNotePitch, parseNote, strNote);
/**
 * Decorate a function to work internally with interval pitches, even if the
 * parameters are provided as strings. Also it converts back the result
 * to string if a interval pitch is returned.
 * @function
 * @param {Function} fn
 * @return {Function} the decorated function
 */
var ivlFn = decorator(isIvlPitch, parseIvl, strIvl);
/**
 * Decorate a function to work internally with pitches, even if the
 * parameters are provided as strings. Also it converts back the result
 * to string if a pitch is returned.
 * @function
 * @param {Function} fn
 * @return {Function} the decorated function
 */
var pitchFn = decorator(isPitch, parsePitch, strPitch);


var pitch$1 = Object.freeze({
	pitch: pitch,
	isPitch: isPitch,
	encode: encode$1,
	decode: decode$1,
	pType: pType,
	isNotePitch: isNotePitch,
	isIvlPitch: isIvlPitch,
	isPC: isPC,
	dir: dir,
	fifths: fifths,
	focts: focts,
	height: height,
	chr: chr,
	parseNote: parseNote,
	parseIvl: parseIvl,
	parsePitch: parsePitch,
	asNotePitch: asNotePitch,
	asIvlPitch: asIvlPitch,
	asPitch: asPitch,
	strNote: strNote,
	strIvl: strIvl,
	strPitch: strPitch,
	noteFn: noteFn,
	ivlFn: ivlFn,
	pitchFn: pitchFn
});

/**
 * This module deals with note transposition. Just two functions: `transpose`
 * to transpose notes by any interval (or intervals by intervals) and `trFifths`
 * to transpose notes by fifths.
 *
 * @example
 * var tonal = require('tonal')
 * tonal.transpose('C3', 'P5') // => 'G3'
 * tonal.transpose('m2', 'P4') // => '5d'
 * tonal.trFifths('C', 2) // => 'D'
 *
 * @module transpose
 */
function trBy(i, p) {
  var t = pType(p);
  if (!t) { return null; }
  var f = fifths(i) + fifths(p);
  if (isPC(p)) { return ["tnlp", [f]]; }
  var o = focts(i) + focts(p);
  if (t === "note") { return ["tnlp", [f, o]]; }
  var d = height(i) + height(p) < 0 ? -1 : 1;
  return ["tnlp", [d * f, d * o], d];
}

/**
 * Transpose notes. Can be used to add intervals. At least one of the parameter
 * is expected to be an interval. If not, it returns null.
 *
 * @param {String|Pitch} a - a note or interval
 * @param {String|Pitch} b - a note or interavl
 * @return {String|Pitch} the transposed pitch or null if not valid parameters
 * @example
 * var _ = require('tonal')
 * // transpose a note by an interval
 * _.transpose('d3', '3M') // => 'F#3'
 * // transpose intervals
 * _.transpose('3m', '5P') // => '7m'
 * // it works with pitch classes
 * _.transpose('d', '3M') // => 'F#'
 * // order or parameters is irrelevant
 * _.transpose('3M', 'd3') // => 'F#3'
 * // can be partially applied
 * _.map(_.transpose('3M'), 'c d e f g') // => ['E', 'F#', 'G#', 'A', 'B']
 */
function transpose(a, b) {
  if (arguments.length === 1)
    { return function(b) {
      return transpose(a, b);
    }; }
  var pa = asPitch(a);
  var pb = asPitch(b);
  var r = isIvlPitch(pa) ? trBy(pa, pb) : isIvlPitch(pb) ? trBy(pb, pa) : null;
  return a === pa && b === pb ? r : strPitch(r);
}

/**
 * Transpose a tonic a number of perfect fifths. It can be partially applied.
 *
 * @function
 * @param {Pitch|String} tonic
 * @param {Integer} number - the number of times
 * @return {String|Pitch} the transposed note
 * @example
 * import { trFifths } from 'tonal-transpose'
 * [0, 1, 2, 3, 4].map(trFifths('C')) // => ['C', 'G', 'D', 'A', 'E']
 * // or using tonal
 * tonal.trFifths('G4', 1) // => 'D5'
 */
function trFifths(t, n) {
  if (arguments.length > 1) { return trFifths(t)(n); }
  return function(n) {
    return transpose(t, pitch(n, 0, 1));
  };
}


var transpose$1 = Object.freeze({
	transpose: transpose,
	trFifths: trFifths
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-distance.svg)](https://www.npmjs.com/package/tonal-distance)
 * [![tonal](https://img.shields.io/badge/tonal-distance-yellow.svg)](https://github.com/danigb/tonal/tree/master/packages/tonal/distance)
 * 
 * Transpose notes by intervals and find distances between notes
 *
 * @example
 * // using ES6 import
 * import { interval, semitones, transpose } from 'tonal-distance'
 * semitones('C' ,'D') // => 2
 * interval('C4', 'G4') // => '5P'
 * transpose('C4', 'P5') // => 'G4'
 *
 * // included in tonal facade
 * const tonal = require('tonal');
 * tonal.distance.transpose('C4', 'P5')
 * tonal.distance.transposeBy('P5', 'C4')
 * 
 * @module distance
 */
function trBy$1(i, p) {
  var t = pType(p);
  if (!t) { return null; }
  var f = fifths(i) + fifths(p);
  if (isPC(p)) { return ["tnlp", [f]]; }
  var o = focts(i) + focts(p);
  if (t === "note") { return ["tnlp", [f, o]]; }
  var d = height(i) + height(p) < 0 ? -1 : 1;
  return ["tnlp", [d * f, d * o], d];
}

/**
 * Transpose a note by an interval. The note can be a pitch class.
 * 
 * This function can be partially applied.
 * 
 * @param {String} note
 * @param {String} interval
 * @return {String} the transposed note
 * @example
 * import { tranpose } from 'tonal-distance'
 * transpose('d3', '3M') // => 'F#3'
 * // it works with pitch classes
 * transpose('D', '3M') // => 'F#'
 * // can be partially applied
 * ['C', 'D', 'E', 'F', 'G'].map(transpose('M3)) // => ['E', 'F#', 'G#', 'A', 'B']
 */
function transpose$2(note, interval) {
  if (arguments.length === 1) { return function (i) { return transpose$2(note, i); }; }
  var n = asPitch(note);
  var i = asPitch(interval);
  return n && i ? strPitch(trBy$1(i, n)) : null;
}

/**
 * The same as transpose with the arguments inverted.
 * 
 * Can be partially applied.
 * 
 * @param {String} note
 * @param {String} interval
 * @return {String} the transposed note
 * @example
 * import { tranposeBy } from 'tonal-distance'
 * transposeBy('3m', '5P') // => '7m'
 */
function transposeBy(interval, note) {
  if (arguments.length === 1) { return function (n) { return transposeBy(interval, n); }; }
  return transpose$2(note, interval);
}

/**
 * Add two intervals 
 * 
 * Can be partially applied.
 * 
 * @param {String} interval1
 * @param {String} interval2
 * @return {String} the resulting interval
 * @example
 * import { add } from 'tonal-distance'
 * add('3m', '5P') // => '7m'
 */
function add(ivl1, ivl2) {
  if (arguments.length === 1) { return function (i2) { return transposeBy(ivl1, i2); }; }
  var p1 = asPitch(ivl1);
  var p2 = asPitch(ivl2);
  return p1 && p2 ? strPitch(trBy$1(p1, p2)) : null;
}

/**
 * Transpose a note by a number of perfect fifths. 
 * 
 * It can be partially applied.
 *
 * @function
 * @param {String} note
 * @param {Integer} times - the number of times
 * @return {String} the transposed note
 * @example
 * import { trFifths } from 'tonal-transpose'
 * [0, 1, 2, 3, 4].map(trFifths('C')) // => ['C', 'G', 'D', 'A', 'E']
 * // or using tonal
 * tonal.trFifths('G4', 1) // => 'D5'
 */
function trFifths$1(t, n) {
  if (arguments.length > 1) { return trFifths$1(t)(n); }
  return function(n) {
    return transpose$2(t, pitch(n, 0, 1));
  };
}

// substract two pitches
function substr(a, b) {
  if (!a || !b || a[1].length !== b[1].length) { return null; }
  var f = fifths(b) - fifths(a);
  if (isPC(a)) { return pitch(f, -Math.floor(f * 7 / 12), 1); }
  var o = focts(b) - focts(a);
  var d = height(b) - height(a) < 0 ? -1 : 1;
  return pitch(d * f, d * o, d);
}

/**
 * Find the interval between two pitches. It works with pitch classes 
 * (both must be pitch classes and the interval is always ascending)
 * 
 * Can be partially applied
 *
 * @param {String} from - distance from
 * @param {String} to - distance to
 * @return {String} the interval distance
 *
 * @example
 * import { interval } from 'tonal-distance'
 * interval('C2', 'C3') // => 'P8'
 * interval('G', 'B') // => 'M3'
 * 
 * // or use tonal
 * var tonal = require('tonal')
 * tonal.distance.interval('M2', 'P5') // => 'P4'
 */
function interval(from, to) {
  if (arguments.length === 1) { return function (to) { return interval(from, to); }; }
  var pa = asPitch(from);
  var pb = asPitch(to);
  var i = substr(pa, pb);
  // if a and b are in array notation, no conversion back
  return strIvl(i);
}

/**
 * Subtract two intervals
 * 
 * @param {String} minuend
 * @param {String} subtrahend
 * @return {String} interval diference
 */
function subtract(ivl1, ivl2) {
  return interval(ivl2, ivl1);
}

/**
 * Get the distance between two notes in semitones
 * @param {String|Pitch} from - first note
 * @param {String|Pitch} to - last note
 * @return {Integer} the distance in semitones or null if not valid notes
 * @example
 * import { semitones } from 'tonal-distance'
 * semitones('C3', 'A2') // => -3
 * // or use tonal
 * tonal.distance.semitones('C3', 'G3') // => 7
 */
function semitones(a, b) {
  var i = substr(asPitch(a), asPitch(b));
  return i ? height(i) : null;
}


var distance = Object.freeze({
	transpose: transpose$2,
	transposeBy: transposeBy,
	add: add,
	trFifths: trFifths$1,
	interval: interval,
	subtract: subtract,
	semitones: semitones
});

/**
 * This module implements utility functions related to array manipulation, like:
 * `map`, `filter`, `shuffle`, `sort`, `rotate`, `select`
 *
 * All the functions are _functional friendly_ with target object as last
 * parameter and currified. The sorting functions understand about pitch
 * heights and interval sizes.
 *
 * One key feature of tonal is that you can represent lists with arrays or
 * with space separated string of elements. This module implements that
 * functionallity.
 *
 * @module array
 */
function split(sep) {
  return function(o) {
    return o === undefined
      ? []
      : Array.isArray(o)
        ? o
        : typeof o === "string" ? o.trim().split(sep) : [o];
  };
}

// utility
var isArr = Array.isArray;
function hasVal(e) {
  return e || e === 0;
}

/**
 * Convert anything to array. Speifically, split string separated by spaces,
 * commas or bars. If you give it an actual array, it returns it without
 * modification.
 *
 * This function __always__ returns an array (null or undefined values are converted
 * to empty arrays)
 *
 * Thanks to this function, the rest of the functions of this module accepts
 * strings as an array parameter.
 *
 * @function
 * @param {*} source - the thing to get an array from
 * @return {Array} the object as an array
 *
 * @example
 * import { asArr } from 'tonal-arrays'
 * asArr('C D E F G') // => ['C', 'D', 'E', 'F', 'G']
 * asArr('A, B, c') // => ['A', 'B', 'c']
 * asArr('1 | 2 | x') // => ['1', '2', 'x']
 */
var asArr = split(/\s*\|\s*|\s*,\s*|\s+/);

/**
 * Return a new array with the elements mapped by a function.
 * Basically the same as the JavaScript standard `array.map` but with
 * two enhacements:
 *
 * - Arrays can be expressed as strings (see [asArr])
 * - This function can be partially applied. This is useful to create _mapped_
 * versions of single element functions. For an excellent introduction of
 * the adventages [read this](https://drboolean.gitbooks.io/mostly-adequate-guide/content/ch4.html)
 *
 * @param {Function} fn - the function
 * @param {Array|String} arr - the array to be mapped
 * @return {Array}
 * @example
 * var arr = require('tonal-arr')
 * var toUp = arr.map(function(e) { return e.toUpperCase() })
 * toUp('a b c') // => ['A', 'B', 'C']
 *
 * @example
 * var tonal = require('tonal')
 * tonal.map(tonal.transpose('M3'), 'C D E') // => ['E', 'F#', 'G#']
 */
function map(fn, list) {
  return arguments.length > 1
    ? map(fn)(list)
    : function(l) {
        return asArr(l).map(fn);
      };
}

/**
 * Return a copy of the array with the null values removed
 * @param {String|Array} list
 * @return {Array}
 * @example
 * tonal.compact(['a', 'b', null, 'c']) // => ['a', 'b', 'c']
 */
function compact(arr) {
  return asArr(arr).filter(hasVal);
}

/**
 * Filter an array with a function. Again, almost the same as JavaScript standard
 * filter function but:
 *
 * - It accepts strings as arrays
 * - Can be partially applied
 *
 * @param {Function} fn
 * @param {String|Array} arr
 * @return {Array}
 * @example
 * t.filter(t.noteName, 'a b c x bb') // => [ 'a', 'b', 'c', 'bb' ]
 */
function filter(fn, list) {
  return arguments.length > 1
    ? filter(fn)(list)
    : function(l) {
        return asArr(l).filter(fn);
      };
}

// a custom height function that
// - returns -Infinity for non-pitch objects
// - assumes pitch classes has octave -100 (so are sorted before that notes)
function objHeight(p) {
  if (!p) { return -Infinity; }
  var f = fifths(p) * 7;
  var o = focts(p) || -Math.floor(f / 12) - 100;
  return f + o * 12;
}

// ascending comparator
function ascComp(a, b) {
  return objHeight(a) - objHeight(b);
}
// descending comparator
function descComp(a, b) {
  return -ascComp(a, b);
}

/**
 * Sort a list of notes or intervals in ascending or descending pitch order.
 * It removes from the list any thing is not a pitch (a note or interval)
 *
 * Note this function returns a __copy__ of the array, it does NOT modify
 * the original.
 *
 * @param {Array|String} list - the list of notes or intervals
 * @param {Boolean|Function} comp - (Optional) comparator.
 * Ascending pitch by default. Pass a `false` to order descending
 * or a custom comparator function (that receives pitches in array notation).
 * Note that any other value is ignored.
 * @example
 * array.sort('D E C') // => ['C', 'D', 'E']
 * array.sort('D E C', false) // => ['E', 'D', 'C']
 * // if is not a note, it wil be removed
 * array.sort('g h f i c') // => ['C', 'F', 'G']
 */
function sort(list, comp) {
  var fn =
    arguments.length === 1 || comp === true
      ? ascComp
      : comp === false ? descComp : typeof comp === "function" ? comp : ascComp;
  // if the list is an array, make a copy
  list = Array.isArray(list) ? list.slice() : asArr(list);
  return listFn(function(arr) {
    return arr.sort(fn).filter(hasVal);
  }, list);
}

/**
 * Randomizes the order of the specified array using the Fisher–Yates shuffle.
 *
 * @function
 * @param {Array|String} arr - the array
 * @return {Array} the shuffled array
 *
 * @example
 * import { shuffle } from 'tonal-arrays'
 * @example
 * var tonal = require('tonal')
 * tonal.shuffle('C D E F')
 */
var shuffle = listFn(function(arr) {
  var i, t;
  var m = arr.length;
  while (m) {
    i = (Math.random() * m--) | 0;
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
});

function trOct(n) {
  return transpose(pitch(0, n, 1));
}

/**
 * Rotates a list a number of times. It's completly agnostic about the
 * contents of the list.
 * @param {Integer} times - the number of rotations
 * @param {Array|String} list - the list to be rotated
 * @return {Array} the rotated array
 */
function rotate(times, list) {
  var arr = asArr(list);
  var len = arr.length;
  var n = (times % len + len) % len;
  return arr.slice(n, len).concat(arr.slice(0, n));
}

/**
 * Rotates an ascending list of pitches n times keeping the ascending property.
 * This functions assumes the list is an ascending list of pitches, and
 * transposes the them to ensure they are ascending after rotation.
 * It can be used, for example, to invert chords.
 *
 * @param {Integer} times - the number of rotations
 * @param {Array|String} list - the list to be rotated
 * @return {Array} the rotated array
 */
function rotateAsc(times, list) {
  return listFn(function(arr) {
    var len = arr.length;
    var n = (times % len + len) % len;
    var head = arr.slice(n, len);
    var tail = arr.slice(0, n);
    // See if the first note of tail is lower than the last of head
    var s = semitones(head[len - n - 1], tail[0]);
    if (s < 0) {
      var octs = Math.floor(s / 12);
      if (times < 0) { head = head.map(trOct(octs)); }
      else { tail = tail.map(trOct(-octs)); }
    }
    return head.concat(tail);
  }, list);
}

/**
 * Select elements from a list.
 *
 * @param {String|Array} numbers - a __1-based__ index of the elements
 * @param {String|Array} list - the list of pitches
 * @return {Array} the selected elements (with nulls if not valid index)
 *
 * @example
 * import { select } from 'tonal-array'
 * select('1 3 5', 'C D E F G A B') // => ['C', 'E', 'G']
 * select('-1 0 1 2 3', 'C D') // => [ null, null, 'C', 'D', null ]
 */
function select(nums, list) {
  if (arguments.length === 1) {
    return function(l) {
      return select(nums, l);
    };
  }
  var arr = asArr(list);
  return asArr(nums).map(function(n) {
    return arr[n - 1] || null;
  });
}

// http://stackoverflow.com/questions/9960908/permutations-in-javascript
/**
 * Get all permutations of a list
 * @param {Array|Strng} list - the list
 * @return {Array<Array>} an array with all the permutations
 */
function permutations(list) {
  list = asArr(list);
  if (list.length === 0) { return [[]]; }
  return permutations(list.slice(1)).reduce(function(acc, perm) {
    return acc.concat(
      list.map(function(e, pos) {
        var newPerm = perm.slice();
        newPerm.splice(pos, 0, list[0]);
        return newPerm;
      })
    );
  }, []);
}

// #### Transform lists in array notation
function asPitchStr(p) {
  return strPitch(p) || p;
}
function listToStr(v) {
  return isPitch(v) ? strPitch(v) : isArr(v) ? v.map(asPitchStr) : v;
}

/**
 * Decorates a function to so it's first parameter is an array of pitches in
 * array notation. Also, if the return value is a pitch or an array of pitches
 * in array notation, it convert backs to strings.
 *
 * @private
 * @param {Function} fn - the function to decorate
 * @return {Function} the decorated function
 * @example
 * import { listFn } from 'tonal-arrays'
 * var octUp = listFn((p) => { p[2] = p[2] + 1; return p[2] })
 * octUp('C2 D2 E2') // => ['C3', 'D3', 'E3']
 */
function listFn(fn, list) {
  if (arguments.length === 1) {
    return function(l) {
      return listFn(fn, l);
    };
  }
  var arr = asArr(list).map(asPitch);
  var res = fn(arr);
  return listToStr(res);
}


var array = Object.freeze({
	asArr: asArr,
	map: map,
	compact: compact,
	filter: filter,
	sort: sort,
	shuffle: shuffle,
	rotate: rotate,
	rotateAsc: rotateAsc,
	select: select,
	permutations: permutations
});

/**
 * Functions to transpose o calculate distances from a collection of notes.
 *
 * A useful concept is _harmonizer_: a function that _harmonizes_ notes. It can
 * be created by partially applying the `harmonize` function (see examples)
 *
 * @example
 * var harmonizer = require('tonal-harmonizer')
 * harmonizer.harmonize('1P 3M 5P', 'C') // => ['C', 'E', 'G']
 * var maj7 = harmonizer.harmonize('1P 3M 5P 7M')
 * maj7('D4') // =>  ['D4', 'F#4', 'A4', 'C#5']
 * harmonizer.harmonics('C E G') // => ['1P', '3M', '5P']
 *
 * @example
 * // in tonal this functions are NOT namespaced
 * var tonal = require('tonal')
 * tonal.harmonize('1P 3M 5P', 'G')
 *
 * @example
 * // using ES6 import syntax
 * import { harmonize } from 'tonal-harmonizer'
 * harmonize(...)
 *
 * @module harmonizer
 */
function harmonics(list) {
  var a = asArr(list);
  return a.length ? compact(a.map(interval(a[0]))) : a;
}

/**
 * Given a list of notes, return the intervallic structure: the distance from
 * one to the next.
 *
 * Notice that the number of intervals is one less that the number of notes.
 *
 * @param {Array|String} notes - the list of notes
 * @return {Array} the intervals relative to the previous
 * @example
 * harmonizer.intervallic('c e g') // => ['3M', '3m']
 * harmonizer.intervallic('e g c') // => ['3m', '4P']
 * harmonizer.intervallic('c') // => []
 */
function intervallic(notes) {
  var dist = [];
  notes = asArr(notes);
  for (var i = 1; i < notes.length; i++) {
    dist.push(interval(notes[i - 1], notes[i]));
  }
  return dist;
}

/**
 * Given a list of intervals and a tonic, return that tonic transposed
 * to that intervals.
 *
 * It's currified and, calling with only one parameter, returns an harmonizer,
 * a function that harmonizes any note (see example)
 *
 * @function
 * @param {String|Array} list - the list of intervals
 * @param {String|Pitch} note - the note to be harmonized
 * @return {Array} the resulting notes
 * @example
 * harmonizer.harmonize('P1 M3 P5 M7', 'C') // => ['C', 'E', 'G', 'B']
 * @example
 * // harmonizer with partial application
 * var maj7 = harmonize.harmonizer('P1 M3 P5 M7')
 * maj7('C') // => ['C', 'E', 'G', 'B']
 * @example
 * // in tonal this function is NOT namespaced
 * var C = tonal.harmonizer('C D E')
 * C('M3') // => ['E', 'G#', 'B']
 */
function harmonize(list, pitch) {
  if (arguments.length > 1) { return harmonize(list)(pitch); }
  return function(tonic) {
    return compact(map(transpose(tonic || "P1"), list));
  };
}


var harmonizer = Object.freeze({
	harmonics: harmonics,
	intervallic: intervallic,
	harmonize: harmonize
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-note.svg)](https://www.npmjs.com/package/tonal-note)
 * [![tonal](https://img.shields.io/badge/tonal-note-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-note` is a collection of functions to manipulate musical notes in scientific notation
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * import * as note from 'tonal-note'
 * // or var note = require('tonal-note')
 * note.name('bb2') // => 'Bb2'
 * note.chroma('bb2') // => 10
 * note.midi('a4') // => 69
 * note.freq('a4') // => 440
 * note.oct('G3') // => 3
 * 
 * // part of tonal
 * const tonal = require('tonal')
 * tonal.note.midi('d4') // => 62
 * ```
 *
 * ## Install
 *
 * [![npm install tonal-note](https://nodei.co/npm/tonal-note.png?mini=true)](https://npmjs.org/package/tonal-note/)
 *
 * ## API Documentation
 *
 * @module note
 */
var REGEX$1 = /^([a-gA-G])(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)\s*$/;

function split$1(str) {
  var m = REGEX$1.exec(str);
  if (!m) { return null; }
  return {
    letter: m[1].toUpperCase(),
    acc: m[2].replace(/x/g, "##"),
    oct: m[3],
    mod: m[4]
  };
}

function parseNote$1(str) {
  var p = split$1(str);
  return p && p.mod === ""
    ? {
        step: (p.letter.charCodeAt(0) + 3) % 7,
        alt: p.acc[0] === "b" ? -p.acc.length : p.acc.length,
        oct: p.oct.length ? +p.oct : null
      }
    : null;
}

var cache = {};
function parse$2(name) {
  if (typeof name !== "string") { return null; }
  return cache[name] === undefined
    ? (cache[name] = parseNote$1(name))
    : cache[name];
}

var parsed = function (fn) { return function (str, p) { return ((p = parse$2(str)) !== null ? fn(p) : null); }; };

var SEMI = [0, 2, 4, 5, 7, 9, 11];
var toMidi = parsed(
  function (p) { return (p.oct !== null ? SEMI[p.step] + p.alt + 12 * (p.oct + 1) : null); }
);
/**
 * Get the note midi number
 * (an alias of tonal-midi `toMidi` function)
 *
 * @function
 * @param {string|Number} note - the note to get the midi number from
 * @return {Integer} the midi number or null if not valid pitch
 * @example
 * note.midi('C4') // => 60
 * note.midi(60) // => 60
 * @see midi.toMidi
 */
var midi$1 = function (note) { return toMidi(note) || +note || null; };

var FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
var SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
/**
 * Given a midi number, returns a note name. The altered notes will have
 * flats unless explicitly set with the optional `useSharps` parameter.
 *
 * @function
 * @param {number} midi - the midi note number
 * @param [boolean] useSharps - (Optional) set to true to use sharps instead of flats
 * @return {string} the note name
 * @example
 * var midi = require('tonal-midi')
 * midi.note(61) // => 'Db4'
 * midi.note(61, true) // => 'C#4'
 * // it rounds to nearest note
 * midi.note(61.7) // => 'D4'
 */
function fromMidi(num, sharps) {
  num = Math.round(num);
  var pcs = sharps === true ? SHARPS : FLATS;
  var pc = pcs[num % 12];
  var o = Math.floor(num / 12) - 1;
  return pc + o;
}

/**
 * Get the frequency of a note
 *
 * @function
 * @param {string|Number} note - the note name or midi note number
 * @return {Number} the frequency
 * @example
 * note.freq('A4') // => 440
 */
var freq$1 = function (str, m) { return (m = midi$1(str)) !== null ? Math.pow(2, (m - 69) / 12) * 440 : null; };

/**
 * Return the chroma of a note. The chroma is the numeric equivalent to the
 * pitch class, where 0 is C, 1 is C# or Db, 2 is D... 11 is B
 *
 * @param {string} note - the note name
 * @return {Integer} the chroma number
 * @example
 * var note = require('tonal-note')
 * note.chroma('Cb') // => 11
 * ['C', 'D', 'E', 'F'].map(note.chroma) // => [0, 2, 4, 5]
 */
var chroma$1 = parsed(function (p) { return (SEMI[p.step] + p.alt + 120) % 12; });

/**
 * @deprecated
 * An alias for note. Get the name of a note in scientific notation
 * @function
 */
function note(n) {
  console.warn("note.note() is deprecated. Use note.name()");
  return name(n);
}

/**
 * Get the octave of the given pitch
 *
 * @function
 * @param {string} note - the note
 * @return {Integer} the octave or null if doesn't have an octave or not a valid note
 * @example
 * note.oct('C#4') // => 4
 * note.oct('C') // => null
 * note.oct('blah') // => null
 */
var oct$1 = parsed(function (p) { return p.oct; });

/**
 * Get the note step: a number equivalent of the note letter. 0 means C and
 * 6 means B. This is different from `chroma` (see example)
 *
 * @function
 * @param {string} note - the note
 * @return {Integer} a number between 0 and 6 or null if not a note
 * @example
 * note.step('C') // => 0
 * note.step('Cb') // => 0
 * // usually what you need is chroma
 * note.chroma('Cb') // => 6
 */
var step$1 = parsed(function (p) { return p.step; });

/**
 * @deprecated
 * Get the note step in fifths from 'C'. One property of the perfect fifth
 * interval is that you can obtain any pitch class by transposing 'C' a
 * number of times. This function return that number.
 * @param {string|Pitch} note - the note (can be a pitch class)
 * @return {Integer} the number of fifths to reach that pitch class from 'C'
 */
function pcFifths(note) {
  console.warn("Deprecated. Do you really need this?");
  var p = asNotePitch(note);
  return p ? fifths(p) : null;
}

/**
 * Get the note alteration: a number equivalent to the accidentals. 0 means
 * no accidentals, negative numbers are for flats, positive for sharps
 *
 * @function
 * @param {string|Pitch} note - the note
 * @return {Integer} the alteration
 * @example
 * note.alt('C') // => 0
 * note.alt('C#') // => 1
 * note.alt('Cb') // => -1
 */
var alt$1 = parsed(function (p) { return p.alt; });

var LETTERS$1 = "CDEFGAB";
/**
 * Given a step number return it's letter (0 = C, 1 = D, 2 = E)
 * @param {number} step 
 * @return {string} the letter
 * @private
 */
var letter$1 = function (step) { return LETTERS$1[step]; };

var fillStr$2 = function (s, n) { return Array(n + 1).join(s); };
var numToStr = function (num, op) { return (typeof num !== "number" ? "" : op(num)); };

var acc$1 = function (alt) { return numToStr(alt, function (alt) { return (alt < 0 ? fillStr$2("b", -alt) : fillStr$2("#", alt)); }); };

/**
 * Build a note name in scientific notation from a parsed note 
 * (an object with { step, alt, oct })
 * @function
 * @param {parsed} parsed
 * @return {string} the note name
 * @example
 * note.build({ step: 1, alt: -1, oct: 3 }) // => Db3
 */
var build$2 = function (p) { return letter$1(p.step) + acc$1(p.alt) + numToStr(p.oct, function (o) { return o; }); };

/**
 * Given a note name, return the note name or null if not valid note.
 * The note name will ALWAYS have the letter in upercase and accidentals
 * using # or b
 * 
 * Can be used to test if a string is a valid note name.
 *
 * @function
 * @param {Pitch|string}
 * @return {string}
 *
 * @example
 * var note = require('tonal-note')
 * note.name('cb2') // => 'Cb2'
 * ['c', 'db3', '2', 'g+', 'gx4'].map(note.name) // => ['C', 'Db3', null, null, 'G##4']
 */
var name = parsed(function (p) { return build$2(p); });

/**
 * Get pitch class of a note. The note can be a string or a pitch array.
 *
 * @function
 * @param {string|Pitch}
 * @return {string} the pitch class
 * @example
 * tonal.pc('Db3') // => 'Db'
 * tonal.map(tonal.pc, 'db3 bb6 fx2') // => [ 'Db', 'Bb', 'F##']
 */
var pc$1 = parsed(function (p) { return letter$1(p.step) + acc$1(p.alt); });


var note$1 = Object.freeze({
	split: split$1,
	parse: parse$2,
	midi: midi$1,
	fromMidi: fromMidi,
	freq: freq$1,
	chroma: chroma$1,
	note: note,
	oct: oct$1,
	step: step$1,
	pcFifths: pcFifths,
	alt: alt$1,
	build: build$2,
	name: name,
	pc: pc$1
});

// shorthand tonal notation (with quality after number)

var TYPES$2 = 'PMMPPMM';
/**
 * Get the type of interval. Can be perfectavle ('P') or majorable ('M')
 * @param {Integer} num - the interval number
 * @return {String} `P` if it's perfectable, `M` if it's majorable.
 */
function type$2 (num) {
  return TYPES$2[(num - 1) % 7]
}

function dirStr$1 (dir) { return dir === -1 ? '-' : '' }
function num$2 (simple, oct) { return simple + 7 * oct }

/**
 * Build a shorthand interval notation string from properties.
 *
 * @param {Integer} simple - the interval simple number (from 1 to 7)
 * @param {Integer} alt - the quality expressed in numbers. 0 means perfect
 * or major, depending of the interval number.
 * @param {Integer} oct - the number of octaves the interval spans.
 * 0 por simple intervals. Positive number.
 * @param {Integer} dir - the interval direction: 1 ascending, -1 descending.
 * @example
 * var interval = require('interval-notation')
 * interval.shorthand(3, 0, 0, 1) // => 'M3'
 * interval.shorthand(3, -1, 0, -1) // => 'm-3'
 * interval.shorthand(3, 1, 1, 1) // => 'A10'
 */

/**
 * Build a special shorthand interval notation string from properties.
 * The special shorthand interval notation changes the order or the standard
 * shorthand notation so instead of 'M-3' it returns '-3M'.
 *
 * The standard shorthand notation has a string 'A4' (augmented four) that can't
 * be differenciate from 'A4' (the A note in 4th octave), so the purpose of this
 * notation is avoid collisions
 *
 * @param {Integer} simple - the interval simple number (from 1 to 7)
 * @param {Integer} alt - the quality expressed in numbers. 0 means perfect
 * or major, depending of the interval number.
 * @param {Integer} oct - the number of octaves the interval spans.
 * 0 por simple intervals. Positive number.
 * @param {Integer} dir - the interval direction: 1 ascending, -1 descending.
 * @example
 * var interval = require('interval-notation')
 * interval.build(3, 0, 0, 1) // => '3M'
 * interval.build(3, -1, 0, -1) // => '-3m'
 * interval.build(3, 1, 1, 1) // => '10A'
 */
function build$3 (simple, alt, oct, dir) {
  return dirStr$1(dir) + num$2(simple, oct) + altToQ$1(simple, alt)
}

/**
 * Get an alteration number from an interval quality string.
 * It accepts the standard `dmMPA` but also sharps and flats.
 *
 * @param {Integer|String} num - the interval number or a string representing
 * the interval type ('P' or 'M')
 * @param {String} quality - the quality string
 * @return {Integer} the interval alteration
 * @example
 * qToAlt('M', 'm') // => -1 (for majorables, 'm' is -1)
 * qToAlt('P', 'A') // => 1 (for perfectables, 'A' means 1)
 * qToAlt('M', 'P') // => null (majorables can't be perfect)
 */


function fillStr$3 (s, n) { return Array(Math.abs(n) + 1).join(s) }
/**
 * Get interval quality from interval type and alteration
 *
 * @function
 * @param {Integer|String} num - the interval number of the the interval
 * type ('M' for majorables, 'P' for perfectables)
 * @param {Integer} alt - the interval alteration
 * @return {String} the quality string
 * @example
 * altToQ('M', 0) // => 'M'
 */
function altToQ$1 (num, alt) {
  var t = typeof num === 'number' ? type$2(Math.abs(num)) : num;
  if (alt === 0) { return t === 'M' ? 'M' : 'P' }
  else if (alt === -1 && t === 'M') { return 'm' }
  else if (alt > 0) { return fillStr$3('A', alt) }
  else if (alt < 0) { return fillStr$3('d', t === 'P' ? alt : alt + 1) }
  else { return null }
}

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-interval.svg)](https://www.npmjs.com/package/tonal-interval)
 * [![tonal](https://img.shields.io/badge/tonal-interval-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-interval` is a collection of functions to create and manipulate music intervals.
 *
 * The intervals are strings in shorthand notation. Two variations are supported:
 *
 * - standard shorthand notation: type and number, for example: 'M3', 'd-4'
 * - inverse shorthand notation: number and then type, for example: '3M', '-4d'
 *
 * The problem with the standard shorthand notation is that some strings can be
 * parsed as notes or intervals, for example: 'A4' can be note A in 4th octave
 * or an augmented four. To remove ambiguity, the prefered notation in tonal is the
 * inverse shortand notation.
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * import * as interval from 'tonal-interval'
 * // or var interval = require('tonal-interval')
 * interval.semitones('4P') // => 5
 * interval.invert('3m') // => '6M'
 * interval.simplify('9m') // => '2m'
 * ```
 *
 * ## Install
 *
 * [![npm install tonal-interval](https://nodei.co/npm/tonal-interval.png?mini=true)](https://npmjs.org/package/tonal-interval/)
 *
 * ## API Documentation
 *
 * @module interval
 */
function toInterval(ivl) {
  var i = asIvlPitch(ivl);
  return i ? strIvl(i) : null;
}

/**
 * Get the number of the interval (same as value, but always positive)
 *
 * @param {String|Pitch} interval - the interval
 * @return {Integer} the positive interval number (P1 is 1, m2 is 2, ...)
 * @example
 * interval.num('m2') // => 2
 * interval.num('P9') // => 9
 * interval.num('P-4') // => 4
 */
function num$1(ivl) {
  var p = props(ivl);
  return p ? p.num : null;
}

/**
 * Get the interval value (the interval number, but positive or negative
 * depending the interval direction)
 *
 * @param {String|Pitch} interval - the interval
 * @return {Integer} the positive interval number (P1 is 1, m-2 is -2, ...)
 * @example
 * interval.num('m2') // => 2
 * interval.num('m9') // => 9
 * interval.num('P-4') // => -4
 * interval.num('m-9') // => -9
 */
function value(ivl) {
  var p = props(ivl);
  return p ? p.num * p.dir : null;
}

/**
 * Get interval properties. It returns an object with:
 *
 * - num: the interval number (always positive)
 * - alt: the interval alteration (0 for perfect in perfectables, or 0 for major in _majorables_)
 * - dir: the interval direction (1 ascending, -1 descending)
 *
 * @param {String|Pitch} interval - the interval
 * @return {Array} the interval in the form [number, alt]
 * @example
 * interval.parse('m2') // => { num: 2, alt: -1, dir: 1 }
 * interval.parse('m9') // => { num: 9, alt: -1, dir: 1 }
 * interval.parse('P-4') // => { num: 4, alt: 0, dir: -1}
 * interval.parse('m-9') // => { num: 9, alt: -1, dir: -1 }
 */
function props(ivl) {
  var i = asIvlPitch(ivl);
  if (!i) { return null; }
  var d = decode$1(i);
  return { num: d[0] + 1 + d[2] * 7, alt: d[1], dir: i[2] };
}

/**
 * Given a interval property object, get the interval name
 *
 * @param {Object} props - the interval property object
 *
 * - num: the interval number
 * - alt: the interval alteration
 * - dir: the direction
 * @return {String} the interval name
 */
function fromProps(props) {
  if (!props || props.num < 1) { return null; }
  var octs = Math.floor(props.num / 8);
  var simple = props.num - 7 * octs;
  return build$3(simple, props.alt || 0, octs, props.dir);
}

/**
 * Get size in semitones of an interval
 * @param {String|Pitch} ivl
 * @return {Integer} the number of semitones or null if not an interval
 * @example
 * import { semitones } from 'tonal-interval'
 * semitones('P4') // => 5
 * // or using tonal
 * tonal.semitones('P5') // => 7
 */
function semitones$1(ivl) {
  var i = asIvlPitch(ivl);
  return i ? height(i) : null;
}

// interval numbers
var IN = [1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7];
// interval qualities
var IQ = "P m M m M P d P m M m M".split(" ");

/**
 * Get interval name from semitones number. Since there are several interval
 * names for the same number, the name it's arbitraty, but deterministic.
 * @param {Integer} num - the number of semitones (can be negative)
 * @return {String} the interval name
 * @example
 * import { fromSemitones } from 'tonal-interval'
 * fromSemitones(7) // => '5P'
 * // or using tonal
 * tonal.fromSemitones(-7) // => '-5P'
 */
function fromSemitones(num) {
  var d = num < 0 ? -1 : 1;
  var n = Math.abs(num);
  var c = n % 12;
  var o = Math.floor(n / 12);
  return d * (IN[c] + 7 * o) + IQ[c];
}

var CLASSES = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
/**
 * Get the [interval class](https://en.wikipedia.org/wiki/Interval_class)
 * number of a given interval.
 *
 * In musical set theory, an interval class is the shortest distance in
 * pitch class space between two unordered pitch classes
 *
 * As paramter you can pass an interval in shorthand notation, an interval in
 * array notation or the number of semitones of the interval
 *
 * @param {String|Integer} interval - the interval or the number of semitones
 * @return {Integer} A value between 0 and 6
 *
 * @example
 * interval.ic('P8') // => 0
 * interval.ic('m6') // => 4
 * ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'].map(ic) // => [0, 2, 4, 5, 5, 3, 1]
 */
function ic(ivl) {
  var i = asIvlPitch(ivl);
  var s = i ? chr(i) : Math.round(ivl);
  return isNaN(s) ? null : CLASSES[Math.abs(s) % 12];
}

var TYPES$1 = "PMMPPMM";
/**
 * Get interval type. Can be perfectable (1, 4, 5) or majorable (2, 3, 6, 7)
 * It does NOT return the actual quality.
 *
 * @param {String|Pitch} interval
 * @return {String} 'P' for perfectables, 'M' for majorables or null if not
 * valid interval
 * @example
 * interval.type('5A') // => 'P'
 */
function type$1(ivl) {
  var i = asIvlPitch(ivl);
  return i ? TYPES$1[decode$1(i)[0]] : null;
}

/**
 * Get the inversion (https://en.wikipedia.org/wiki/Inversion_(music)#Intervals)
 * of an interval.
 *
 * @function
 * @param {String|Pitch} interval - the interval to invert in interval shorthand
 * notation or interval array notation
 * @return {String|Pitch} the inverted interval
 *
 * @example
 * interval.invert('3m') // => '6M'
 * interval.invert('2M') // => '7m'
 */
var invert = ivlFn(function(i) {
  var d = decode$1(i);
  // d = [step, alt, oct]
  var step = (7 - d[0]) % 7;
  var alt = TYPES$1[d[0]] === "P" ? -d[1] : -(d[1] + 1);
  return encode$1(step, alt, d[2], dir(i));
});

/**
 * Get the simplified version of an interval.
 *
 * @function
 * @param {String|Array} interval - the interval to simplify
 * @return {String|Array} the simplified interval
 *
 * @example
 * interval.simplify('9M') // => '2M'
 * ['8P', '9M', '10M', '11P', '12P', '13M', '14M', '15P'].map(interval.simplify)
 * // => [ '8P', '2M', '3M', '4P', '5P', '6M', '7M', '8P' ]
 * interval.simplify('2M') // => '2M'
 * interval.simplify('-2M') // => '7m'
 */
var simplify = ivlFn(function(i) {
  // decode to [step, alt, octave]
  var dec = decode$1(i);
  // if it's not 8 reduce the octaves to 0
  if (dec[0] !== 0 || dec[2] !== 1) { dec[2] = 0; }
  // encode back
  return encode$1(dec[0], dec[1], dec[2], dir(i));
});


var interval$1 = Object.freeze({
	toInterval: toInterval,
	num: num$1,
	value: value,
	props: props,
	fromProps: fromProps,
	semitones: semitones$1,
	fromSemitones: fromSemitones,
	ic: ic,
	type: type$1,
	invert: invert,
	simplify: simplify
});

'use strict';

// util
function isNum$2 (x) { return typeof x === 'number' }
function isStr$1 (x) { return typeof x === 'string' }
function isDef$1 (x) { return typeof x !== 'undefined' }
function midiToFreq$1 (midi, tuning) {
  return Math.pow(2, (midi - 69) / 12) * (tuning || 440)
}

var REGEX$2 = /^([a-gA-G])(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)\s*$/;
/**
 * A regex for matching note strings in scientific notation.
 *
 * @name regex
 * @function
 * @return {RegExp} the regexp used to parse the note name
 *
 * The note string should have the form `letter[accidentals][octave][element]`
 * where:
 *
 * - letter: (Required) is a letter from A to G either upper or lower case
 * - accidentals: (Optional) can be one or more `b` (flats), `#` (sharps) or `x` (double sharps).
 * They can NOT be mixed.
 * - octave: (Optional) a positive or negative integer
 * - element: (Optional) additionally anything after the duration is considered to
 * be the element name (for example: 'C2 dorian')
 *
 * The executed regex contains (by array index):
 *
 * - 0: the complete string
 * - 1: the note letter
 * - 2: the optional accidentals
 * - 3: the optional octave
 * - 4: the rest of the string (trimmed)
 *
 * @example
 * var parser = require('note-parser')
 * parser.regex.exec('c#4')
 * // => ['c#4', 'c', '#', '4', '']
 * parser.regex.exec('c#4 major')
 * // => ['c#4major', 'c', '#', '4', 'major']
 * parser.regex().exec('CMaj7')
 * // => ['CMaj7', 'C', '', '', 'Maj7']
 */


var SEMITONES$1 = [0, 2, 4, 5, 7, 9, 11];
/**
 * Parse a note name in scientific notation an return it's components,
 * and some numeric properties including midi number and frequency.
 *
 * @name parse
 * @function
 * @param {String} note - the note string to be parsed
 * @param {Boolean} isTonic - true the strings it's supposed to contain a note number
 * and some category (for example an scale: 'C# major'). It's false by default,
 * but when true, en extra tonicOf property is returned with the category ('major')
 * @param {Float} tunning - The frequency of A4 note to calculate frequencies.
 * By default it 440.
 * @return {Object} the parsed note name or null if not a valid note
 *
 * The parsed note name object will ALWAYS contains:
 * - letter: the uppercase letter of the note
 * - acc: the accidentals of the note (only sharps or flats)
 * - pc: the pitch class (letter + acc)
 * - step: s a numeric representation of the letter. It's an integer from 0 to 6
 * where 0 = C, 1 = D ... 6 = B
 * - alt: a numeric representation of the accidentals. 0 means no alteration,
 * positive numbers are for sharps and negative for flats
 * - chroma: a numeric representation of the pitch class. It's like midi for
 * pitch classes. 0 = C, 1 = C#, 2 = D ... 11 = B. Can be used to find enharmonics
 * since, for example, chroma of 'Cb' and 'B' are both 11
 *
 * If the note has octave, the parser object will contain:
 * - oct: the octave number (as integer)
 * - midi: the midi number
 * - freq: the frequency (using tuning parameter as base)
 *
 * If the parameter `isTonic` is set to true, the parsed object will contain:
 * - tonicOf: the rest of the string that follows note name (left and right trimmed)
 *
 * @example
 * var parse = require('note-parser').parse
 * parse('Cb4')
 * // => { letter: 'C', acc: 'b', pc: 'Cb', step: 0, alt: -1, chroma: -1,
 *         oct: 4, midi: 59, freq: 246.94165062806206 }
 * // if no octave, no midi, no freq
 * parse('fx')
 * // => { letter: 'F', acc: '##', pc: 'F##', step: 3, alt: 2, chroma: 7 })
 */
function parse$4 (str, isTonic, tuning) {
  if (typeof str !== 'string') { return null }
  var m = REGEX$2.exec(str);
  if (!m || (!isTonic && m[4])) { return null }

  var p = { letter: m[1].toUpperCase(), acc: m[2].replace(/x/g, '##') };
  p.pc = p.letter + p.acc;
  p.step = (p.letter.charCodeAt(0) + 3) % 7;
  p.alt = p.acc[0] === 'b' ? -p.acc.length : p.acc.length;
  var pos = SEMITONES$1[p.step] + p.alt;
  p.chroma = pos < 0 ? 12 + pos : pos % 12;
  if (m[3]) { // has octave
    p.oct = +m[3];
    p.midi = pos + 12 * (p.oct + 1);
    p.freq = midiToFreq$1(p.midi, tuning);
  }
  if (isTonic) { p.tonicOf = m[4]; }
  return p
}



/**
 * Get midi of a note
 *
 * @name midi
 * @function
 * @param {String|Integer} note - the note name or midi number
 * @return {Integer} the midi number of the note or null if not a valid note
 * or the note does NOT contains octave
 * @example
 * var parser = require('note-parser')
 * parser.midi('A4') // => 69
 * parser.midi('A') // => null
 * @example
 * // midi numbers are bypassed (even as strings)
 * parser.midi(60) // => 60
 * parser.midi('60') // => 60
 */
function midi$3 (note) {
  if ((isNum$2(note) || isStr$1(note)) && note >= 0 && note < 128) { return +note }
  var p = parse$4(note);
  return p && isDef$1(p.midi) ? p.midi : null
}

/**
 * Get freq of a note in hertzs (in a well tempered 440Hz A4)
 *
 * @name freq
 * @function
 * @param {String} note - the note name or note midi number
 * @param {String} tuning - (Optional) the A4 frequency (440 by default)
 * @return {Float} the freq of the number if hertzs or null if not valid note
 * @example
 * var parser = require('note-parser')
 * parser.freq('A4') // => 440
 * parser.freq('A') // => null
 * @example
 * // can change tuning (440 by default)
 * parser.freq('A4', 444) // => 444
 * parser.freq('A3', 444) // => 222
 * @example
 * // it accepts midi numbers (as numbers and as strings)
 * parser.freq(69) // => 440
 * parser.freq('69', 442) // => 442
 */

/**
 * A midi note number is a number representation of a note pitch. It can be
 * integers so it's equal tempered tuned, or float to indicate it's not
 * tuned into equal temepered scale.
 *
 * This module contains functions to convert to and from midi notes.
 *
 * @example
 * var midi = require('tonal-midi')
 * midi.toMidi('A4') // => 69
 * midi.note(69) // => 'A4'
 * midi.note(61) // => 'Db4'
 * midi.note(61, true) // => 'C#4'
 *
 * @module midi
 */

function toMidi$1(val) {
  if (Array.isArray(val) && val.length === 2)
    { return val[0] * 7 + val[1] * 12 + 12; }
  return midi$3(val);
}

var FLATS$1 = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
var SHARPS$1 = "C C# D D# E F F# G G# A A# B".split(" ");

/**
 * Given a midi number, returns a note name. The altered notes will have
 * flats unless explicitly set with the optional `useSharps` parameter.
 *
 * @function
 * @param {Integer} midi - the midi note number
 * @param {Boolean} useSharps - (Optional) set to true to use sharps instead of flats
 * @return {String} the note name
 * @example
 * var midi = require('tonal-midi')
 * midi.note(61) // => 'Db4'
 * midi.note(61, true) // => 'C#4'
 * // it rounds to nearest note
 * midi.note(61.7) // => 'D4'
 */
function note$2(num, sharps) {
  if (num === true || num === false)
    { return function(m) {
      return note$2(m, num);
    }; }
  num = Math.round(num);
  var pcs = sharps === true ? SHARPS$1 : FLATS$1;
  var pc = pcs[num % 12];
  var o = Math.floor(num / 12) - 1;
  return pc + o;
}


var midi$2 = Object.freeze({
	toMidi: toMidi$1,
	note: note$2
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-freq.svg)](https://www.npmjs.com/package/tonal-freq)
 * [![tonal](https://img.shields.io/badge/tonal-freq-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-freq` is a collection of functions to perform calculations related to frequencies.
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * var freq = require('tonal-freq')
 * freq.toFreq('A4') // => 440
 * freq.note(440) // => 'A4'
 * freq.noteAndDetune(320) // => ['C4', 200]
 * ```
 *
 * ## Install
 *
 * [![npm install tonal-freq](https://nodei.co/npm/tonal-freq.png?mini=true)](https://npmjs.org/package/tonal-freq/)
 *
 * ## API Documentation
 *
 * @module freq
 */
function round(m, fn) {
  m = m || m === 0 ? Math.pow(10, m) : false;
  return function(v) {
    v = fn(v);
    return v === null ? null : m ? Math.round(v * m) / m : v;
  };
}

/**
 * Return the equal tempered frequency of a note.
 *
 * This function can be partially applied if note parameter is not present.
 * @function
 * @param {Float} ref - the tuning reference
 * @param {Integer} maxDecimals - (Optional) the maximum number of decimals (all by default)
 * @param {String|Pitch} note - the note to get the frequency from
 * @return {Number} the frequency
 * @example
 * eqTempFreq(444, 4, 'C3')
 * const toFreq = eqTempFreq(444, 2)
 * toFreq('A3') // => 222
 */
function eqTempFreq(ref, max, note$$1) {
  if (arguments.length > 2) { return eqTempFreq(ref, max)(note$$1); }
  return round(max, function(p) {
    var m = toMidi$1(p);
    return m ? Math.pow(2, (m - 69) / 12) * ref : null;
  });
}

/**
 * Get the frequency of note with 2 decimals precission using A4 440Hz tuning
 *
 * This is an alias for: `eqTempFreq(440, 2, <note>)`
 *
 * @function
 * @param {Number|String} note - the note name or midi number
 * @return {Float} the frequency in herzs
 * @example
 * freq.toFreq('A4') // => 440
 * freq.toFreq('C4') // => 261.63
 */
var toFreq = eqTempFreq(440, 2);

/**
 * Get the midi note from a frequency in equal temperament scale. You can
 * specify the number of decimals of the midi number.
 *
 * @param {Float} tuning - (Optional) the reference A4 tuning (440Hz by default)
 * @param {Number} freq - the frequency
 * @return {Number} the midi number
 */
function eqTempFreqToMidi(ref, max, freq) {
  if (arguments.length > 2) { return eqTempFreqToMidi(ref, max)(freq); }
  return round(max, function(freq) {
    return 12 * (Math.log(freq) - Math.log(ref)) / Math.log(2) + 69;
  });
}

/**
 * Get midi number from frequency with two decimals of precission.
 *
 * This is an alisas for: `eqTempFreqToMidi(440, 2, <freq>)`
 *
 * @function
 * @param {Float} freq
 * @return {Number} midi number
 * @example
 * freq.toMidi(361) // => 59.96
 */
var toMidi$2 = eqTempFreqToMidi(440, 2);

/**
 * Get note name from frequency using an equal temperament scale with 440Hz
 * as reference
 *
 * @param {Float} freq
 * @param {Boolean} useSharps - (Optional) set to true to use sharps instead of flats
 * @return {String} note name
 * @example
 * freq.note(440) // => 'A4'
 */
function note$3(freq, useSharps) {
  return note$2(toMidi$2(freq), useSharps);
}

/**
 * Get difference in cents between two frequencies. The frequencies can be
 * expressed with hertzs or midi numbers or note names
 * @param {Float|Integer|String} base
 * @param {Float|Integer|String} freq
 * @return {Integer} The difference in cents
 * @example
 * import { cents } from 'tonal-freq'
 * cents('C4', 261) // => -4
 */
function cents(base, freq) {
  var b = toFreq(base) || base;
  var f = toFreq(freq) || freq;
  return Math.round(1200 * (Math.log(f / b) / Math.log(2)));
}


var freq$3 = Object.freeze({
	eqTempFreq: eqTempFreq,
	toFreq: toFreq,
	eqTempFreqToMidi: eqTempFreqToMidi,
	toMidi: toMidi$2,
	note: note$3,
	cents: cents
});

/**
 * [![npm version](https://img.shields.io/npm/v/tonal-pcset.svg?style=flat-square)](https://www.npmjs.com/package/tonal-pcset)
 * [![tonal](https://img.shields.io/badge/tonal-pcset-yellow.svg?style=flat-square)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-pcset` is a collection of functions to work with pitch class sets, oriented
 * to make comparations (isEqual, isSubset, isSuperset)
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * You can install via npm: `npm i --save tonal-pcset`
 *
 * ```js
 * var pcset = require('tonal-pcset')
 * pcset.isEqual('c2 d5 e6', 'c6 e3 d1') // => true
 * ```
 *
 * ## API documentation
 *
 * @module pcset
 */
function chrToInt(set) {
  return parseInt(chroma$3(set), 2);
}
function pitchChr(p) {
  p = asPitch(p);
  return p ? chr(p) : null;
}

/**
 * Get chroma of a pitch class set. A chroma identifies each set uniquely.
 * It's a 12-digit binary each presenting one semitone of the octave.
 *
 * Note that this function accepts a chroma as parameter and return it
 * without modification.
 *
 * @param {Array|String} set - the pitch class set
 * @return {String} a binary representation of the pitch class set
 * @example
 * pcset.chroma('C D E') // => '1010100000000'
 */
function chroma$3(set) {
  if (isChroma(set)) { return set; }
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  map(pitchChr, set).forEach(function (i) {
    b[i] = 1;
  });
  return b.join("");
}

/**
 * @deprecated
 * @see collection.pcset
 * Given a list of notes, return the pitch class names of the set
 * starting with the first note of the list
 * @param {String|Array} notes - the pitch class set notes
 * @return {Array} an array of pitch class sets
 */
function notes(notes) {
  // FIXME: move to collection
  console.warn("pcset.notes deprecated. Use collection.pcset");
  var pcs = map(pc$1, notes);
  if (!pcs.length) { return pcs; }
  var tonic = pcs[0];
  // since the first note of the chroma is always C, we have to rotate it
  var rotated = rotate(pitchChr(tonic), chroma$3(pcs).split("")).join("");
  return fromChroma(rotated, tonic);
}

/**
 * Given a a list of notes or a pcset chroma, produce the rotations
 * of the chroma discarding the ones that starts with '0'
 *
 * This is used, for example, to get all the modes of a scale.
 *
 * @param {Array|String} set - the list of notes or pitchChr of the set
 * @param {Boolean} normalize - (Optional, true by default) remove all
 * the rotations that starts with '0'
 * @return {Array<String>} an array with all the modes of the chroma
 *
 * @example
 * pcset.modes('C E G')
 */
function modes(set, normalize) {
  normalize = normalize !== false;
  var binary = chroma$3(set).split("");
  return compact(
    binary.map(function(_, i) {
      var r = rotate(i, binary);
      return normalize && r[0] === "0" ? null : r.join("");
    })
  );
}

var REGEX$3 = /^[01]{12}$/;
/**
 * Test if the given string is a pitch class set chroma.
 * @param {String} chroma - the pitch class set chroma
 * @return {Boolean} true if its a valid pcset chroma
 * @example
 * pcset.isChroma('101010101010') // => true
 * pcset.isChroma('101001') // => false
 */
function isChroma(set) {
  return REGEX$3.test(set);
}

var IVLS = "1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M".split(" ");
/**
 * Given a pcset (notes or chroma) return it's intervals
 * @param {String|Array} pcset - the pitch class set (notes or chroma)
 * @return {Array} intervals or empty array if not valid pcset
 * @example
 * pcset.intervals('1010100000000') => ['C', 'D', 'E']
 */
function intervals(set) {
  return compact(
    chroma$3(set)
      .split("")
      .map(function(d, i) {
        return d === "1" ? IVLS[i] : null;
      })
  );
}

/**
 * @deprecated
 * @see intervals
 * Given a pitch class set in binary notation it returns the intervals or notes
 * (depending on the tonic)
 * @param {String} binary - the pitch class set in binary representation
 * @param {String|Pitch} tonic - the pitch class set tonic
 * @return {Array} a list of notes or intervals
 * @example
 * pcset.fromChroma('101010101010', 'C') // => ['C', 'D', 'E', 'Gb', 'Ab', 'Bb']
 */
function fromChroma(binary, tonic) {
  console.warn(
    "pcset.fromChroma is deprecated. Use pcset.intervals().map(...)"
  );
  if (arguments.length === 1)
    { return function(t) {
      return fromChroma(binary, t);
    }; }
  if (!tonic) { tonic = "P1"; }
  return intervals(binary).map(transpose(tonic));
}

/**
 * Test if two pitch class sets are identical
 *
 * @param {Array|String} set1 - one of the pitch class sets
 * @param {Array|String} set2 - the other pitch class set
 * @return {Boolean} true if they are equal
 * @example
 * pcset.isEqual('c2 d3', 'c5 d2') // => true
 */
function isEqual(s1, s2) {
  if (arguments.length === 1)
    { return function(s) {
      return isEqual(s1, s);
    }; }
  return chroma$3(s1) === chroma$3(s2);
}

/**
 * Test if a pitch class set is a subset of another
 *
 * @param {Array|String} test - the set to test
 * @param {Array|String} set - the base set to test against
 * @return {Boolean} true if the test set is a subset of the set
 * @example
 * pcset.subset('c d e', 'C2 D4 D5 C6') // => true
 */
function isSubset(test, set) {
  test = chrToInt(test);
  return (test & chrToInt(set)) === test;
}

/**
 * Test if a pitch class set is a superset
 *
 * @param {Array|String} test - the set to test
 * @param {Array|String} set - the base set to test against
 * @return {Boolean} true if the test set is a superset of the set
 * @example
 * pcset.isSuperset('c d e', 'C2 D4 F4 D5 E5 C6') // => true
 */
function isSuperset(test, set) {
  test = chrToInt(test);
  return (test | chrToInt(set)) === test;
}

/**
 * Test if a given pitch class set includes a note
 * @param {Array|String} set - the base set to test against
 * @param {String|Pitch} note - the note to test
 * @return {Boolean} true if the note is included in the pcset
 * @example
 * pcset.includes('c d e', 'C4') // =A true
 * pcset.includes('c d e', 'C#4') // =A false
 */
function includes(set, note$$1) {
  if (arguments.length > 1) { return includes(set)(note$$1); }
  set = chroma$3(set);
  return function(note$$1) {
    return set[pitchChr(note$$1)] === "1";
  };
}

/**
 * Filter a list with a pitch class set
 *
 * @param {Array|String} set - the pitch class set notes
 * @param {Array|String} notes - the note list to be filtered
 * @return {Array} the filtered notes
 *
 * @example
 * pcset.filter('c d e', 'c2 c#2 d2 c3 c#3 d3') // => [ 'c2', 'd2', 'c3', 'd3' ])
 * pcset.filter('c2', 'c2 c#2 d2 c3 c#3 d3') // => [ 'c2', 'c3' ])
 */
function filter$1(set, notes) {
  if (arguments.length === 1)
    { return function(n) {
      return filter$1(set, n);
    }; }
  return asArr(notes).filter(includes(set));
}


var pcset = Object.freeze({
	chroma: chroma$3,
	notes: notes,
	modes: modes,
	isChroma: isChroma,
	intervals: intervals,
	fromChroma: fromChroma,
	isEqual: isEqual,
	isSubset: isSubset,
	isSuperset: isSuperset,
	includes: includes,
	filter: filter$1
});

/**
 * A collection of functions to create note ranges.
 *
 * @example
 * var range = require('tonal-range')
 * // ascending chromatic range
 * range.chromatic(['C4', 'E4']) // => ['C4', 'Db4', 'D4', 'Eb4', 'E4']
 * // descending chromatic range
 * range.chromatic(['E4', 'C4']) // => ['E4', 'Eb4', 'D4', 'Db4', 'C4']
 * // combining ascending and descending in complex ranges
 * range.chromatic(['C2', 'E2', 'D2']) // => ['C2', 'Db2', 'D2', 'Eb2', 'E2', 'Eb2', 'D2']
 * // numeric (midi note numbers) range
 * range.numeric('C4 E4 Bb3') // => [60, 61, 62, 63, 64]
 * // complex numeric range
 * range.numeric('C4 E4 Bb3') // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
 * // create a scale range
 * range.pitchSet('c e g a', 'c2 c3 c2') // => [ 'C2', 'E2', 'G2', 'A2', 'C3', 'A2', 'G2', 'E2', 'C2' ] *
 g
 * @module range
 */
function isNum$3(n) {
  return typeof n === "number";
}
// convert notes to midi if needed
function asNum(n) {
  return isNum$3(n) ? n : toMidi$1(n);
}
// ascending range
function ascR(b, n) {
  for (var a = []; n--; a[n] = n + b){  }
  return a;
}
// descending range
function descR(b, n) {
  for (var a = []; n--; a[n] = b - n){  }
  return a;
}
// create a range between a and b
function ran(a, b) {
  return a === null || b === null
    ? []
    : a < b ? ascR(a, b - a + 1) : descR(a, a - b + 1);
}

/**
 * Create a numeric range. You supply a list of notes or numbers and it will
 * be conected to create complex ranges.
 *
 * @param {String|Array} list - the list of notes or numbers used
 * @return {Array} an array of numbers or empty array if not vald parameters
 *
 * @example
 * range.numeric(["C5", "C4']) // => [ 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60 ]
 * // it works midi notes
 * range.numeric([10, 5]) // => [ 10, 9, 8, 7, 6, 5 ]
 * // complex range
 * range.numeric('C4 E4 Bb3') // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
 * // can be expressed with a string or array
 * range.numeric('C2 C4 C2') === range.numeric(['C2', 'C4', 'C2'])
 */
function numeric(list) {
  return asArr(list)
    .map(asNum)
    .reduce(function(r, n, i) {
      if (i === 1) { return ran(r, n); }
      var last = r[r.length - 1];
      return r.concat(ran(last, n).slice(1));
    });
}

/**
 * Create a range of chromatic notes. The altered notes will use flats.
 *
 * @function
 * @param {String|Array} list - the list of notes or midi note numbers
 * @return {Array} an array of note names
 * @example
 * tonal.chromatic('C2 E2 D2') // => ['C2', 'Db2', 'D2', 'Eb2', 'E2', 'Eb2', 'D2']
 * // with sharps
 * tonal.chromatic('C2 C3', true) // => [ 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3' ]
 */
function chromatic(list, sharps) {
  return map(note$2(sharps === true), numeric(list));
}

/**
 * Create a range with a cycle of fifths
 * @function
 * @param {String|Pitch} tonic - the tonic note or pitch class
 * @param {Array|String} range - the range array
 * @return {Array} a range of cycle of fifths starting with the tonic
 * @example
 * range.fifths('C', [0, 6]) // => [ 'C', 'G', 'D', 'A', 'E', 'B', 'F#' ])
 */
function fifths$1(tonic, range) {
  return numeric(range).map(trFifths(tonic));
}

/**
 * Create a pitch set (scale or chord) range. Given a pitch set (a collection
 * of pitch classes), and a range array, it returns a range in notes.
 *
 * @param {String|Array|Function} scale - the scale to use or a function to
 * convert from midi numbers to note names
 * @param {String|Array} range - a list of notes or midi numbers
 * @return {Array} the scale range, an empty array if not valid source or
 * null if not valid start or end
 * @example
 * range.pitchSet('C D E F G A B', ['C3', 'C2'])
 * // => [ 'C3', 'B2', 'A2', 'G2', 'F2', 'E2', 'D2', 'C2' ]
 */
function pitchSet(set, range) {
  if (arguments.length === 1)
    { return function(l) {
      return pitchSet(set, l);
    }; }

  return filter$1(set, chromatic(range));
}


var range = Object.freeze({
	numeric: numeric,
	chromatic: chromatic,
	fifths: fifths$1,
	pitchSet: pitchSet
});

/**
 * Functions related to music notation in strings. Things like parse accidentals,
 * or convert from step to note letter.
 *
 * Glossary:
 *
 * - step: the number from 0 to 6 representing the letters from C to B
 * - letter: a valid note letter (from A to G)
 * - alteration: a number indicating the sharps (positive) or flats (negative)
 * - accidentals: a string with sharps (#) or flats (b)
 *
 * @example
 * var notation = require('tonal-notation')
 * notation.toAcc('3') // => '###'
 * notation.toAcc('-3') // => 'bbb'
 * notation.toAlt('###') // => 3
 * @module notation
 */

/**
 * Given a letter, return step
 * @param {String} letter - the letter
 * @return {Integer} the step number (from 0 to 6)
 */
function toStep(l) {
  var s = "CDEFGAB".indexOf(l.toUpperCase());
  return s < 0 ? null : s;
}

/**
 * Test if a number is a valid step number (a number from 0 to 6)
 * @param {Integer} step - the step number
 * @return {Boolean} true if it's a valid step number, false otherwise
 */
function isStep(d) {
  return !(d < 0 || d > 6);
}

/**
 * Given a step, return a letter
 * @param {Integer} step - the step number
 * @return {String} the note letter or null if not valid step number
 */
function toLetter(s) {
  return isStep(s) ? "CDEFGAB".charAt(s) : null;
}

// ACCIDENTALS
// ===========

/**
 * Test if a string are all flats (`b`) chars
 * @param {String} str - the string to test
 * @return {Boolean} true if all charaters are `b`, false otherwise
 */
function areFlats(s) {
  return /^b+$/.test(s);
}
/**
 * Test if a string are all sharps (`#`) chars
 * @param {String} str - the string to test
 * @return {Boolean} true if all charaters are `#`, false otherwise
 */
function areSharps(s) {
  return /^#+$/.test(s);
}

/**
 * Given an accidentals string return its alteration, the number
 * of semitones (positive for sharps, negative for flats, 0 for none)
 * @param {String} accidentals - the string to parse
 * @return {Integer} the alteration number of null if not a valid accidental strings
 * @example
 * toAlt('###') // => 3
 * toAlt('bbb') // => -3
 */
function toAlt(s) {
  return s === ""
    ? 0
    : areFlats(s) ? -s.length : areSharps(s) ? s.length : null;
}

function fillStr$5(s, num) {
  return Array(num + 1).join(s);
}

/**
 * Given an alteration number, returns the accidentals string
 * @param {Integer} alteration - the number of semitones (positive and negative
 * values are accepted for sharps and flats)
 * @return {String} the accidental string
 * @example
 * toAcc(3) // => '###'
 * toAcc(-3) // => 'bbb'
 */
function toAcc(n) {
  return !n ? "" : n < 0 ? fillStr$5("b", -n) : fillStr$5("#", n);
}


var notation = Object.freeze({
	toStep: toStep,
	isStep: isStep,
	toLetter: toLetter,
	areFlats: areFlats,
	areSharps: areSharps,
	toAlt: toAlt,
	toAcc: toAcc
});

/**
 * _Key_ refers to the tonal system based on the major and minor scales. This is
 * is the most common tonal system, but tonality can be present in music
 * based in other scales or concepts.
 *
 * This is a collection of functions related to keys.
 *
 * @example
 * var key = require('tonal-key')
 * key.scale('E mixolydian') // => [ 'E', 'F#', 'G#', 'A', 'B', 'C#', 'D' ]
 * key.relative('minor', 'C major') // => 'A minor'
 *
 * @module key
 */

var MODES = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
  "major",
  "minor"
];
// { C: 0, D: 2, E: 4, F: -1, G: 1, A: 3, B: 5 }
var FIFTHS$1 = [0, 2, 4, -1, 1, 3, 5, 0, 3];
var SCALES = [0, 1, 2, 3, 4, 5, 6, 0, 5].map(function(n) {
  return harmonics(rotate(n, ["C", "D", "E", "F", "G", "A", "B"]));
});

// PRIVATE
// Given a tonic, mode pair, return the key string
function toKey(t, m) {
  return !t ? m : t + " " + m;
}
// Given the alterations, return the major key
function majorKey(n) {
  return toKey(trFifths("C", n), "major");
}
// given the mode name, return the alterations
function modeNum(mode) {
  return FIFTHS$1[MODES.indexOf(mode)];
}
// given a string, return the valid mode it represents or null
function validMode(m) {
  m = m.trim().toLowerCase();
  return MODES.indexOf(m) === -1 ? null : m;
}

/**
 * Return the key properties, an object with { tonic, mode }
 *
 * @param {String} name - the key name
 * @return {Key} the key properties object or null if not a valid key
 * @example
 * var key = require('tonal-key')
 * key.props('C3 dorian') // => { tonic: 'C', mode: 'dorian' }
 * key.props('dorian') // => { tonic: false, mode: 'dorian' }
 * key.props('Ab bebop') // => null
 * key.props('blah') // => null
 */
function props$1(str) {
  if (typeof str !== "string") { return null; }
  var ndx = str.indexOf(" ");
  var key;
  if (ndx === -1) {
    var p = pc$1(str);
    key = p
      ? { tonic: p, mode: "major" }
      : { tonic: false, mode: validMode(str) };
  } else {
    key = { tonic: pc$1(str.slice(0, ndx)), mode: validMode(str.slice(ndx + 1)) };
  }
  return key.mode ? key : null;
}

/**
 * Test if a given name is a valid key name
 *
 * @param {String} name
 * @param {Boolean}
 * @example
 * key.isKeyName('C major') // => true
 * key.isKeyName('major') // => true
 * key.isKeyName('Bb bebop') // => false
 */
function isKeyName(name$$1) {
  return props$1(name$$1) !== null;
}

/**
 * Get the tonic of a key
 *
 * @param {String} key - the key
 * @return {String} the tonic or false is no tonic, or null if its not a valid key
 * @example
 * key.tonic('c3 major') // => 'C'
 * key.tonic('minor') // => false
 * key.tonic('bebop') // null
 */
function tonic(key) {
  return (props$1(key) || key || {}).tonic || null;
}

/**
 * Get the mode of a key. It can be used to test if its a valid key mode.
 *
 * @param {String}
 * @return {Boolean}
 * @example
 * key.mode('A dorian') // => 'dorian'
 * key.mode('DORIAN') // => 'dorian'
 * key.mode('mixophrygian') // => null
 */
function mode(key) {
  return (props$1(key) || key || {}).mode || null;
}

/**
 * Get relative of a key. Two keys are relative when the have the same
 * key signature (for example C major and A minor)
 *
 * It can be partially applied.
 *
 * @param {String} mode - the relative destination
 * @param {String} key - the key source
 * @example
 * key.relative('dorian', 'B major') // => 'C# dorian'
 * // partial application
 * var minor = key.relative('minor')
 * minor('C major') // => 'A minor'
 * minor('E major') // => 'C# minor'
 */
function relative(rel, key) {
  if (arguments.length === 1)
    { return function(k) {
      return relative(rel, k);
    }; }
  rel = props$1(rel);
  if (!rel || rel.tonic) { return null; }
  key = props$1(key);
  if (!key || !key.tonic) { return null; }
  var tonic = trFifths(key.tonic, modeNum(rel.mode) - modeNum(key.mode));
  return toKey(tonic, rel.mode);
}

/**
 * Get a list of the altered notes of a given key. The notes will be in
 * the same order than in the key signature.
 * @param {String|Nunber} key
 * @return {Array}
 * @example
 * var key = require('tonal-keys')
 * key.alteredNotes('Eb major') // => [ 'Bb', 'Eb', 'Ab' ]
 */
function alteredNotes(key) {
  var alt = alteration(key);
  return alt === null
    ? null
    : alt < 0
      ? numeric([-1, alt]).map(trFifths("F"))
      : numeric([1, alt]).map(trFifths("B"));
}

/**
 * Get a list of valid mode names. The list of modes will be always in
 * increasing order (ionian to locrian)
 *
 * @param {Boolean} alias - true to get aliases names
 * @return {Array} an array of strings
 * @example
 * key.modes() // => [ 'ionian', 'dorian', 'phrygian', 'lydian',
 * // 'mixolydian', 'aeolian', 'locrian' ]
 * key.modes(true) // => [ 'ionian', 'dorian', 'phrygian', 'lydian',
 * // 'mixolydian', 'aeolian', 'locrian', 'major', 'minor' ]
 */
function modes$1(alias) {
  return alias ? MODES.slice() : MODES.slice(0, -2);
}

/**
 * Create a major key from alterations
 * @function
 * @param {Integer} alt - the alteration number (positive sharps, negative flats)
 * @return {Key} the key object
 * @example
 * var key = require('tonal-key')
 * key.fromAlter(2) // => 'D major'
 */
function fromAlter(n) {
  return typeof n === "number" ? majorKey(n) : null;
}

/**
 * Get key name from accidentals
 *
 * @param {String} acc - the accidentals string
 * @return {Key} the key object
 * @example
 * var key = require('tonal-key')
 * key.fromAcc('b') // => 'F major'
 * key.fromAcc('##') // => 'D major'
 */
function fromAcc(s) {
  return areSharps(s)
    ? majorKey(s.length)
    : areFlats(s) ? majorKey(-s.length) : null;
}

/**
 * Get scale of a key
 *
 * @param {String|Object} key
 * @return {Array} the key scale
 * @example
 * key.scale('A major') // => [ 'A', 'B', 'C#', 'D', 'E', 'F#', 'G#' ]
 * key.scale('Bb minor') // => [ 'Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab' ]
 * key.scale('C dorian') // => [ 'C', 'D', 'Eb', 'F', 'G', 'A', 'Bb' ]
 * key.scale('E mixolydian') // => [ 'E', 'F#', 'G#', 'A', 'B', 'C#', 'D' ]
 */
function scale(key) {
  var p = props$1(key);
  if (!p || !p.tonic) { return null; }
  return harmonize(SCALES[MODES.indexOf(p.mode)], p.tonic);
}

/**
 * Get key alteration. The alteration is a number indicating the number of
 * sharpen notes (positive) or flaten notes (negative)
 * @param {String|Integer} key
 * @return {Integer}
 * @example
 * var key = require('tonal-keys')
 * key.alteration('A major') // => 3
 */
function alteration(key) {
  var k = props$1(key);
  if (!k || !k.tonic) { return null; }
  var toMajor = modeNum(k.mode);
  var toC = pcFifths(k.tonic);
  return toC - toMajor;
}

/**
 * Get the signature of a key. The signature is a string with sharps or flats.
 * @example
 * var key = require('tonal-keys')
 * key.signature('A major') // => '###'
 */
function signature(key) {
  return toAcc(alteration(key));
}

/**
 * An alias for `signature()`
 * @function
 */
var accidentals = signature;


var key = Object.freeze({
	props: props$1,
	isKeyName: isKeyName,
	tonic: tonic,
	mode: mode,
	relative: relative,
	alteredNotes: alteredNotes,
	modes: modes$1,
	fromAlter: fromAlter,
	fromAcc: fromAcc,
	scale: scale,
	alteration: alteration,
	signature: signature,
	accidentals: accidentals
});

var chromatic$1 = ["1P 2m 2M 3m 3M 4P 4A 5P 6m 6M 7m 7M"];
var lydian = ["1P 2M 3M 4A 5P 6M 7M"];
var major = ["1P 2M 3M 4P 5P 6M 7M",["ionian"]];
var mixolydian = ["1P 2M 3M 4P 5P 6M 7m",["dominant"]];
var dorian = ["1P 2M 3m 4P 5P 6M 7m"];
var aeolian = ["1P 2M 3m 4P 5P 6m 7m",["minor"]];
var phrygian = ["1P 2m 3m 4P 5P 6m 7m"];
var locrian = ["1P 2m 3m 4P 5d 6m 7m"];
var altered = ["1P 2m 3m 3M 5d 6m 7m",["super locrian","diminished whole tone","pomeroy"]];
var iwato = ["1P 2m 4P 5d 7m"];
var hirajoshi = ["1P 2M 3m 5P 6m"];
var kumoijoshi = ["1P 2m 4P 5P 6m"];
var pelog = ["1P 2m 3m 5P 6m"];
var prometheus = ["1P 2M 3M 4A 6M 7m"];
var ritusen = ["1P 2M 4P 5P 6M"];
var scriabin = ["1P 2m 3M 5P 6M"];
var piongio = ["1P 2M 4P 5P 6M 7m"];
var augmented = ["1P 2A 3M 5P 5A 7M"];
var neopolitan = ["1P 2m 3m 4P 5P 6m 7M"];
var diminished = ["1P 2M 3m 4P 5d 6m 6M 7M"];
var egyptian = ["1P 2M 4P 5P 7m"];
var oriental = ["1P 2m 3M 4P 5d 6M 7m"];
var spanish = ["1P 2m 3M 4P 5P 6m 7m",["phrygian major"]];
var flamenco = ["1P 2m 3m 3M 4A 5P 7m"];
var balinese = ["1P 2m 3m 4P 5P 6m 7M"];
var persian = ["1P 2m 3M 4P 5d 6m 7M"];
var bebop = ["1P 2M 3M 4P 5P 6M 7m 7M"];
var enigmatic = ["1P 2m 3M 5d 6m 7m 7M"];
var ichikosucho = ["1P 2M 3M 4P 5d 5P 6M 7M"];
var scalesData = {
	chromatic: chromatic$1,
	lydian: lydian,
	major: major,
	mixolydian: mixolydian,
	dorian: dorian,
	aeolian: aeolian,
	phrygian: phrygian,
	locrian: locrian,
	altered: altered,
	iwato: iwato,
	hirajoshi: hirajoshi,
	kumoijoshi: kumoijoshi,
	pelog: pelog,
	prometheus: prometheus,
	ritusen: ritusen,
	scriabin: scriabin,
	piongio: piongio,
	augmented: augmented,
	neopolitan: neopolitan,
	diminished: diminished,
	egyptian: egyptian,
	oriental: oriental,
	spanish: spanish,
	flamenco: flamenco,
	balinese: balinese,
	persian: persian,
	bebop: bebop,
	enigmatic: enigmatic,
	ichikosucho: ichikosucho,
	"melodic minor": ["1P 2M 3m 4P 5P 6M 7M"],
	"melodic minor second mode": ["1P 2m 3m 4P 5P 6M 7m"],
	"lydian augmented": ["1P 2M 3M 4A 5A 6M 7M"],
	"lydian dominant": ["1P 2M 3M 4A 5P 6M 7m",["lydian b7"]],
	"melodic minor fifth mode": ["1P 2M 3M 4P 5P 6m 7m",["hindu","mixolydian b6M"]],
	"locrian #2": ["1P 2M 3m 4P 5d 6m 7m"],
	"locrian major": ["1P 2M 3M 4P 5d 6m 7m",["arabian"]],
	"major pentatonic": ["1P 2M 3M 5P 6M",["pentatonic"]],
	"lydian pentatonic": ["1P 3M 4A 5P 7M",["chinese"]],
	"mixolydian pentatonic": ["1P 3M 4P 5P 7m",["indian"]],
	"locrian pentatonic": ["1P 3m 4P 5d 7m",["minor seven flat five pentatonic"]],
	"minor pentatonic": ["1P 3m 4P 5P 7m"],
	"minor six pentatonic": ["1P 3m 4P 5P 6M"],
	"minor hexatonic": ["1P 2M 3m 4P 5P 7M"],
	"flat three pentatonic": ["1P 2M 3m 5P 6M",["kumoi"]],
	"flat six pentatonic": ["1P 2M 3M 5P 6m"],
	"major flat two pentatonic": ["1P 2m 3M 5P 6M"],
	"whole tone pentatonic": ["1P 3M 5d 6m 7m"],
	"ionian pentatonic": ["1P 3M 4P 5P 7M"],
	"lydian #5P pentatonic": ["1P 3M 4A 5A 7M"],
	"lydian dominant pentatonic": ["1P 3M 4A 5P 7m"],
	"minor #7M pentatonic": ["1P 3m 4P 5P 7M"],
	"super locrian pentatonic": ["1P 3m 4d 5d 7m"],
	"in-sen": ["1P 2m 4P 5P 7m"],
	"vietnamese 1": ["1P 3m 4P 5P 6m"],
	"vietnamese 2": ["1P 3m 4P 5P 7m"],
	"prometheus neopolitan": ["1P 2m 3M 4A 6M 7m"],
	"major blues": ["1P 2M 3m 3M 5P 6M"],
	"minor blues": ["1P 3m 4P 5d 5P 7m",["blues"]],
	"composite blues": ["1P 2M 3m 3M 4P 5d 5P 6M 7m"],
	"augmented heptatonic": ["1P 2A 3M 4P 5P 5A 7M"],
	"dorian #4": ["1P 2M 3m 4A 5P 6M 7m"],
	"lydian diminished": ["1P 2M 3m 4A 5P 6M 7M"],
	"whole tone": ["1P 2M 3M 4A 5A 7m"],
	"leading whole tone": ["1P 2M 3M 4A 5A 7m 7M"],
	"harmonic minor": ["1P 2M 3m 4P 5P 6m 7M"],
	"lydian minor": ["1P 2M 3M 4A 5P 6m 7m"],
	"neopolitan minor": ["1P 2m 3m 4P 5P 6m 7M"],
	"neopolitan major": ["1P 2m 3m 4P 5P 6M 7M",["dorian b2"]],
	"neopolitan major pentatonic": ["1P 3M 4P 5d 7m"],
	"romanian minor": ["1P 2M 3m 5d 5P 6M 7m"],
	"double harmonic lydian": ["1P 2m 3M 4A 5P 6m 7M"],
	"harmonic major": ["1P 2M 3M 4P 5P 6m 7M"],
	"double harmonic major": ["1P 2m 3M 4P 5P 6m 7M",["gypsy"]],
	"hungarian minor": ["1P 2M 3m 4A 5P 6m 7M"],
	"hungarian major": ["1P 2A 3M 4A 5P 6M 7m"],
	"spanish heptatonic": ["1P 2m 3m 3M 4P 5P 6m 7m"],
	"todi raga": ["1P 2m 3m 4A 5P 6m 7M"],
	"malkos raga": ["1P 3m 4P 6m 7m"],
	"kafi raga": ["1P 3m 3M 4P 5P 6M 7m 7M"],
	"purvi raga": ["1P 2m 3M 4P 4A 5P 6m 7M"],
	"bebop dominant": ["1P 2M 3M 4P 5P 6M 7m 7M"],
	"bebop minor": ["1P 2M 3m 3M 4P 5P 6M 7m"],
	"bebop major": ["1P 2M 3M 4P 5P 5A 6M 7M"],
	"bebop locrian": ["1P 2m 3m 4P 5d 5P 6m 7m"],
	"minor bebop": ["1P 2M 3m 4P 5P 6m 7m 7M"],
	"mystery #1": ["1P 2m 3M 5d 6m 7m"],
	"minor six diminished": ["1P 2M 3m 4P 5P 6m 6M 7M"],
	"ionian augmented": ["1P 2M 3M 4P 5A 6M 7M"],
	"lydian #9": ["1P 2m 3M 4A 5P 6M 7M"],
	"six tone symmetric": ["1P 2m 3M 4P 5A 6M"]
};

var M = ["1P 3M 5P",["Major",""]];
var M13 = ["1P 3M 5P 7M 9M 13M",["maj13","Maj13"]];
var M6 = ["1P 3M 5P 13M",["6"]];
var M69 = ["1P 3M 5P 6M 9M",["69"]];
var M7add13 = ["1P 3M 5P 6M 7M 9M"];
var M7b5 = ["1P 3M 5d 7M"];
var M7b6 = ["1P 3M 6m 7M"];
var M7b9 = ["1P 3M 5P 7M 9m"];
var M7sus4 = ["1P 4P 5P 7M"];
var M9 = ["1P 3M 5P 7M 9M",["maj9","Maj9"]];
var M9b5 = ["1P 3M 5d 7M 9M"];
var M9sus4 = ["1P 4P 5P 7M 9M"];
var Madd9 = ["1P 3M 5P 9M",["2","add9","add2"]];
var Maj7 = ["1P 3M 5P 7M",["maj7","M7"]];
var Mb5 = ["1P 3M 5d"];
var Mb6 = ["1P 3M 13m"];
var Msus2 = ["1P 2M 5P",["add9no3","sus2"]];
var Msus4 = ["1P 4P 5P",["sus","sus4"]];
var addb9 = ["1P 3M 5P 9m"];
var m = ["1P 3m 5P"];
var m11 = ["1P 3m 5P 7m 9M 11P",["_11"]];
var m11b5 = ["1P 3m 7m 12d 2M 4P",["h11","_11b5"]];
var m13 = ["1P 3m 5P 7m 9M 11P 13M",["_13"]];
var m6 = ["1P 3m 4P 5P 13M",["_6"]];
var m69 = ["1P 3m 5P 6M 9M",["_69"]];
var m7 = ["1P 3m 5P 7m",["minor7","_","_7"]];
var m7add11 = ["1P 3m 5P 7m 11P",["m7add4"]];
var m7b5 = ["1P 3m 5d 7m",["half-diminished","h7","_7b5"]];
var m9 = ["1P 3m 5P 7m 9M",["_9"]];
var m9b5 = ["1P 3m 7m 12d 2M",["h9","-9b5"]];
var mMaj7 = ["1P 3m 5P 7M",["mM7","_M7"]];
var mMaj7b6 = ["1P 3m 5P 6m 7M",["mM7b6"]];
var mM9 = ["1P 3m 5P 7M 9M",["mMaj9","-M9"]];
var mM9b6 = ["1P 3m 5P 6m 7M 9M",["mMaj9b6"]];
var mb6M7 = ["1P 3m 6m 7M"];
var mb6b9 = ["1P 3m 6m 9m"];
var o = ["1P 3m 5d",["mb5","dim"]];
var o7 = ["1P 3m 5d 13M",["diminished","m6b5","dim7"]];
var o7M7 = ["1P 3m 5d 6M 7M"];
var oM7 = ["1P 3m 5d 7M"];
var sus24 = ["1P 2M 4P 5P",["sus4add9"]];
var madd4 = ["1P 3m 4P 5P"];
var madd9 = ["1P 3m 5P 9M"];
var chordsData = {
	M: M,
	M13: M13,
	M6: M6,
	M69: M69,
	M7add13: M7add13,
	M7b5: M7b5,
	M7b6: M7b6,
	M7b9: M7b9,
	M7sus4: M7sus4,
	M9: M9,
	M9b5: M9b5,
	M9sus4: M9sus4,
	Madd9: Madd9,
	Maj7: Maj7,
	Mb5: Mb5,
	Mb6: Mb6,
	Msus2: Msus2,
	Msus4: Msus4,
	addb9: addb9,
	m: m,
	m11: m11,
	m11b5: m11b5,
	m13: m13,
	m6: m6,
	m69: m69,
	m7: m7,
	m7add11: m7add11,
	m7b5: m7b5,
	m9: m9,
	m9b5: m9b5,
	mMaj7: mMaj7,
	mMaj7b6: mMaj7b6,
	mM9: mM9,
	mM9b6: mM9b6,
	mb6M7: mb6M7,
	mb6b9: mb6b9,
	o: o,
	o7: o7,
	o7M7: o7M7,
	oM7: oM7,
	sus24: sus24,
	madd4: madd4,
	madd9: madd9,
	"4": ["1P 4P 7m 10m",["quartal"]],
	"5": ["1P 5P"],
	"7": ["1P 3M 5P 7m",["Dominant","Dom"]],
	"9": ["1P 3M 5P 7m 9M",["79"]],
	"11": ["1P 5P 7m 9M 11P"],
	"13": ["1P 3M 5P 7m 9M 13M",["13_"]],
	"64": ["5P 8P 10M"],
	"M#5": ["1P 3M 5A",["augmented","maj#5","Maj#5","+","aug"]],
	"M#5add9": ["1P 3M 5A 9M",["+add9"]],
	"M13#11": ["1P 3M 5P 7M 9M 11A 13M",["maj13#11","Maj13#11","M13+4","M13#4"]],
	"M6#11": ["1P 3M 5P 6M 11A",["M6b5","6#11","6b5"]],
	"M69#11": ["1P 3M 5P 6M 9M 11A"],
	"M7#11": ["1P 3M 5P 7M 11A",["maj7#11","Maj7#11","M7+4","M7#4"]],
	"M7#5": ["1P 3M 5A 7M",["maj7#5","Maj7#5","maj9#5","M7+"]],
	"M7#5sus4": ["1P 4P 5A 7M"],
	"M7#9#11": ["1P 3M 5P 7M 9A 11A"],
	"M9#11": ["1P 3M 5P 7M 9M 11A",["maj9#11","Maj9#11","M9+4","M9#4"]],
	"M9#5": ["1P 3M 5A 7M 9M",["Maj9#5"]],
	"M9#5sus4": ["1P 4P 5A 7M 9M"],
	"11b9": ["1P 5P 7m 9m 11P"],
	"13#11": ["1P 3M 5P 7m 9M 11A 13M",["13+4","13#4"]],
	"13#9": ["1P 3M 5P 7m 9A 13M",["13#9_"]],
	"13#9#11": ["1P 3M 5P 7m 9A 11A 13M"],
	"13b5": ["1P 3M 5d 6M 7m 9M"],
	"13b9": ["1P 3M 5P 7m 9m 13M"],
	"13b9#11": ["1P 3M 5P 7m 9m 11A 13M"],
	"13no5": ["1P 3M 7m 9M 13M"],
	"13sus4": ["1P 4P 5P 7m 9M 13M",["13sus"]],
	"69#11": ["1P 3M 5P 6M 9M 11A"],
	"7#11": ["1P 3M 5P 7m 11A",["7+4","7#4","7#11_","7#4_"]],
	"7#11b13": ["1P 3M 5P 7m 11A 13m",["7b5b13"]],
	"7#5": ["1P 3M 5A 7m",["+7","7aug","aug7"]],
	"7#5#9": ["1P 3M 5A 7m 9A",["7alt","7#5#9_","7#9b13_"]],
	"7#5b9": ["1P 3M 5A 7m 9m"],
	"7#5b9#11": ["1P 3M 5A 7m 9m 11A"],
	"7#5sus4": ["1P 4P 5A 7m"],
	"7#9": ["1P 3M 5P 7m 9A",["7#9_"]],
	"7#9#11": ["1P 3M 5P 7m 9A 11A",["7b5#9"]],
	"7#9#11b13": ["1P 3M 5P 7m 9A 11A 13m"],
	"7#9b13": ["1P 3M 5P 7m 9A 13m"],
	"7add6": ["1P 3M 5P 7m 13M",["67","7add13"]],
	"7b13": ["1P 3M 7m 13m"],
	"7b5": ["1P 3M 5d 7m"],
	"7b6": ["1P 3M 5P 6m 7m"],
	"7b9": ["1P 3M 5P 7m 9m"],
	"7b9#11": ["1P 3M 5P 7m 9m 11A",["7b5b9"]],
	"7b9#9": ["1P 3M 5P 7m 9m 9A"],
	"7b9b13": ["1P 3M 5P 7m 9m 13m"],
	"7b9b13#11": ["1P 3M 5P 7m 9m 11A 13m",["7b9#11b13","7b5b9b13"]],
	"7no5": ["1P 3M 7m"],
	"7sus4": ["1P 4P 5P 7m",["7sus"]],
	"7sus4b9": ["1P 4P 5P 7m 9m",["susb9","7susb9","7b9sus","7b9sus4","phryg"]],
	"7sus4b9b13": ["1P 4P 5P 7m 9m 13m",["7b9b13sus4"]],
	"9#11": ["1P 3M 5P 7m 9M 11A",["9+4","9#4","9#11_","9#4_"]],
	"9#11b13": ["1P 3M 5P 7m 9M 11A 13m",["9b5b13"]],
	"9#5": ["1P 3M 5A 7m 9M",["9+"]],
	"9#5#11": ["1P 3M 5A 7m 9M 11A"],
	"9b13": ["1P 3M 7m 9M 13m"],
	"9b5": ["1P 3M 5d 7m 9M"],
	"9no5": ["1P 3M 7m 9M"],
	"9sus4": ["1P 4P 5P 7m 9M",["9sus"]],
	"m#5": ["1P 3m 5A",["m+","mb6"]],
	"m11A 5": ["1P 3m 6m 7m 9M 11P"],
	"m7#5": ["1P 3m 6m 7m"],
	"m9#5": ["1P 3m 6m 7m 9M"],
	"+add#9": ["1P 3M 5A 9A"]
};

/**
 * This module tonal dictionaries: functions that, given a name, returns an
 * array of intervals.
 *
 * @module dictionary
 */
function build$5(source, parse) {
  if ( parse === void 0 ) parse = function (x) { return x.split(" "); };

  var keys = Object.keys(source).sort();
  var data = {};
  keys.forEach(function (k) {
    data[k] = parse(source[k][0]);
    (source[k][1] || []).forEach(function (alias) { return (data[alias] = data[k]); });
  });
  var allKeys = Object.keys(data).sort();
  var dictionary = function (name$$1) { return data[name$$1]; };
  dictionary.keys = function (aliases) { return (aliases ? allKeys : keys).slice(); };
  return dictionary;
}

var scale$2 = build$5(scalesData);
var chord = build$5(chordsData);

/**
 * A dictionary with all known pitchsets (includes chords and scales)
 * 
 * @param {String} name 
 */
var pitchset = function (name$$1) { return scale$2(name$$1) || chord(name$$1); };
pitchset.keys = function (alias) { return scale$2.keys(alias).concat(chord.keys(alias)); };



/**
 * Create a tonal dictionary. A dictionary is an object with two functions: get and
 * keys.
 *
 * The data given to this constructor it's a HashMap in the form:
 * `{ key: [intervals, [aliases]] }`
 *
 * @param {HashMap} data - the dictionary data
 * @return {Object} the dictionary object
 *
 * @example
 * var dictionary = require('tonal-dictionary').dictionary
 * var DATA = {
 * 'maj7': ['1 3 5 7', ['Maj7']],
 *   'm7': ['1 b3 5 7']
 * }
 * var chords = dictionary(DATA, function (str) { return str.split(' ') })
 * chords.get('maj7') // => [ '1', '3', '5', '7' ]
 * chords.get('Maj7') // => [ '1', '3', '5', '7' ]
 * chords.get('m7') // => ['1', 'b3', '5', '7']
 * chords.get('m7b5') // => null
 * chords.keys() // => ['maj7', 'm7']
 * chords.keys(true) // => ['maj7', 'm7', 'Maj7']
 */
function dictionary(raw, parse) {
  console.warn("@deprecated: use dictionary.build");
  parse = parse || (function (x) { return x; });
  var byKey = {};
  var names = Object.keys(raw);
  var aliases = [];
  names.forEach(function(k) {
    var value = parse(raw[k][0]);
    byKey[k] = value;
    if (raw[k][1]) {
      raw[k][1].forEach(function(alias) {
        byKey[alias] = value;
        aliases.push(alias);
      });
    }
  });
  return {
    /**
     * Get a value by key
     * @name get
     * @function
     * @param {String} key
     * @return {Object} the value (normally an array of intervals or notes)
     * @memberof dictionary
     */
    get: function(n) {
      return byKey[n];
    },
    /**
     * Get the valid keys of dictionary
     * @name keys
     * @function
     * @param {Boolean} aliases - (Optional) include aliases names (false by default)
     * @param {Function} filter - a function to filter the names. It receives the
     * name and the value as parameters
     * @return {Array<String>} the keys
     * @memberof dictionary
     */
    keys: function(all, filter$$1) {
      var keys = all ? names.concat(aliases) : names.slice();
      return typeof filter$$1 !== "function"
        ? keys
        : keys.filter(function(k) {
            return filter$$1(k, byKey[k]);
          });
    }
  };
}

/**
 * Create a pitch set detector. Given a dictionary data, it returns a
 * function that tries to detect a given pitch set inside the dictionary
 *
 * @param {Dictionary} dictionary - the dictionary object
 * @param {Function|String} builder - (Optional) a function that given a name and a tonic,
 * returns the object or a string to join both
 * @return {Function} the detector function
 * @see chord.detect
 * @see scale.detect
 * @example
 * var detect = detector(dictionary(DATA), '')
 * detect('c d e b') // => 'Cmaj/'
 */
function detector(dict, build) {
  var isSep = typeof build === "string";
  var isFn = typeof build === "function";
  var nameByChroma = dict.keys(false).reduce(function(map$$1, key) {
    map$$1[chroma$3(dict.get(key))] = key;
    return map$$1;
  }, {});

  return function(notes$$1) {
    notes$$1 = sort(map(pc$1, notes$$1));
    var sets = modes(notes$$1);
    return compact(
      sets.map(function(set, i) {
        var type = nameByChroma[set];
        if (!type) { return null; }
        var tonic = notes$$1[i];
        return isSep
          ? tonic + build + type
          : isFn ? build(type, tonic) : [type, tonic];
      })
    );
  };
}

var chromatic$2 = ["1P 2m 2M 3m 3M 4P 4A 5P 6m 6M 7m 7M"];
var lydian$1 = ["1P 2M 3M 4A 5P 6M 7M"];
var major$1 = ["1P 2M 3M 4P 5P 6M 7M",["ionian"]];
var mixolydian$1 = ["1P 2M 3M 4P 5P 6M 7m",["dominant"]];
var dorian$1 = ["1P 2M 3m 4P 5P 6M 7m"];
var aeolian$1 = ["1P 2M 3m 4P 5P 6m 7m",["minor"]];
var phrygian$1 = ["1P 2m 3m 4P 5P 6m 7m"];
var locrian$1 = ["1P 2m 3m 4P 5d 6m 7m"];
var altered$1 = ["1P 2m 3m 3M 5d 6m 7m",["super locrian","diminished whole tone","pomeroy"]];
var iwato$1 = ["1P 2m 4P 5d 7m"];
var hirajoshi$1 = ["1P 2M 3m 5P 6m"];
var kumoijoshi$1 = ["1P 2m 4P 5P 6m"];
var pelog$1 = ["1P 2m 3m 5P 6m"];
var prometheus$1 = ["1P 2M 3M 4A 6M 7m"];
var ritusen$1 = ["1P 2M 4P 5P 6M"];
var scriabin$1 = ["1P 2m 3M 5P 6M"];
var piongio$1 = ["1P 2M 4P 5P 6M 7m"];
var augmented$1 = ["1P 2A 3M 5P 5A 7M"];
var neopolitan$1 = ["1P 2m 3m 4P 5P 6m 7M"];
var diminished$1 = ["1P 2M 3m 4P 5d 6m 6M 7M"];
var egyptian$1 = ["1P 2M 4P 5P 7m"];
var oriental$1 = ["1P 2m 3M 4P 5d 6M 7m"];
var spanish$1 = ["1P 2m 3M 4P 5P 6m 7m",["phrygian major"]];
var flamenco$1 = ["1P 2m 3m 3M 4A 5P 7m"];
var balinese$1 = ["1P 2m 3m 4P 5P 6m 7M"];
var persian$1 = ["1P 2m 3M 4P 5d 6m 7M"];
var bebop$1 = ["1P 2M 3M 4P 5P 6M 7m 7M"];
var enigmatic$1 = ["1P 2m 3M 5d 6m 7m 7M"];
var ichikosucho$1 = ["1P 2M 3M 4P 5d 5P 6M 7M"];
var DATA = {
	chromatic: chromatic$2,
	lydian: lydian$1,
	major: major$1,
	mixolydian: mixolydian$1,
	dorian: dorian$1,
	aeolian: aeolian$1,
	phrygian: phrygian$1,
	locrian: locrian$1,
	altered: altered$1,
	iwato: iwato$1,
	hirajoshi: hirajoshi$1,
	kumoijoshi: kumoijoshi$1,
	pelog: pelog$1,
	prometheus: prometheus$1,
	ritusen: ritusen$1,
	scriabin: scriabin$1,
	piongio: piongio$1,
	augmented: augmented$1,
	neopolitan: neopolitan$1,
	diminished: diminished$1,
	egyptian: egyptian$1,
	oriental: oriental$1,
	spanish: spanish$1,
	flamenco: flamenco$1,
	balinese: balinese$1,
	persian: persian$1,
	bebop: bebop$1,
	enigmatic: enigmatic$1,
	ichikosucho: ichikosucho$1,
	"melodic minor": ["1P 2M 3m 4P 5P 6M 7M"],
	"melodic minor second mode": ["1P 2m 3m 4P 5P 6M 7m"],
	"lydian augmented": ["1P 2M 3M 4A 5A 6M 7M"],
	"lydian dominant": ["1P 2M 3M 4A 5P 6M 7m",["lydian b7"]],
	"melodic minor fifth mode": ["1P 2M 3M 4P 5P 6m 7m",["hindu","mixolydian b6M"]],
	"locrian #2": ["1P 2M 3m 4P 5d 6m 7m"],
	"locrian major": ["1P 2M 3M 4P 5d 6m 7m",["arabian"]],
	"major pentatonic": ["1P 2M 3M 5P 6M",["pentatonic"]],
	"lydian pentatonic": ["1P 3M 4A 5P 7M",["chinese"]],
	"mixolydian pentatonic": ["1P 3M 4P 5P 7m",["indian"]],
	"locrian pentatonic": ["1P 3m 4P 5d 7m",["minor seven flat five pentatonic"]],
	"minor pentatonic": ["1P 3m 4P 5P 7m"],
	"minor six pentatonic": ["1P 3m 4P 5P 6M"],
	"minor hexatonic": ["1P 2M 3m 4P 5P 7M"],
	"flat three pentatonic": ["1P 2M 3m 5P 6M",["kumoi"]],
	"flat six pentatonic": ["1P 2M 3M 5P 6m"],
	"major flat two pentatonic": ["1P 2m 3M 5P 6M"],
	"whole tone pentatonic": ["1P 3M 5d 6m 7m"],
	"ionian pentatonic": ["1P 3M 4P 5P 7M"],
	"lydian #5P pentatonic": ["1P 3M 4A 5A 7M"],
	"lydian dominant pentatonic": ["1P 3M 4A 5P 7m"],
	"minor #7M pentatonic": ["1P 3m 4P 5P 7M"],
	"super locrian pentatonic": ["1P 3m 4d 5d 7m"],
	"in-sen": ["1P 2m 4P 5P 7m"],
	"vietnamese 1": ["1P 3m 4P 5P 6m"],
	"vietnamese 2": ["1P 3m 4P 5P 7m"],
	"prometheus neopolitan": ["1P 2m 3M 4A 6M 7m"],
	"major blues": ["1P 2M 3m 3M 5P 6M"],
	"minor blues": ["1P 3m 4P 5d 5P 7m",["blues"]],
	"composite blues": ["1P 2M 3m 3M 4P 5d 5P 6M 7m"],
	"augmented heptatonic": ["1P 2A 3M 4P 5P 5A 7M"],
	"dorian #4": ["1P 2M 3m 4A 5P 6M 7m"],
	"lydian diminished": ["1P 2M 3m 4A 5P 6M 7M"],
	"whole tone": ["1P 2M 3M 4A 5A 7m"],
	"leading whole tone": ["1P 2M 3M 4A 5A 7m 7M"],
	"harmonic minor": ["1P 2M 3m 4P 5P 6m 7M"],
	"lydian minor": ["1P 2M 3M 4A 5P 6m 7m"],
	"neopolitan minor": ["1P 2m 3m 4P 5P 6m 7M"],
	"neopolitan major": ["1P 2m 3m 4P 5P 6M 7M",["dorian b2"]],
	"neopolitan major pentatonic": ["1P 3M 4P 5d 7m"],
	"romanian minor": ["1P 2M 3m 5d 5P 6M 7m"],
	"double harmonic lydian": ["1P 2m 3M 4A 5P 6m 7M"],
	"harmonic major": ["1P 2M 3M 4P 5P 6m 7M"],
	"double harmonic major": ["1P 2m 3M 4P 5P 6m 7M",["gypsy"]],
	"hungarian minor": ["1P 2M 3m 4A 5P 6m 7M"],
	"hungarian major": ["1P 2A 3M 4A 5P 6M 7m"],
	"spanish heptatonic": ["1P 2m 3m 3M 4P 5P 6m 7m"],
	"todi raga": ["1P 2m 3m 4A 5P 6m 7M"],
	"malkos raga": ["1P 3m 4P 6m 7m"],
	"kafi raga": ["1P 3m 3M 4P 5P 6M 7m 7M"],
	"purvi raga": ["1P 2m 3M 4P 4A 5P 6m 7M"],
	"bebop dominant": ["1P 2M 3M 4P 5P 6M 7m 7M"],
	"bebop minor": ["1P 2M 3m 3M 4P 5P 6M 7m"],
	"bebop major": ["1P 2M 3M 4P 5P 5A 6M 7M"],
	"bebop locrian": ["1P 2m 3m 4P 5d 5P 6m 7m"],
	"minor bebop": ["1P 2M 3m 4P 5P 6m 7m 7M"],
	"mystery #1": ["1P 2m 3M 5d 6m 7m"],
	"minor six diminished": ["1P 2M 3m 4P 5P 6m 6M 7M"],
	"ionian augmented": ["1P 2M 3M 4P 5A 6M 7M"],
	"lydian #9": ["1P 2m 3M 4A 5P 6M 7M"],
	"six tone symmetric": ["1P 2m 3M 4P 5A 6M"]
};

/**
 * A scale is a collection of pitches in ascending or descending order.
 *
 * This module provides functions to get and manipulate scales.
 *
 * @example
 * scale.notes('Ab bebop') // => [ 'Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'G' ]
 * scale.get('hungarian major', 'B3') // => [ 'B3', 'C##4', 'D#4', 'E#4', 'F#4', 'G#4', 'A4'
 * scale.get('C E F G', 'F') // => [ 'F', 'A', 'Bb', 'C' ]
 * scale.get('1P 2M 3M 5P 6M', 'D4') // => [ 'D4', 'E4', 'F#4', 'A4', 'B4' ]
 * scale.names() => ['major', 'minor', ...]
 * scale.detect('f5 d2 c5 b5 a2 e4 g') // => [ 'C major', 'D dorian', 'E phrygian', 'F lydian', 'G mixolydian', 'A aeolian', 'B locrian'])
 * @module scale
 */
var dict = dictionary(DATA, function(str) {
  return str.split(" ");
});

/**
 * Transpose the given scale notes, intervals or name to a given tonic.
 * The returned scale is an array of notes (or intervals if you specify `false` as tonic)
 *
 * It returns null if the scale type is not in the scale dictionary
 *
 * This function is currified
 *
 * @param {String} source - the scale type, intervals or notes
 * @param {String} tonic - the scale tonic (or false to get intervals)
 * @return {Array} the scale notes
 *
 * @example
 * scale.get('bebop', 'Eb') // => [ 'Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'Db', 'D' ]
 * scale.get('major', false) // => [ '1P', '2M', '3M', '4P', '5P', '6M', '7M' ]
 * const major = scale.get('major')
 * major('Db3') // => [ 'Db3', 'Eb3', 'F3', 'Gb3', 'Ab3', 'Bb3', 'C4' ]
 */
function get(type, tonic) {
  console.warn("@deprecated: use scale.intervals or scale.notes");
  if (arguments.length === 1)
    { return function(t) {
      return get(type, t);
    }; }
  var ivls = dict.get(type);
  return ivls ? harmonize(ivls, tonic) : null;
}

/**
 * Return the available scale names
 *
 * @function
 * @param {boolean} aliases - true to include aliases
 * @return {Array} the scale names
 *
 * @example
 * const scale = require('tonal-scale')
 * scale.names() // => ['maj7', ...]
 */
var names = scale$2.keys;

/**
 * Get the notes (pitch classes) of a scale. It accepts either a scale name
 * (tonic and type) or a collection of notes.
 *
 * Note that it always returns an array, and the values are only pitch classes.
 *
 * @param {String|Array} src - the scale name (it must include the scale type and
 * a tonic. The tonic can be a note or a pitch class) or the list of notes
 * @return {Array} the scale pitch classes
 *
 * @example
 * scale.notes('C major') // => [ 'C', 'D', 'E', 'F', 'G', 'A', 'B' ]
 * scale.notes('C4 major') // => [ 'C', 'D', 'E', 'F', 'G', 'A', 'B' ]
 * scale.notes('Ab bebop') // => [ 'Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'G' ]
 * scale.notes('C4 D6 E2 c7 a2 b5 g2 g4 f') // => ['C', 'D', 'E', 'F', 'G', 'A', 'B']
 */
function notes$1(name$$1) {
  var parsed = parseName(name$$1);
  if (parsed.tonic) { console.log(parsed.tonic, pc$1(parsed.tonic)); }
  if (parsed.tonic) {
    var ivls = scale$2(parsed.type);
    return ivls ? ivls.map(transpose$2(pc$1(parsed.tonic))) : [];
  }
  var notes = scale$2.tonic ? get(scale$2.type, pc$1(scale$2.tonic)) : null;
  return (
    notes ||
    compact(
      map(pc$1, name$$1).map(function(n, i, arr) {
        // check for duplicates
        // TODO: sort but preserving the root
        return arr.indexOf(n) < i ? null : n;
      })
    )
  );
}

/**
 * Given a scale name, return its intervals. The name can be the type and
 * optionally the tonic (which is ignored)
 *
 * It retruns an empty array when no scale found
 *
 * @param {String} name - the scale name (tonic and type, tonic is optional)
 * @return {Array<String>} the scale intervals if is a known scale or an empty
 * array if no scale found
 * @example
 * scale.intervals('C major')
 */
function intervals$1(name$$1) {
  var parsed = parseName(name$$1);
  return scale$2(parsed.type) || [];
}

/**
 * Check if the given name (and optional tonic and type) is a know scale
 * @param {String} name - the scale name
 * @return {Boolean}
 * @example
 * scale.intervals('C major') // => [ '1P', '2M', '3M', '4P', '5P', '6M', '7M' ])
 * scale.intervals('major') // => [ '1P', '2M', '3M', '4P', '5P', '6M', '7M' ])
 * scale.intervals('mixophrygian') // => null
 */
function exists(name$$1) {
  return scale$2(name$$1) !== undefined;
}

function isKnowScale(name$$1) {
  console.warn("@renamed: use scale.exists");
  return exists(name$$1);
}

/**
 * Given a string try to parse as scale name. It retuns an object with the
 * form { tonic, type } where tonic is the note or false if no tonic specified
 * and type is the rest of the string minus the tonic
 *
 * Note that this function doesn't check that the scale type is a valid scale
 * type or if is present in any scale dictionary.
 *
 * @param {String} name - the scale name
 * @return {Object} an object { tonic, type }
 * @example
 * scale.parseName('C mixoblydean') // => { tonic: 'C', type: 'mixoblydean' }
 * scale.parseName('anything is valid') // => { tonic: false, type: 'anything is valid'}
 */
function parseName(str) {
  if (typeof str !== "string") { return null; }
  var i = str.indexOf(" ");
  var tonic = name(str.substring(0, i)) || false;
  var type = tonic ? str.substring(i + 1) : str;
  return { tonic: tonic, type: type };
}

/**
 * Detect a scale. Given a list of notes, return the scale name(s) if any.
 * It only detects chords with exactly same notes.
 *
 * @function
 * @param {Array|String} notes - the list of notes
 * @return {Array<String>} an array with the possible scales
 * @example
 * scale.detect('b g f# d') // => [ 'GMaj7' ]
 * scale.detect('e c a g') // => [ 'CM6', 'Am7' ]
 */
var detect = detector(dict, " ");


var scale$1 = Object.freeze({
	get: get,
	names: names,
	notes: notes$1,
	intervals: intervals$1,
	exists: exists,
	isKnowScale: isKnowScale,
	parseName: parseName,
	detect: detect
});

'use strict';

// util
var REGEX$4 = /^([a-gA-G])(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)\s*$/;
/**
 * A regex for matching note strings in scientific notation.
 *
 * @name regex
 * @function
 * @return {RegExp} the regexp used to parse the note name
 *
 * The note string should have the form `letter[accidentals][octave][element]`
 * where:
 *
 * - letter: (Required) is a letter from A to G either upper or lower case
 * - accidentals: (Optional) can be one or more `b` (flats), `#` (sharps) or `x` (double sharps).
 * They can NOT be mixed.
 * - octave: (Optional) a positive or negative integer
 * - element: (Optional) additionally anything after the duration is considered to
 * be the element name (for example: 'C2 dorian')
 *
 * The executed regex contains (by array index):
 *
 * - 0: the complete string
 * - 1: the note letter
 * - 2: the optional accidentals
 * - 3: the optional octave
 * - 4: the rest of the string (trimmed)
 *
 * @example
 * var parser = require('note-parser')
 * parser.regex.exec('c#4')
 * // => ['c#4', 'c', '#', '4', '']
 * parser.regex.exec('c#4 major')
 * // => ['c#4major', 'c', '#', '4', 'major']
 * parser.regex().exec('CMaj7')
 * // => ['CMaj7', 'C', '', '', 'Maj7']
 */
function regex$2 () { return REGEX$4 }





/**
 * Get midi of a note
 *
 * @name midi
 * @function
 * @param {String|Integer} note - the note name or midi number
 * @return {Integer} the midi number of the note or null if not a valid note
 * or the note does NOT contains octave
 * @example
 * var parser = require('note-parser')
 * parser.midi('A4') // => 69
 * parser.midi('A') // => null
 * @example
 * // midi numbers are bypassed (even as strings)
 * parser.midi(60) // => 60
 * parser.midi('60') // => 60
 */


/**
 * Get freq of a note in hertzs (in a well tempered 440Hz A4)
 *
 * @name freq
 * @function
 * @param {String} note - the note name or note midi number
 * @param {String} tuning - (Optional) the A4 frequency (440 by default)
 * @return {Float} the freq of the number if hertzs or null if not valid note
 * @example
 * var parser = require('note-parser')
 * parser.freq('A4') // => 440
 * parser.freq('A') // => null
 * @example
 * // can change tuning (440 by default)
 * parser.freq('A4', 444) // => 444
 * parser.freq('A3', 444) // => 222
 * @example
 * // it accepts midi numbers (as numbers and as strings)
 * parser.freq(69) // => 440
 * parser.freq('69', 442) // => 442
 */

var M$1 = ["1P 3M 5P",["Major",""]];
var M13$1 = ["1P 3M 5P 7M 9M 13M",["maj13","Maj13"]];
var M6$1 = ["1P 3M 5P 13M",["6"]];
var M69$1 = ["1P 3M 5P 6M 9M",["69"]];
var M7add13$1 = ["1P 3M 5P 6M 7M 9M"];
var M7b5$1 = ["1P 3M 5d 7M"];
var M7b6$1 = ["1P 3M 6m 7M"];
var M7b9$1 = ["1P 3M 5P 7M 9m"];
var M7sus4$1 = ["1P 4P 5P 7M"];
var M9$1 = ["1P 3M 5P 7M 9M",["maj9","Maj9"]];
var M9b5$1 = ["1P 3M 5d 7M 9M"];
var M9sus4$1 = ["1P 4P 5P 7M 9M"];
var Madd9$1 = ["1P 3M 5P 9M",["2","add9","add2"]];
var Maj7$1 = ["1P 3M 5P 7M",["maj7","M7"]];
var Mb5$1 = ["1P 3M 5d"];
var Mb6$1 = ["1P 3M 13m"];
var Msus2$1 = ["1P 2M 5P",["add9no3","sus2"]];
var Msus4$1 = ["1P 4P 5P",["sus","sus4"]];
var addb9$1 = ["1P 3M 5P 9m"];
var m$1 = ["1P 3m 5P",["minor"]];
var m11$1 = ["1P 3m 5P 7m 9M 11P",["_11"]];
var m11b5$1 = ["1P 3m 7m 12d 2M 4P",["h11","_11b5"]];
var m13$1 = ["1P 3m 5P 7m 9M 11P 13M",["_13"]];
var m6$1 = ["1P 3m 4P 5P 13M",["_6"]];
var m69$1 = ["1P 3m 5P 6M 9M",["_69"]];
var m7$1 = ["1P 3m 5P 7m",["minor7","_","_7"]];
var m7add11$1 = ["1P 3m 5P 7m 11P",["m7add4"]];
var m7b5$1 = ["1P 3m 5d 7m",["half-diminished","h7","_7b5"]];
var m9$1 = ["1P 3m 5P 7m 9M",["_9"]];
var m9b5$1 = ["1P 3m 7m 12d 2M",["h9","-9b5"]];
var mMaj7$1 = ["1P 3m 5P 7M",["mM7","_M7"]];
var mMaj7b6$1 = ["1P 3m 5P 6m 7M",["mM7b6"]];
var mM9$1 = ["1P 3m 5P 7M 9M",["mMaj9","-M9"]];
var mM9b6$1 = ["1P 3m 5P 6m 7M 9M",["mMaj9b6"]];
var mb6M7$1 = ["1P 3m 6m 7M"];
var mb6b9$1 = ["1P 3m 6m 9m"];
var o$1 = ["1P 3m 5d",["mb5","dim"]];
var o7$1 = ["1P 3m 5d 13M",["diminished","m6b5","dim7"]];
var o7M7$1 = ["1P 3m 5d 6M 7M"];
var oM7$1 = ["1P 3m 5d 7M"];
var sus24$1 = ["1P 2M 4P 5P",["sus4add9"]];
var madd4$1 = ["1P 3m 4P 5P"];
var madd9$1 = ["1P 3m 5P 9M"];
var DATA$1 = {
	M: M$1,
	M13: M13$1,
	M6: M6$1,
	M69: M69$1,
	M7add13: M7add13$1,
	M7b5: M7b5$1,
	M7b6: M7b6$1,
	M7b9: M7b9$1,
	M7sus4: M7sus4$1,
	M9: M9$1,
	M9b5: M9b5$1,
	M9sus4: M9sus4$1,
	Madd9: Madd9$1,
	Maj7: Maj7$1,
	Mb5: Mb5$1,
	Mb6: Mb6$1,
	Msus2: Msus2$1,
	Msus4: Msus4$1,
	addb9: addb9$1,
	m: m$1,
	m11: m11$1,
	m11b5: m11b5$1,
	m13: m13$1,
	m6: m6$1,
	m69: m69$1,
	m7: m7$1,
	m7add11: m7add11$1,
	m7b5: m7b5$1,
	m9: m9$1,
	m9b5: m9b5$1,
	mMaj7: mMaj7$1,
	mMaj7b6: mMaj7b6$1,
	mM9: mM9$1,
	mM9b6: mM9b6$1,
	mb6M7: mb6M7$1,
	mb6b9: mb6b9$1,
	o: o$1,
	o7: o7$1,
	o7M7: o7M7$1,
	oM7: oM7$1,
	sus24: sus24$1,
	madd4: madd4$1,
	madd9: madd9$1,
	"4": ["1P 4P 7m 10m",["quartal"]],
	"5": ["1P 5P"],
	"7": ["1P 3M 5P 7m",["Dominant","Dom"]],
	"9": ["1P 3M 5P 7m 9M",["79"]],
	"11": ["1P 5P 7m 9M 11P"],
	"13": ["1P 3M 5P 7m 9M 13M",["13_"]],
	"64": ["5P 8P 10M"],
	"M#5": ["1P 3M 5A",["augmented","maj#5","Maj#5","+","aug"]],
	"M#5add9": ["1P 3M 5A 9M",["+add9"]],
	"M13#11": ["1P 3M 5P 7M 9M 11A 13M",["maj13#11","Maj13#11","M13+4","M13#4"]],
	"M6#11": ["1P 3M 5P 6M 11A",["M6b5","6#11","6b5"]],
	"M69#11": ["1P 3M 5P 6M 9M 11A"],
	"M7#11": ["1P 3M 5P 7M 11A",["maj7#11","Maj7#11","M7+4","M7#4"]],
	"M7#5": ["1P 3M 5A 7M",["maj7#5","Maj7#5","maj9#5","M7+"]],
	"M7#5sus4": ["1P 4P 5A 7M"],
	"M7#9#11": ["1P 3M 5P 7M 9A 11A"],
	"M9#11": ["1P 3M 5P 7M 9M 11A",["maj9#11","Maj9#11","M9+4","M9#4"]],
	"M9#5": ["1P 3M 5A 7M 9M",["Maj9#5"]],
	"M9#5sus4": ["1P 4P 5A 7M 9M"],
	"11b9": ["1P 5P 7m 9m 11P"],
	"13#11": ["1P 3M 5P 7m 9M 11A 13M",["13+4","13#4"]],
	"13#9": ["1P 3M 5P 7m 9A 13M",["13#9_"]],
	"13#9#11": ["1P 3M 5P 7m 9A 11A 13M"],
	"13b5": ["1P 3M 5d 6M 7m 9M"],
	"13b9": ["1P 3M 5P 7m 9m 13M"],
	"13b9#11": ["1P 3M 5P 7m 9m 11A 13M"],
	"13no5": ["1P 3M 7m 9M 13M"],
	"13sus4": ["1P 4P 5P 7m 9M 13M",["13sus"]],
	"69#11": ["1P 3M 5P 6M 9M 11A"],
	"7#11": ["1P 3M 5P 7m 11A",["7+4","7#4","7#11_","7#4_"]],
	"7#11b13": ["1P 3M 5P 7m 11A 13m",["7b5b13"]],
	"7#5": ["1P 3M 5A 7m",["+7","7aug","aug7"]],
	"7#5#9": ["1P 3M 5A 7m 9A",["7alt","7#5#9_","7#9b13_"]],
	"7#5b9": ["1P 3M 5A 7m 9m"],
	"7#5b9#11": ["1P 3M 5A 7m 9m 11A"],
	"7#5sus4": ["1P 4P 5A 7m"],
	"7#9": ["1P 3M 5P 7m 9A",["7#9_"]],
	"7#9#11": ["1P 3M 5P 7m 9A 11A",["7b5#9"]],
	"7#9#11b13": ["1P 3M 5P 7m 9A 11A 13m"],
	"7#9b13": ["1P 3M 5P 7m 9A 13m"],
	"7add6": ["1P 3M 5P 7m 13M",["67","7add13"]],
	"7b13": ["1P 3M 7m 13m"],
	"7b5": ["1P 3M 5d 7m"],
	"7b6": ["1P 3M 5P 6m 7m"],
	"7b9": ["1P 3M 5P 7m 9m"],
	"7b9#11": ["1P 3M 5P 7m 9m 11A",["7b5b9"]],
	"7b9#9": ["1P 3M 5P 7m 9m 9A"],
	"7b9b13": ["1P 3M 5P 7m 9m 13m"],
	"7b9b13#11": ["1P 3M 5P 7m 9m 11A 13m",["7b9#11b13","7b5b9b13"]],
	"7no5": ["1P 3M 7m"],
	"7sus4": ["1P 4P 5P 7m",["7sus"]],
	"7sus4b9": ["1P 4P 5P 7m 9m",["susb9","7susb9","7b9sus","7b9sus4","phryg"]],
	"7sus4b9b13": ["1P 4P 5P 7m 9m 13m",["7b9b13sus4"]],
	"9#11": ["1P 3M 5P 7m 9M 11A",["9+4","9#4","9#11_","9#4_"]],
	"9#11b13": ["1P 3M 5P 7m 9M 11A 13m",["9b5b13"]],
	"9#5": ["1P 3M 5A 7m 9M",["9+"]],
	"9#5#11": ["1P 3M 5A 7m 9M 11A"],
	"9b13": ["1P 3M 7m 9M 13m"],
	"9b5": ["1P 3M 5d 7m 9M"],
	"9no5": ["1P 3M 7m 9M"],
	"9sus4": ["1P 4P 5P 7m 9M",["9sus"]],
	"m#5": ["1P 3m 5A",["m+","mb6"]],
	"m11A 5": ["1P 3m 6m 7m 9M 11P"],
	"m7#5": ["1P 3m 6m 7m"],
	"m9#5": ["1P 3m 6m 7m 9M"],
	"+add#9": ["1P 3M 5A 9A"]
};

/**
 * A chord is a harmonic unit with at least three different tones sounding simultaneously.
 *
 * This module have functions to create and manipulate chords. It includes a
 * chord dictionary and a simple chord detection algorithm.
 *
 * @example
 * var chord = require('tonal-chord')
 * chord.detect('c b g e') // => 'CMaj7'
 * chord.get('CMaj7') // => ['C', 'E', 'G', 'B']
 *
 * @module chord
 */
var dict$1 = dictionary(DATA$1, function(str) {
  return str.split(" ");
});

/**
 * Return the available chord names
 *
 * @function
 * @param {boolean} aliases - true to include aliases
 * @return {Array} the chord names
 *
 * @example
 * var chord = require('tonal-chord')
 * chord.names() // => ['maj7', ...]
 */
var names$1 = dict$1.keys;

/**
 * Get chord notes or intervals from chord type
 *
 * This function is currified
 *
 * @param {String} type - the chord type
 * @param {Strng|Pitch} tonic - the tonic or false to get the intervals
 * @return {Array<String>} the chord notes or intervals, or null if not valid type
 *
 * @example
 * chords.get('dom7', 'C') // => ['C', 'E', 'G', 'Bb']
 * maj7 = chords.get('Maj7')
 * maj7('C') // => ['C', 'E', 'G', 'B']
 */
function get$1(type, tonic) {
  if (arguments.length === 1)
    { return function(t) {
      return get$1(type, t);
    }; }
  var ivls = dict$1.get(type);
  return ivls ? harmonize(ivls, tonic) : null;
}

/**
 * Get the chord notes of a chord. This function accepts either a chord name
 * (for example: 'Cmaj7') or a list of notes.
 *
 * It always returns an array, even if the chord is not found.
 *
 * @param {String|Array} chord - the chord to get the notes from
 * @return {Array<String>} a list of notes or empty list if not chord found
 *
 * @example
 * chord.notes('Cmaj7') // => ['C', 'E', 'G', 'B']
 */
function notes$2(chord$$1) {
  var p = parse$5(chord$$1);
  var ivls = dict$1.get(p.type);
  return ivls ? harmonize(ivls, p.tonic) : compact(map(name, chord$$1));
}

/**
 * Get chord intervals. It always returns an array
 *
 * @param {String} name - the chord name (optionally a tonic and type)
 * @return {Array<String>} a list of intervals or null if the type is not known
 */
function intervals$2(name$$1) {
  var p = parse$5(name$$1);
  return dict$1.get(p.type) || [];
}

/**
 * Check if a given name correspond to a chord in the dictionary
 * @param {String} name
 * @return {Boolean}
 * @example
 * chord.isKnownChord('CMaj7') // => true
 * chord.isKnownChord('Maj7') // => true
 * chord.isKnownChord('Ablah') // => false
 */
function isKnownChord(name$$1) {
  return intervals$2(name$$1).length > 0;
}

/**
 * Detect a chord. Given a list of notes, return the chord name(s) if any.
 * It only detects chords with exactly same notes.
 *
 * @function
 * @param {Array|String} notes - the list of notes
 * @return {Array<String>} an array with the possible chords
 * @example
 * chord.detect('b g f# d') // => [ 'GMaj7' ]
 * chord.detect('e c a g') // => [ 'CM6', 'Am7' ]
 */
var detect$1 = detector(dict$1, "");

/**
 * Get the position (inversion number) of a chord (0 is root position, 1 is first
 * inversion...). It assumes the chord is formed by superposed thirds.
 *
 * @param {Array|String} chord - the chord notes
 * @return {Integer} the inversion number (0 for root inversion, 1 for first
 * inversion...) or null if not a valid chord
 *
 * @example
 * chord.position('e g c') // => 1
 * chord.position('g3 e2 c5') // => 1 (e is the lowest note)
 */
function position(chord$$1) {
  var pcs = map(pc$1, chord$$1);
  var sorted = sortTriads(pcs);
  return sorted ? sorted.indexOf(pcs[0]) : null;
}

/**
 * Given a chord in any inverstion, set to the given inversion. It accepts
 * chord names
 *
 * @param {Integer} num - the inversion number (0 root position, 1 first
 * inversion, ...)
 * @param {String|Array} chord - the chord name or notes
 * @return {Array} the chord pitch classes in the desired inversion or
 * an empty array if no inversion found (not triadic)
 *
 * @example
 * chord.inversion(1, 'Cmaj7') // => [ 'E', 'G', 'B', 'C' ]
 * chord.inversion(0, 'e g c') // => [ 'C', 'E', 'G' ]
 */
function inversion(num, chord$$1) {
  if (arguments.length === 1)
    { return function(c) {
      return inversion(num, c);
    }; }
  var sorted = sortTriads(chord$$1);
  return sorted ? rotate(num, sorted) : [];
}

function sortTriads(chord$$1) {
  var all = permutations(notes$2(chord$$1).map(pc$1));
  for (var i = 0; i < all.length; i++) {
    var ivls = intervallic(all[i]);
    if (areTriads(ivls)) { return all[i]; }
  }
  return null;
}

function areTriads(list) {
  for (var i = 0; i < list.length; i++) {
    if (list[i][0] !== "3") { return false; }
  }
  return true;
}

/**
 * Try to parse a chord name. It returns an array with the chord type and
 * the tonic. If not tonic is found, all the name is considered the chord
 * name.
 *
 * This function does NOT check if the chord type exists or not. It only tries
 * to split the tonic and chord type.
 *
 * @param {String} name - the chord name
 * @return {Array} an array with [type, tonic]
 * @example
 * chord.parse('Cmaj7') // => { tonic: 'C', type: 'maj7' }
 * chord.parse('C7') // => { tonic: 'C', type: '7' }
 * chord.parse('mMaj7') // => { tonic: false, type: 'mMaj7' }
 * chord.parse('Cnonsense') // => { tonic: 'C', type: 'nonsense' }
 */
function parse$5(name$$1) {
  var p = regex$2().exec(name$$1);
  if (!p) { return { type: name$$1, tonic: false }; }

  // If chord name is empty, the octave is the chord name
  return !p[4]
    ? { type: p[3], tonic: p[1] + p[2] }
    : // If the octave is 6 or 7 is asumed to be part of the chord name
      p[3] === "7" || p[3] === "6"
      ? { type: p[3] + p[4], tonic: p[1] + p[2] }
      : { type: p[4], tonic: p[1] + p[2] + p[3] };
}


var chord$1 = Object.freeze({
	names: names$1,
	get: get$1,
	notes: notes$2,
	intervals: intervals$2,
	isKnownChord: isKnownChord,
	detect: detect$1,
	position: position,
	inversion: inversion,
	parse: parse$5
});

/**
 * # `tonal-progressions`
 * > Describe and manipulate chord progressions.
 *
 * @example
 * var progression = require('tonal-progression')
 * progression.abstract('Cmaj7 Dm7 G7', 'C')
 *
 * @module progression
 */
function abstract(chords, tonic) {
  tonic = pc$1(tonic);
  chords = map(parse$5, chords);
  var tonics = compact(
    chords.map(function(x) {
      return x.tonic;
    })
  );
  // if some tonic missing, can't do the analysis
  if (tonics.length !== chords.length) { return null; }

  return tonics.map(function(t, i) {
    var p = props(interval(tonic, t));
    return buildRoman(p.num - 1, p.alt, chords[i].type);
  });
}

var NUMS = ["I", "II", "III", "IV", "V", "VI", "VII"];
/**
 * Build an abstract chord name using roman numerals
 */
function buildRoman(num, alt, element) {
  return toAcc(alt) + NUMS[num % 7] + (element || "");
}

/**
 * Get chord progression from a tonic and a list of chord in roman numerals
 *
 * @param {String} tonic - the tonic
 * @param {Array|String} progression - the progression in roman numerals
 * @return {Array} the chord progression
 *
 * @example
 * var progression = require('chord-progression')
 * progression.concrete('I IIm7 V7', 'C') // => ['C', 'Dm7', 'G7']
 */
function concrete(chords, tonic) {
  return map(function(e) {
    var r = parseRomanChord(e);
    return r ? transpose(r.root, tonic) + r.type : null;
  }, chords);
}

var ROMAN = /^\s*(b|bb|#|##|)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)\s*(.*)\s*$/;
/**
 * Returns a regex to match roman numbers literals with the from:
 * `[accidentals]roman[element]`.
 *
 * The executed regex contains:
 *
 * - input: the input string
 * - accidentals: (Optional) one or two flats (b) or shaprs (#)
 * - roman: (Required) a roman numeral from I to VII either in upper or lower case
 * - element: (Optional) a name of an element
 *
 * @return {RegExp} the regexp
 *
 * @example
 * var r = progression.romanRegex()
 * r.exec('bVImaj7') // => ['bVImaj7', 'b', 'VI', 'maj7'])
 * r.exec('III dom') // => ['III dom', '', 'III', 'dom'])
 */
function romanRegex() {
  return ROMAN;
}

var NUM = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

/**
 * Parse a chord expressed with roman numerals. It returns an interval representing
 * the root of the chord relative to the key tonic and the chord name.
 *
 * @param {String} str - the roman numeral string
 * @return {Object} the roman chord property object with:
 *
 * - type: the chord type
 * - root: the interval from the key to the root of this chord
 *
 * @example
 * var parse = require('music-notation/roman.parse')
 * parse('V7') // => { root: '5P', type: '7' }
 * parse('bIIalt') // => { root: '2m', type: 'alt' }
 */
function parseRomanChord(str) {
  var m = ROMAN.exec(str);
  if (!m) { return null; }
  var num = NUM[m[2].toLowerCase()] + 1;
  var alt = m[1].length;
  if (m[1][0] === "b") { alt = -alt; }
  return { root: fromProps({ num: num, alt: alt, dir: 1 }), type: m[3] };
}


var progression = Object.freeze({
	abstract: abstract,
	buildRoman: buildRoman,
	concrete: concrete,
	romanRegex: romanRegex,
	parseRomanChord: parseRomanChord
});

/**
 *
 * @module sonority
 */
function density(list) {
  var a, b, i;
  var notes = compact(map(asNotePitch, list));
  var len = notes.length;
  var result = [0, 0, 0, 0, 0, 0];
  for (a = 0; a < len; a++) {
    for (b = a; b < len; b++) {
      i = ic(chr(notes[b]) - chr(notes[a]));
      if (i === 6) { result[5] = result[5] + 1; }
      else if (i > 0) { result[5 - i] = result[5 - i] + 1; }
    }
  }
  return result;
}


var sonority = Object.freeze({
	density: density
});

/**
 * Functions to create and manipulate pitch sets
 *
 * @example
 * var pitchset = require('tonal-pitchset')
 *
 * @module pitchset
 */
function notes$3(notes) {
  return sort(notes).filter(function(n, i, arr) {
    return i === 0 || n !== arr[i - 1];
  });
}


var pitchset$1 = Object.freeze({
	notes: notes$3
});

/**
 * The `tonal` module is a facade to all the rest of the modules. They are namespaced,
 * so for example to use `pc` function from `tonal-note` you have to write:
 * `tonal.note.pc`
 *
 * Some modules are NOT namespaced for developer comfort:
 *
 * - `tonal-array`: for example `tonal.map(tonal.note.pc, 'C#2')`
 * - `tonal-transpose`: for example `tonal.transpose('C', '3M')`
 * - `tonal-distance`: for example `tonal.interval('C3', 'G4')`
 *
 * It also adds a couple of function aliases:
 *
 * - `tonal.scale` is an alias for `tonal.scale.notes`
 * - `tonal.chord` is an alias for `tonal.chord.notes`
 *
 * @example
 * var tonal = require('tonal')
 * tonal.transpose(tonal.note.pc('C#2'), 'M3') // => 'E#'
 * tonal.chord('Dmaj7') // => ['D', 'F#', 'A', 'C#']
 *
 * @module tonal
 */
var assign = Object.assign;
var tonal = assign({}, array, transpose$1, harmonizer, distance);
tonal.pitch = pitch$1;
tonal.notation = notation;
tonal.note = note$1;
tonal.ivl = interval$1;
tonal.midi = midi$2;
tonal.freq = freq$3;
tonal.range = range;
tonal.key = key;
tonal.progression = progression;
tonal.sonority = sonority;
tonal.pitchset = pitchset$1;
tonal.pcset = pcset;

tonal.scale = function(name$$1) {
  return tonal.scale.notes(name$$1);
};
assign(tonal.scale, scale$1);
tonal.chord = function(name$$1) {
  return tonal.chord.notes(name$$1);
};
assign(tonal.chord, chord$1);

if (typeof window !== "undefined") { window.Tonal = tonal; }

var OCTS = [1, 2, 3, 4, 5, 6];

var Note = function (ref) {
  var tonic = ref.tonic;

  return (
  h( 'div', { class: "Note" },
    h( 'h4', null, "note" ),
    h( 'h1', null, tonic ),
    h( Link, { to: ["scales", tonic] }, tonic, " scales"), " | ", h( Link, { to: ["chords", tonic] }, tonic, " chords"),
    h( 'table', null,
      h( 'thead', null,
        h( 'tr', null,
          h( 'td', null, "Note" ),
          h( 'td', null, "Midi" ),
          h( 'td', null, "Frecuency" )
        )
      ),
      h( 'tbody', null,
        OCTS.map(function (o) { return (
          h( 'tr', null,
            h( 'td', null, tonic + o ),
            h( 'td', null, tonal.note.midi(tonic + o) ),
            h( 'td', null, tonal.note.freq(tonic + o).toFixed(3) )
          )
        ); })
      )
    )
  )
);
};

var routeTo = function () {
    var paths = [], len = arguments.length;
    while ( len-- ) paths[ len ] = arguments[ len ];

    return "#/" + paths.map(function (n) { return n.replace(/ /g, "_"); }).join("/");
};

var TONICS = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B B# Cb".split(" ");

var Tonics = function (ref) {
  var id = ref.id;
  var route = ref.route;

  return (
  h( 'span', { id: id, class: "Tonics" },
    TONICS.map(function (t) { return h( Link, { to: route(t) }, t); })
  )
);
};

var Breadcrumbs = function (ref, children) { return (
  h( 'div', { class: "Breadcrumbs" },
    h( Link, { to: [] }, "tonal"), " > ", children
  )
); };

var Scales = function (ref) {
  var tonic = ref.tonic;
  var names = ref.names; if ( names === void 0 ) names = tonal.scale.names();

  return (
  h( 'div', { class: "Scales" },
    h( Tonics, { route: function (t) { return ["scales", t]; } }),
    h( Breadcrumbs, null,
      h( Link, { to: ["note", tonic] }, tonic), " > ", tonic, " scales" ),
    h( 'h1', null, tonic, " scales" ),
    h( 'pre', null,
      h( 'code', null, "import tonal from \"tonal\";" ),
      h( 'code', null, "tonal.scale.names(); // => [\"", names[0], "\", \"", names[1], "\", ...]" )
    ),
    h( 'table', null,
      h( 'tbody', null,
        names.map(function (name) { return (
          h( 'tr', null,
            h( 'td', null,
              h( 'a', { href: routeTo("scale", name, tonic) },
                tonic, " ", name
              )
            )
          )
        ); })
      )
    )
  )
);
};

var toArray = function (arr) { return "[" + arr.map(function (t) { return ("\"" + t + "\""); }).join(", ") + "]"; };

var Scale = function (ref) {
  var tonic = ref.tonic;
  var name = ref.name;

  return (
  h( 'div', { class: "Scale" },
    h( Tonics, { route: function (t) { return ["scale", name, t]; } }),
    h( Breadcrumbs, null ),
    h( 'h4', null, "scale" ),
    h( 'h1', null,
      tonic, " ", name
    ),
    h( 'div', { class: "properties" },
      h( 'label', null, "Scale notes:" ),
      h( 'pre', null,
        h( 'code', null, "tonal.scale.notes(\"", tonic + " " + name, "\"); // => ", toArray(tonal.scale.get(name, tonic))
        )
      ),
      h( 'br', null )
    )
  )
);
};

var Chords = function (ref) {
  var tonic = ref.tonic;

  return (
  h( 'div', { class: "Chords" },
    h( 'h1', null, tonic, " chords" ),
    h( 'table', null,
      h( 'tbody', null,
        tonal.chord.names().map(function (name) { return (
          h( 'tr', null,
            h( 'td', null,
              h( Link, { to: ["chord", name, tonic] }, tonic + name)
            )
          )
        ); })
      )
    )
  )
);
};

var Chord = function (ref) {
  var tonic = ref.tonic;
  var name = ref.name;

  return (
  h( 'div', { class: "Chord" },
    h( 'h1', null, tonic + name )
  )
);
};

var Welcome = function (ref) { return (
  h( 'div', { class: "Welcome" },
    h( 'h1', null, "tonal" ),
    h( Tonics, { route: function (t) { return ["note", t]; } }),
    h( 'pre', null,
      h( 'code', null, "import tonal from \"tonal\"; " ),
      h( 'code', null, "tonal.note.freq(\"A4\") // => 440" ),
      h( 'code', null, "tonal.note.midi(\"A4\") // => 69" )
    ),
    h( 'h3', null,
      h( Link, { to: ["notes"] }, "Notes")
    ),
    h( 'pre', null,
      h( 'code', null, "tonal.note.freq(\"A4\") // => 440" ),
      h( 'code', null, "tonal.note.midi(\"A4\") // => 69" )
    )
  )
); };

var encode = function (paths) { return "#/" + paths.map(function (n) { return n.replace(/ /g, "_"); }).join("/"); };

var decode = function (route) { return route.split("/").map(function (n) { return n.replace(/_/g, " "); }); };

var Link = function (ref, children) {
  var to = ref.to;

  return h( 'a', { href: encode(to) }, children);
};

var Router = function (ref) {
  var route = ref.route;

  switch (route[0]) {
    case "note":
      return h( Note, { tonic: route[1] });
    case "scales":
      return h( Scales, { tonic: route[1] });
    case "scale":
      return h( Scale, { name: route[1], tonic: route[2] });
    case "chords":
      return h( Chords, { tonic: route[1] });
    case "chord":
      return h( Chord, { name: route[1], tonic: route[2] });
    default:
      return h( Welcome, null );
  }
};

app({
  state: {
    route: []
  },
  view: function (state) { return h( Router, { route: state.route }); },
  actions: {
    route: function (state, actions, data) {
      return { route: decode(data) };
    }
  },
  events: {
    load: function (state, actions) {
      console.log("load!");
      window.onhashchange = function () {
        actions.route(location.hash.slice(2));
      };
      window.onhashchange();
    }
  }
});

}());
