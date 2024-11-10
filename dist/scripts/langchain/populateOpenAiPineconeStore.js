"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
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
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const pinecone_1 = require("../../pinecone");
const document_1 = require("langchain/document");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@langchain/pinecone");
const googleProducts_1 = require("../../googleProducts");
const openai_2 = require("../../openai");
dotenv.config();
const { PINECONE_INDEX_NAME_OPEN_AI_ADA_002 } = process.env;
if (PINECONE_INDEX_NAME_OPEN_AI_ADA_002 === undefined) {
  throw new Error("PINECONE_INDEX_NAME_OPEN_AI_ADA_002 is undefined.");
}
const openAiAda002Embedder = new openai_1.OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: openai_2.ADA_002_EMBEDDING_MODEL,
});
const loadGoogleProductCategories = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    const documents = [];
    let lineNumber = 0;
    try {
      for (
        var _d = true, _e = __asyncValues((0, googleProducts_1.makeGoogleProductTypeTextLineIterator)()), _f;
        (_f = yield _e.next()), (_a = _f.done), !_a;
        _d = true
      ) {
        _c = _f.value;
        _d = false;
        const line = _c;
        documents.push(
          new document_1.Document({
            pageContent: line,
            metadata: { source: googleProducts_1.GOOGLE_PRODUCT_TYPES_URL, id: lineNumber++ },
          })
        );
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
    return documents;
  });
(() =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      console.log("Loading documents.");
      const documents = yield loadGoogleProductCategories();
      console.log("Initializing Pinecone.");
      const pineconeClient = yield (0, pinecone_1.initializePineconeClient)();
      const pineconeIndex = yield (0, pinecone_1.getOrCreatePineconeIndex)(pineconeClient, {
        name: PINECONE_INDEX_NAME_OPEN_AI_ADA_002,
        dimension: openai_2.OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION,
      });
      console.log("Retrieving embeddings from OpenAI and populating Pinecone index.");
      yield pinecone_2.PineconeStore.fromDocuments(documents, openAiAda002Embedder, {
        pineconeIndex,
      });
      console.log("Successfully populated Pinecone with OpenAI vector embeddings.");
    } catch (e) {
      console.log("Error populating Pinecone with OpenAI vector embeddings:", e);
    }
  }))();
