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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const csv_parse_1 = require("csv-parse");
const fs_1 = __importDefault(require("fs"));
const minimist_1 = __importDefault(require("minimist"));
const schema_1 = require("../schema");
const child_process_1 = require("child_process");
const LABELS_FILE_NAME = "labels.json";
const readCSV = (filePath) => {
  return fs_1.default.createReadStream(filePath).pipe(
    (0, csv_parse_1.parse)({
      // relax_quotes: true
    })
  );
};
const labels = JSON.parse(fs_1.default.readFileSync(`${__dirname}/${LABELS_FILE_NAME}`, "utf-8"));
const numUrlsBefore = Object.keys(labels).length;
const args = (0, minimist_1.default)(process.argv.slice(2));
const source = args.source;
if (typeof source !== "string" || !source.length) {
  console.log(`source=${source}`);
  throw new Error("Set --source to indicate the source csv path");
}
const parser = readCSV(source);
const urlIndex = schema_1.HEADER.indexOf("url");
const gpcIndex = schema_1.HEADER.indexOf("gpc");
const gpcQualityIndex = schema_1.HEADER.indexOf("gpc_quality");
const humanGpcIndex = schema_1.HEADER.indexOf("human_gpc");
const parseBenchmark = (row) => {
  const [url, gpc, gpcQuality, humanGpc] = [
    (0, schema_1.parseString)(row[urlIndex]),
    (0, schema_1.parseString)(row[gpcIndex]),
    (0, schema_1.parsePrecision)(row[gpcQualityIndex]),
    (0, schema_1.parseString)(row[humanGpcIndex]),
  ];
  if (url === null) {
    throw new Error("Url is undefined.");
  }
  return {
    url,
    gpc,
    gpcQuality,
    humanGpc,
  };
};
if ([urlIndex, gpcIndex, gpcQualityIndex].some((v) => v === -1)) {
  throw new Error("Index not found.");
}
(() =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e;
    let i = 0;
    try {
      for (
        var _f = true, parser_1 = __asyncValues(parser), parser_1_1;
        (parser_1_1 = yield parser_1.next()), (_a = parser_1_1.done), !_a;
        _f = true
      ) {
        _c = parser_1_1.value;
        _f = false;
        const result = _c;
        if (i === 0) {
          i++;
          continue; // skip header
        }
        console.log(`Parsing row ${i}`);
        const { url, gpc, gpcQuality, humanGpc } = parseBenchmark(result);
        i++;
        if (humanGpc === null) {
          console.log(`humanGpc is null for ${url}`);
          continue;
        }
        labels[url] = (_d = labels[url]) !== null && _d !== void 0 ? _d : {};
        const precision = new Set((_e = labels[url][humanGpc]) !== null && _e !== void 0 ? _e : []);
        precision.add("correct");
        labels[url][humanGpc] = Array.from(precision);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (!_f && !_a && (_b = parser_1.return)) yield _b.call(parser_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    const numUrlsAfter = Object.keys(labels).length;
    console.log(`Number of keys before run: ${numUrlsBefore}`);
    console.log(`Number of keys after run: ${numUrlsAfter}`);
    fs_1.default.writeFileSync(`${__dirname}/${LABELS_FILE_NAME}`, JSON.stringify(labels));
    (0, child_process_1.exec)("npm run prettier-labels");
    console.log("Done");
  }))();
