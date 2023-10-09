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
exports.chatOpenaiEmbeddings = exports.similaritySearch = void 0;
const tree_1 = require("./utils/tree");
const openai_1 = require("./openai");
const langchain_1 = require("./app/langchain");
const googleProducts_1 = require("./googleProducts");
const timeoutPromise_1 = require("./utils/timeoutPromise");
const constants_1 = require("./openai/constants");
const similaritySearch = (productTaxonomy, webPageMetaData, { k = 10 }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const similar = yield (0, langchain_1.googleProductCategoriesSimilaritySearch)(webPageMetaData, { k });
    const topCategories = similar.map(([document, score]) => ({ category: document.pageContent, score }));
    // Note that the length of categoriesList is determined by k.
    if (topCategories.length > 1) {
      return {
        type: "many",
        metadata: { k, top: topCategories },
      };
    }
    const categories = (0, googleProducts_1.toPath)(topCategories[0].category);
    const ok = (0, tree_1.find)(productTaxonomy, { path: categories.copy() });
    if (!ok) {
      return {
        type: "error:NoCategoryFound",
        categories,
        metadata: { k, top: topCategories },
      };
    }
    return {
      type: "success",
      categories,
      metadata: { k, top: topCategories },
    };
  });
exports.similaritySearch = similaritySearch;
/**
 * Converse with openai traversing the product taxonomy tree for the next multiple choice question
 *
 * @param productTaxonomy
 * @param webPageMetaData
 * @param openaiConfig
 * @returns
 */
const chatOpenaiEmbeddings = (
  productTaxonomy,
  webPageMetaData,
  topCategories,
  { model = constants_1.DEFAULT_MODEL, temperature = constants_1.DEFAULT_TEMP } = {}
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const transcript = (0, tree_1.makeQueue)();
    const {
      productCategories,
      metadata: { prompt, response },
    } = yield (0, timeoutPromise_1.timeoutPromise)(
      (0, openai_1.openAiSelectProductCategory)(
        topCategories.map(({ category }) => category),
        webPageMetaData,
        {
          model,
          temperature,
        }
      ),
      { errorMessage: "OpenAI chat timed out", milliseconds: 5000 /* 5 seconds */ }
    );
    transcript.enqueue({ prompt, response });
    const categories = (0, googleProducts_1.toPath)(productCategories);
    const ok = (0, tree_1.find)(productTaxonomy, { path: categories.copy() });
    if (!ok) {
      return {
        type: "error:NoCategoryFound",
        categories,
        metadata: { transcript, model, temperature },
      };
    }
    return {
      type: "success",
      categories,
      metadata: { transcript, model, temperature },
    };
  });
exports.chatOpenaiEmbeddings = chatOpenaiEmbeddings;
