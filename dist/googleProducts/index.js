"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __asyncValues =
  (this && this.__asyncValues) ||
  function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator],
      i;
    return m
      ? m.call(o)
      : ((o = typeof __values === "function" ? __values(o) : o[Symbol.iterator]()),
        (i = {}),
        verb("next"),
        verb("throw"),
        verb("return"),
        (i[Symbol.asyncIterator] = function () {
          return this;
        }),
        i);
    function verb(n) {
      i[n] =
        o[n] &&
        function (v) {
          return new Promise(function (resolve, reject) {
            (v = o[n](v)), settle(resolve, reject, v.done, v.value);
          });
        };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function (v) {
        resolve({ value: v, done: d });
      }, reject);
    }
  };
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
exports.toLine =
  exports.toPath =
  exports.makeGoogleProductTypeTextLineIterator =
  exports.getGoogleProductCategoriesTaxonomy =
  exports.GOOGLE_PRODUCT_TYPES_URL =
    void 0;
const readTxtFile_1 = require("../utils/readTxtFile");
const tree_1 = require("../utils/tree");
exports.GOOGLE_PRODUCT_TYPES_URL = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt";
const GOOGLE_CATEGORY_DELIMITER = " > ";
const getGoogleProductCategoriesTaxonomy = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    let nodes = [];
    try {
      for (
        var _d = true, _e = __asyncValues(makeGoogleProductTypeTextLineIterator()), _f;
        (_f = yield _e.next()), (_a = _f.done), !_a;
        _d = true
      ) {
        _c = _f.value;
        _d = false;
        const line = _c;
        (0, tree_1.insert)(nodes, (0, exports.toPath)(line));
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return nodes;
  });
exports.getGoogleProductCategoriesTaxonomy = getGoogleProductCategoriesTaxonomy;
function makeGoogleProductTypeTextLineIterator() {
  var _a;
  return __asyncGenerator(this, arguments, function* makeGoogleProductTypeTextLineIterator_1() {
    var _b, e_2, _c, _d;
    const response = yield __await(fetch(exports.GOOGLE_PRODUCT_TYPES_URL));
    const reader = (_a = response.body) === null || _a === void 0 ? void 0 : _a.getReader();
    if (!reader) {
      throw new Error("Error fetching Google Products. Please try again");
    }
    let i = 0;
    try {
      for (
        var _e = true, _f = __asyncValues((0, readTxtFile_1.makeTextFileLineIterator)(reader)), _g;
        (_g = yield __await(_f.next())), (_b = _g.done), !_b;
        _e = true
      ) {
        _d = _g.value;
        _e = false;
        const line = _d;
        // skip the first line since its a title, not data
        if (i !== 0) {
          yield yield __await(line);
        }
        i++;
      }
    } catch (e_2_1) {
      e_2 = { error: e_2_1 };
    } finally {
      try {
        if (!_e && !_b && (_c = _f.return)) yield __await(_c.call(_f));
      } finally {
        if (e_2) throw e_2.error;
      }
    }
  });
}
exports.makeGoogleProductTypeTextLineIterator = makeGoogleProductTypeTextLineIterator;
/**
 * Parse a text line e.g.
 *   "Animals & Pet Supplies > Pet Supplies > Bird Supplies > Bird Cage Accessories"
 *
 * Leveraging the ">" character to indicate level, and turn into a Queue<string> data structure.
 *
 * @param line
 * @returns
 */
const toPath = (line, { delimitingChar = GOOGLE_CATEGORY_DELIMITER } = {}) => {
  const list = line.split(delimitingChar).map((token) => token.trim());
  const queue = (0, tree_1.makeQueue)();
  list.forEach((token) => queue.enqueue(token));
  return queue;
};
exports.toPath = toPath;
const toLine = (path, { delimitingChar = GOOGLE_CATEGORY_DELIMITER } = {}) => {
  return path.toList().join(delimitingChar);
};
exports.toLine = toLine;
