"use strict";
var __await =
  (this && this.__await) ||
  function (v) {
    return this instanceof __await ? ((this.v = v), this) : new __await(v);
  };
var __asyncGenerator =
  (this && this.__asyncGenerator) ||
  function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []),
      i,
      q = [];
    return (
      (i = {}),
      verb("next"),
      verb("throw"),
      verb("return"),
      (i[Symbol.asyncIterator] = function () {
        return this;
      }),
      i
    );
    function verb(n) {
      if (g[n])
        i[n] = function (v) {
          return new Promise(function (a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if ((f(v), q.shift(), q.length)) resume(q[0][0], q[0][1]);
    }
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeTextFileLineIterator = void 0;
/**
 * Source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#processing_a_text_file_line_by_line
 * @param reader
 */
function makeTextFileLineIterator(reader) {
  return __asyncGenerator(this, arguments, function* makeTextFileLineIterator_1() {
    const utf8Decoder = new TextDecoder("utf-8");
    let { value, done: readerDone } = yield __await(reader.read());
    let chunk = value ? utf8Decoder.decode(value) : "";
    const newline = /\r?\n/gm;
    let startIndex = 0;
    while (true) {
      const result = newline.exec(chunk);
      if (!result) {
        if (readerDone) break;
        const remainder = chunk.substr(startIndex);
        ({ value, done: readerDone } = yield __await(reader.read()));
        chunk = remainder + (value ? utf8Decoder.decode(value) : "");
        startIndex = newline.lastIndex = 0;
        continue;
      }
      yield yield __await(chunk.substring(startIndex, result.index));
      startIndex = newline.lastIndex;
    }
    if (startIndex < chunk.length) {
      // Last line didn't end in a newline char
      yield yield __await(chunk.substr(startIndex));
    }
  });
}
exports.makeTextFileLineIterator = makeTextFileLineIterator;
const decode = (decoder, buf) => (buf ? decoder.decode(buf) : "");
