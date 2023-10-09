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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tree_1 = require("../utils/tree");
const googleProducts_1 = require("../googleProducts");
const templates_1 = require("./templates");
const routes_1 = require("./routes");
const pages_1 = require("./pages");
const app = (0, express_1.default)();
/**
 * These configurations are needed to be receive form data in POST methods
 *
 * @see https://stackoverflow.com/a/12008719/3645851
 * @see https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
 */
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const PORT = (_a = process.env.PORT) /* needed for Heroku deployment */ !== null && _a !== void 0 ? _a : 3003;
// this needs to be a character that does not appear in a google product category name (e.g. "," won't work properly)
const QUERY_PARAM_DELIMITER = "_";
app.get("/", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(
        (0, templates_1.htmlTemplate)(/*html*/ `
    <h1>Explore Google Product Types</h1>
    <ul>
      ${(0, templates_1.routeList)(routes_1.ROUTES)}
    </ul>
    ${(0, templates_1.footerTemplate)()}
  `)
      )
    );
  })
);
app.get(routes_1.ROUTES.URL.url, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(
        (0, templates_1.htmlTemplate)(
          (0, templates_1.homeTemplate)(/*html*/ `
    <h1>Search Strategies</h1>
    <ul>
      ${(0, templates_1.routeList)(routes_1.ROUTES.URL.ROUTES)}
    </ul>
    ${(0, templates_1.footerTemplate)()}
  `)
        )
      )
    );
  })
);
app.get(routes_1.ROUTES.TEXT.url, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _b, e_1, _c, _d;
    console.log(`fetching google product type...`);
    try {
      for (
        var _e = true, _f = __asyncValues((0, googleProducts_1.makeGoogleProductTypeTextLineIterator)()), _g;
        (_g = yield _f.next()), (_b = _g.done), !_b;
        _e = true
      ) {
        _d = _g.value;
        _e = false;
        const line = _d;
        res.write(`${line}\n`);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (!_e && !_b && (_c = _f.return)) yield _c.call(_f);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    res.end();
  })
);
app.get(routes_1.ROUTES.INTERNAL_REPRESENTATION.url, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    console.log(`fetching google product type...`);
    const nodes = yield (0, googleProducts_1.getGoogleProductCategoriesTaxonomy)();
    res.send(nodes);
  })
);
app.get(routes_1.ROUTES.GPC_STATS.url, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    console.log("calculating stats...");
    const nodes = yield (0, googleProducts_1.getGoogleProductCategoriesTaxonomy)();
    let [token, maxDeg] = ["", 0];
    let [nodeCount, levelCount] = [0, 0];
    let [leafNodeCount, leafNodeLevelCount] = [0, 0];
    let maxLevels = 0;
    (0, tree_1.forEachBreadthFirst)(nodes, (node, level) => {
      nodeCount++;
      levelCount = levelCount + level;
      maxLevels = maxLevels > level ? maxLevels : level;
      const numChildren = node.children.length;
      if (!numChildren) {
        leafNodeCount++;
        leafNodeLevelCount = leafNodeLevelCount + level;
      }
      if (numChildren > maxDeg) {
        maxDeg = numChildren;
        token = node.value;
      }
    });
    const levelToEdge = (level) => level - 1;
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(
        (0, templates_1.htmlTemplate)(
          (0, templates_1.homeTemplate)(/*html*/ `
      <h1>Stats</h1>
      <p>Total Google Product Categories (i.e. the count of all nodes): ${nodeCount}</p>
      <p>The category "${token}" has the highest degree: ${maxDeg}</p>
      <h2>Path Length (Measured in Edges)</h2>
      <p>Longest path: ${levelToEdge(maxLevels)}</p>
      <p>Average path of leaf nodes: ${levelToEdge(leafNodeLevelCount / leafNodeCount).toFixed(2)}</p>
      <p>Average path of all nodes: ${levelToEdge(levelCount / nodeCount).toFixed(2)}</p>
      `)
        )
      )
    );
  })
);
app.get(routes_1.ROUTES.TRAVERSE.url, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j;
    console.log("calculating children...");
    const nodes = yield (0, googleProducts_1.getGoogleProductCategoriesTaxonomy)();
    try {
      const pathString = (_h = req.query.path) !== null && _h !== void 0 ? _h : null;
      const path = pathString
        ? (0, googleProducts_1.toPath)(pathString, { delimitingChar: QUERY_PARAM_DELIMITER })
        : (0, tree_1.makeQueue)();
      const node = (0, tree_1.find)(nodes, { path: path.copy() });
      const children =
        (_j = node === null || node === void 0 ? void 0 : node.children) !== null && _j !== void 0 ? _j : nodes;
      const pathList = path.toList();
      const childrenList = (0, tree_1.getValues)(children);
      res.set("Content-Type", "text/html");
      res.send(
        Buffer.from(
          (0, templates_1.htmlTemplate)(
            (0, templates_1.homeTemplate)(/*html*/ `
      <h2>Path</h2>
      <div>
        <span>${pathList.length ? `<a href=${routes_1.ROUTES.TRAVERSE.url}>Root</a><span> > </span>` : "Root"}</span>
        ${(0, templates_1.cookieTrailTemplate)(routes_1.ROUTES.TRAVERSE.url, pathList, {
          delimiter: QUERY_PARAM_DELIMITER,
        })}
      </div>
      <h2>Next</h2>
      ${childrenList.length === 0 ? `<div><span>Leaf Node &#127809;</span></div>` : ""}
      <ul>
        ${childrenList
          .map(
            (value) => `<li>
                ${(0, templates_1.linkTemplate)(routes_1.ROUTES.TRAVERSE.url, [...pathList, value], {
                  delimiter: QUERY_PARAM_DELIMITER,
                })}
              </li>`
          )
          .join("")}
      </ul>
    `)
          )
        )
      );
    } catch (_k) {
      res.send("error parsing path. Make sure path is comma delimited");
    }
  })
);
app.get(routes_1.ROUTES.SEARCH.url, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _l, e_2, _m, _o;
    var _p;
    console.log("searching...");
    res.set("Content-Type", "text/html");
    const term = (_p = req.query.term) !== null && _p !== void 0 ? _p : null;
    if (!term) {
      res.send(
        Buffer.from(
          (0, templates_1.htmlTemplate)(
            (0, templates_1.homeTemplate)(/*html*/ `
          <h1>Instructions</h1>
          <p>Add a valid query parameter of form "?term=MY_SEARCH_TERM" to the url and hit enter.</P>
        `)
          )
        )
      );
      return;
    }
    const lineMatches = [];
    try {
      for (
        var _q = true, _r = __asyncValues((0, googleProducts_1.makeGoogleProductTypeTextLineIterator)()), _s;
        (_s = yield _r.next()), (_l = _s.done), !_l;
        _q = true
      ) {
        _o = _s.value;
        _q = false;
        const line = _o;
        if (line.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
          lineMatches.push(line);
        }
      }
    } catch (e_2_1) {
      e_2 = { error: e_2_1 };
    } finally {
      try {
        if (!_q && !_l && (_m = _r.return)) yield _m.call(_r);
      } finally {
        if (e_2) throw e_2.error;
      }
    }
    res.send(
      Buffer.from(
        (0, templates_1.htmlTemplate)(
          (0, templates_1.homeTemplate)(/*html*/ `
    <h1>Search Results</h1>
    ${
      !lineMatches.length
        ? "<p>No Results</p>"
        : `<ul>
        ${lineMatches
          .map((match) => {
            const categories = match.split(">").map((s) => s.trim());
            return `
              <li>
                ${(0, templates_1.cookieTrailTemplate)(routes_1.ROUTES.TRAVERSE.url, categories, {
                  delimiter: QUERY_PARAM_DELIMITER,
                })}
              </li>`;
          })
          .join("")}
      </ul>`
    }
  `)
        )
      )
    );
  })
);
(0, pages_1.configureGraphTraversalRoute)(app, {
  route: routes_1.ROUTES.URL.ROUTES.GRAPH_TRAVERSAL.url,
  queryParamDelimiter: QUERY_PARAM_DELIMITER,
});
(0, pages_1.configureVectorSearchRoute)(app, {
  route: routes_1.ROUTES.URL.ROUTES.VECTOR_SEARCH.url,
  queryParamDelimiter: QUERY_PARAM_DELIMITER,
});
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
