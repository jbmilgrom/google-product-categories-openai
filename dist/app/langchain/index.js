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
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleProductCategoriesSimilaritySearch = void 0;
const dotenv = __importStar(require("dotenv"));
const pinecone_1 = require("../../pinecone");
const openai_1 = require("../../openai");
const pinecone_2 = require("langchain/vectorstores/pinecone");
const openai_2 = require("langchain/embeddings/openai");
const openai_3 = require("../../openai");
dotenv.config();
const { PINECONE_INDEX_NAME_OPEN_AI_ADA_002, OPENAI_API_KEY } = process.env;
if (PINECONE_INDEX_NAME_OPEN_AI_ADA_002 === undefined) {
  throw new Error("PINECONE_INDEX_NAME_OPEN_AI_ADA_002 is undefined.");
}
if (OPENAI_API_KEY === undefined) {
  throw new Error("OPENAI_API_KEY is undefined.");
}
const openAiEmbedder = new openai_2.OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
  modelName: openai_3.ADA_002_EMBEDDING_MODEL,
});
const getPineconeGoogleProductCategoriesIndex = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const pineconeClient = yield (0, pinecone_1.initializePineconeClient)();
    const pineconeIndex = yield (0, pinecone_1.getOrCreatePineconeIndex)(pineconeClient, {
      name: PINECONE_INDEX_NAME_OPEN_AI_ADA_002,
      dimension: openai_1.OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION,
    });
    return pineconeIndex;
  });
/**
 * Pinecone index
 *
 * @param embedder Service for embedding each document in semantic dimensional space
 * @param documents
 * @returns
 */
const fromExistingIndex = (embedder, { pineconeIndex, namespace }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    return pinecone_2.PineconeStore.fromExistingIndex(embedder, { pineconeIndex, namespace });
  });
const googleProductCategoriesSimilaritySearch = (subject, { k = 10 } = {}) =>
  __awaiter(void 0, void 0, void 0, function* () {
    console.log("Retrieveing pinecone index.");
    const pineconeIndex = yield getPineconeGoogleProductCategoriesIndex();
    console.log("Configuring Langchain VectorStore");
    const store = yield fromExistingIndex(openAiEmbedder, { pineconeIndex });
    console.log("Performing similarity search.");
    return store.similaritySearchWithScore(subject, k);
  });
exports.googleProductCategoriesSimilaritySearch = googleProductCategoriesSimilaritySearch;
