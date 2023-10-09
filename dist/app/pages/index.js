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
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureVectorSearchRoute = exports.configureGraphTraversalRoute = void 0;
const isValidHttpUrl_1 = require("../../utils/isValidHttpUrl");
const openai_1 = require("../../openai");
const templates_1 = require("../templates");
const crawl_1 = require("../crawl");
const googleProducts_1 = require("../../googleProducts");
const chatOpenaiGraphTraversal_1 = require("../../chatOpenaiGraphTraversal");
const gpt_3_encoder_1 = require("gpt-3-encoder");
const chatOpenaiEmbeddings_1 = require("../../chatOpenaiEmbeddings");
const assertUnreachable_1 = require("../../utils/assertUnreachable");
const escapeHtml_1 = require("../../utils/escapeHtml");
const constants_1 = require("../../openai/constants");
const renderGraphTraversalFormOrError = ({ route, source }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    let models;
    try {
      models = yield (0, openai_1.listSupportedModels)();
    } catch (e) {
      console.log(e);
      return (0, templates_1.errorTemplate)("Failed to fetch OpenAI models. Try again.");
    }
    return (0, templates_1.graphTraversalForm)({ models, route, source });
  });
const renderVectorSearchFormOrError = ({ route, source }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    let models;
    try {
      models = yield (0, openai_1.listSupportedModels)();
    } catch (e) {
      console.log(e);
      return (0, templates_1.errorTemplate)("Failed to fetch OpenAI models. Try again.");
    }
    return (0, templates_1.vectorSearchForm)({ source, models, route });
  });
const getProductCategoriesOrRenderError = (getResult) =>
  __awaiter(void 0, void 0, void 0, function* () {
    let nodes;
    try {
      console.log("parsing google product categories into tree...");
      nodes = yield (0, googleProducts_1.getGoogleProductCategoriesTaxonomy)();
    } catch (e) {
      console.log("error", e);
      return (0, templates_1.errorTemplate)("Error fetching Google Product Categories. Try again.");
    }
    try {
      console.log("chating openai...");
      return yield getResult(nodes);
    } catch (e) {
      console.log("error", e);
      return (0, templates_1.errorTemplate)("OpenAI Error. Try again.");
    }
  });
const parseSource = (source) => {
  const defaultSource = "url";
  if (!source) {
    return defaultSource;
  }
  const lower = source.toLowerCase();
  switch (lower) {
    case "url":
    case "text":
      return lower;
    default:
      return defaultSource;
  }
};
const analyzeTranscript = (transcipt) => {
  var _a, _b;
  const formatted = transcipt.map(({ prompt, response }) => `${prompt} ${response}`).join(" ");
  return {
    transcript: formatted,
    words:
      (_b = (_a = formatted.match(/\S+/g)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0
        ? _b
        : 0,
    tokens: (0, gpt_3_encoder_1.encode)(formatted),
  };
};
const configureGraphTraversalRoute = (app, { route, queryParamDelimiter }) => {
  app
    .route(route)
    .get((req, res) =>
      __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        res.set("Content-Type", "text/html");
        const url = (_a = req.query.url) !== null && _a !== void 0 ? _a : undefined;
        const model = (_b = req.query.model) !== null && _b !== void 0 ? _b : "";
        const source = parseSource((_c = req.query.source) !== null && _c !== void 0 ? _c : undefined);
        const text = (_d = req.query.text) !== null && _d !== void 0 ? _d : null;
        const writeHtml = (html) => {
          res.write(Buffer.from(html));
        };
        const sendHtml = (html) => {
          writeHtml(html);
          res.end();
        };
        switch (source) {
          case "url": {
            /**
             * Case where either
             *  (i) user's first time through /url and "url" is empty --> show the form
             *  (ii) url entered in /url is invalid --> show the form
             */
            if (!(url && (0, isValidHttpUrl_1.isValidHttpUrl)(url))) {
              const formOrError = yield renderGraphTraversalFormOrError({ route, source: "url" });
              sendHtml(formOrError);
              return;
            }
            console.log(`Received request for URL: ${url}, model: ${model}`);
            writeHtml(
              (0, templates_1.htmlTemplate)((0, templates_1.homeTemplate)((0, templates_1.resultsHeaderTemplate)(url)))
            );
            let metaTags;
            try {
              console.log("scraping meta tags...");
              metaTags = yield (0, crawl_1.getMetaTags)(url);
            } catch (e) {
              console.log("error", e);
              sendHtml(
                (0, templates_1.errorTemplate)(
                  `Error Fetching ${url}. \n\nMost likely we failed the advertiser bot check. I would try a different advertiser in the same product category and try again.`
                )
              );
              return;
            }
            if (!metaTags.length) {
              sendHtml((0, templates_1.errorTemplate)(`No metatags retrieved at: ${url}`));
              return;
            }
            writeHtml((0, templates_1.scrapedMetaTagsTemplate)(metaTags));
            const result = yield getProductCategoriesOrRenderError((nodes) =>
              (0, chatOpenaiGraphTraversal_1.chatOpenaiGraphTraversal)(nodes, metaTags, {
                retries: 1,
                model: (0, openai_1.inList)(constants_1.CHAT_MODELS, model) ? model : undefined,
              })
            );
            if (typeof result === "string") {
              sendHtml(result);
              return;
            }
            const { metadata } = result;
            const { words, tokens } = analyzeTranscript(metadata.transcript.toList());
            if (result.type === "error:chat") {
              sendHtml(
                (0, templates_1.noCategoryFound)({
                  model: metadata.model,
                  temperature: metadata.temperature,
                  tokens: tokens.length,
                  words,
                  transcript: metadata.transcript.toList(),
                })
              );
              return;
            }
            const { categories } = result;
            if (result.type === "error:purge") {
              sendHtml(
                (0, templates_1.errorPurgingPath)({
                  model: metadata.model,
                  temperature: metadata.temperature,
                  tokens: tokens.length,
                  words,
                  transcript: metadata.transcript.toList(),
                  categories: categories.toList(),
                })
              );
              return;
            }
            sendHtml(
              (0, templates_1.categoryResultWithChatTemplate)({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
                categories: categories.toList(),
                queryParamDelimiter,
              })
            );
            return;
          }
          case "text": {
            /**
             * Case where either
             *  (i) user's first time through /url and "url" is empty --> show the form
             *  (ii) url entered in /url is invalid --> show the form
             */
            if (!text) {
              const formOrError = yield renderGraphTraversalFormOrError({ route, source: "text" });
              sendHtml(formOrError);
              return;
            }
            console.log(`Received request for text: ${text}\n, model: ${model}`);
            writeHtml(
              (0, templates_1.htmlTemplate)(
                (0, templates_1.homeTemplate)(
                  (0, templates_1.resultsHeaderTemplateText)((0, escapeHtml_1.escapeHtml)(text))
                )
              )
            );
            const result = yield getProductCategoriesOrRenderError((nodes) =>
              (0, chatOpenaiGraphTraversal_1.chatOpenaiGraphTraversal)(nodes, text, {
                retries: 1,
                model: (0, openai_1.inList)(constants_1.CHAT_MODELS, model) ? model : undefined,
              })
            );
            if (typeof result === "string") {
              sendHtml(result);
              return;
            }
            const { metadata } = result;
            const { words, tokens } = analyzeTranscript(metadata.transcript.toList());
            if (result.type === "error:chat") {
              sendHtml(
                (0, templates_1.noCategoryFound)({
                  model: metadata.model,
                  temperature: metadata.temperature,
                  tokens: tokens.length,
                  words,
                  transcript: metadata.transcript.toList(),
                })
              );
              return;
            }
            const { categories } = result;
            if (result.type === "error:purge") {
              sendHtml(
                (0, templates_1.errorPurgingPath)({
                  model: metadata.model,
                  temperature: metadata.temperature,
                  tokens: tokens.length,
                  words,
                  transcript: metadata.transcript.toList(),
                  categories: categories.toList(),
                })
              );
              return;
            }
            sendHtml(
              (0, templates_1.categoryResultWithChatTemplate)({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
                categories: categories.toList(),
                queryParamDelimiter,
              })
            );
            return;
          }
          default:
            return (0, assertUnreachable_1.assertUnreachable)(source);
        }
      })
    )
    .post((req, res) =>
      __awaiter(void 0, void 0, void 0, function* () {
        const model = req.body.model;
        const url = req.body.url;
        const text = req.body.text;
        const source = parseSource(req.body.source);
        switch (source) {
          case "text":
            if (!text) {
              res.send("No Text received.");
              return;
            }
            res.redirect(
              route +
                `?model=${encodeURIComponent(model ? model : "default")}&text=${encodeURIComponent(
                  text
                )}&source=${source}`
            );
            return;
          case "url":
            if (!url) {
              res.send("No URL received");
              return;
            }
            res.redirect(
              route +
                `?model=${encodeURIComponent(model ? model : "default")}&url=${encodeURIComponent(
                  url
                )}&source=${source}`
            );
            return;
          default:
            return (0, assertUnreachable_1.assertUnreachable)(source);
        }
      })
    );
};
exports.configureGraphTraversalRoute = configureGraphTraversalRoute;
const configureVectorSearchRoute = (app, { route, queryParamDelimiter }) => {
  app
    .route(route)
    .get((req, res) =>
      __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        res.set("Content-Type", "text/html");
        const url = (_a = req.query.url) !== null && _a !== void 0 ? _a : null;
        const model = (_b = req.query.model) !== null && _b !== void 0 ? _b : "";
        const k = (_c = req.query.k) !== null && _c !== void 0 ? _c : "";
        const source = parseSource((_d = req.query.source) !== null && _d !== void 0 ? _d : undefined);
        const text = (_e = req.query.text) !== null && _e !== void 0 ? _e : null;
        const writeHtml = (html) => {
          res.write(Buffer.from(html));
        };
        const sendHtml = (html) => {
          writeHtml(html);
          res.end();
        };
        switch (source) {
          case "url": {
            /**
             * Case where either
             *  (i) user's first time through /url and "url" is empty --> show the form
             *  (ii) url entered in /url is invalid --> show the form
             */
            if (!(url && (0, isValidHttpUrl_1.isValidHttpUrl)(url))) {
              const formOrError = yield renderVectorSearchFormOrError({ route, source: "url" });
              sendHtml(formOrError);
              return;
            }
            const kNumber = parseInt(k);
            console.log(`Received request for URL: ${url}, model: ${model}`);
            writeHtml(
              (0, templates_1.htmlTemplate)((0, templates_1.homeTemplate)((0, templates_1.resultsHeaderTemplate)(url)))
            );
            let metaTags;
            try {
              console.log("scraping meta tags...");
              metaTags = yield (0, crawl_1.getMetaTags)(url);
            } catch (e) {
              console.log("error", e);
              sendHtml(
                (0, templates_1.errorTemplate)(
                  `Error Fetching ${url}. \n\nMost likely we failed the advertiser bot check. I would try a different advertiser in the same product category and try again.`
                )
              );
              return;
            }
            if (!metaTags.length) {
              sendHtml((0, templates_1.errorTemplate)(`No metatags retrieved at: ${url}`));
              return;
            }
            writeHtml((0, templates_1.scrapedMetaTagsTemplate)(metaTags));
            const search = yield getProductCategoriesOrRenderError((nodes) =>
              (0, chatOpenaiEmbeddings_1.similaritySearch)(nodes, metaTags, {
                k: Number.isInteger(kNumber) ? kNumber : undefined,
              })
            );
            if (typeof search === "string") {
              sendHtml(search);
              return;
            }
            if (search.type === "error:NoCategoryFound") {
              sendHtml(/*html*/ `
            <h1>No Product Category Found</h1>
            <p>Unable to parse found category string for k = 1</p>
            `);
              return;
            }
            writeHtml((0, templates_1.topKTemplate)({ top: search.metadata.top, k: search.metadata.k }));
            if (search.type === "success") {
              sendHtml(
                (0, templates_1.categoryResult)({
                  categories: search.categories.toList(),
                  queryParamDelimiter,
                })
              );
              return;
            }
            const result = yield getProductCategoriesOrRenderError((nodes) =>
              (0, chatOpenaiEmbeddings_1.chatOpenaiEmbeddings)(nodes, metaTags, search.metadata.top, {
                model: (0, openai_1.inList)(constants_1.CHAT_MODELS, model) ? model : undefined,
              })
            );
            if (typeof result === "string") {
              sendHtml(result);
              return;
            }
            const { metadata } = result;
            const { words, tokens } = analyzeTranscript(metadata.transcript.toList());
            if (result.type === "error:NoCategoryFound") {
              sendHtml(
                (0, templates_1.noCategoryFound)({
                  model: metadata.model,
                  temperature: metadata.temperature,
                  tokens: tokens.length,
                  words,
                  transcript: metadata.transcript.toList(),
                })
              );
              return;
            }
            const { categories } = result;
            sendHtml(
              (0, templates_1.categoryResultWithChatTemplate)({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
                categories: categories.toList(),
                queryParamDelimiter,
              })
            );
            return;
          }
          case "text": {
            /**
             * Case where either
             *  (i) user's first time through /url and "text" is empty --> show the form
             *  (ii) text entered in /url is invalid --> show the form
             */
            if (!text) {
              const formOrError = yield renderVectorSearchFormOrError({ route, source: "text" });
              sendHtml(formOrError);
              return;
            }
            const kNumber = parseInt(k);
            console.log(`Received request for text: ${text}\n, model: ${model}`);
            writeHtml(
              (0, templates_1.htmlTemplate)(
                (0, templates_1.homeTemplate)(
                  (0, templates_1.resultsHeaderTemplateText)((0, escapeHtml_1.escapeHtml)(text))
                )
              )
            );
            const search = yield getProductCategoriesOrRenderError((nodes) =>
              (0, chatOpenaiEmbeddings_1.similaritySearch)(nodes, text, {
                k: Number.isInteger(kNumber) ? kNumber : undefined,
              })
            );
            if (typeof search === "string") {
              sendHtml(search);
              return;
            }
            if (search.type === "error:NoCategoryFound") {
              sendHtml(/*html*/ `
            <h1>No Product Category Found</h1>
            <p>Unable to parse found category string for k = 1</p>
            `);
              return;
            }
            writeHtml((0, templates_1.topKTemplate)({ top: search.metadata.top, k: search.metadata.k }));
            if (search.type === "success") {
              sendHtml(
                (0, templates_1.categoryResult)({
                  categories: search.categories.toList(),
                  queryParamDelimiter,
                })
              );
              return;
            }
            const result = yield getProductCategoriesOrRenderError((nodes) =>
              (0, chatOpenaiEmbeddings_1.chatOpenaiEmbeddings)(nodes, text, search.metadata.top, {
                model: (0, openai_1.inList)(constants_1.CHAT_MODELS, model) ? model : undefined,
              })
            );
            if (typeof result === "string") {
              sendHtml(result);
              return;
            }
            if (typeof result === "string") {
              sendHtml(result);
              return;
            }
            const { metadata } = result;
            const { words, tokens } = analyzeTranscript(metadata.transcript.toList());
            if (result.type === "error:NoCategoryFound") {
              sendHtml(
                (0, templates_1.noCategoryFound)({
                  model: metadata.model,
                  temperature: metadata.temperature,
                  tokens: tokens.length,
                  words,
                  transcript: metadata.transcript.toList(),
                })
              );
              return;
            }
            const { categories } = result;
            sendHtml(
              (0, templates_1.categoryResultWithChatTemplate)({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
                categories: categories.toList(),
                queryParamDelimiter,
              })
            );
            return;
          }
          default:
            return (0, assertUnreachable_1.assertUnreachable)(source);
        }
      })
    )
    .post((req, res) =>
      __awaiter(void 0, void 0, void 0, function* () {
        const model = req.body.model;
        const url = req.body.url;
        const text = req.body.text;
        const k = req.body.k;
        const source = parseSource(req.body.source);
        switch (source) {
          case "text":
            if (!text) {
              res.send("No Text received.");
              return;
            }
            res.redirect(
              route +
                `?model=${encodeURIComponent(model ? model : "default")}&text=${encodeURIComponent(
                  text
                )}&k=${encodeURIComponent(k ? k : "default")}&source=${source}`
            );
            return;
          case "url":
            if (!url) {
              res.send("No URL received");
              return;
            }
            res.redirect(
              route +
                `?model=${encodeURIComponent(model ? model : "default")}&url=${encodeURIComponent(
                  url
                )}&k=${encodeURIComponent(k ? k : "default")}&source=${source}`
            );
            return;
          default:
            return (0, assertUnreachable_1.assertUnreachable)(source);
        }
      })
    );
};
exports.configureVectorSearchRoute = configureVectorSearchRoute;
