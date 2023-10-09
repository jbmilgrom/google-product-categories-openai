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
exports.getOrCreatePineconeIndex = exports.initializePineconeClient = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const { PINECONE_ENVIRONMENT, PINECONE_API_KEY } = process.env;
if (PINECONE_ENVIRONMENT === undefined) {
  throw new Error("PINECONE_ENVIRONMENT is undefined.");
}
if (PINECONE_API_KEY === undefined) {
  throw new Error("Pinecone API_KEY is undefined.");
}
const initializePineconeClient = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const pinecone = new pinecone_1.PineconeClient();
    yield pinecone.init({
      environment: PINECONE_ENVIRONMENT,
      apiKey: PINECONE_API_KEY,
    });
    return pinecone;
  });
exports.initializePineconeClient = initializePineconeClient;
const getOrCreatePineconeIndex = (pinecone, { name, dimension }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const indexes = yield pinecone.listIndexes();
    if (!indexes.includes(name)) {
      pinecone.createIndex({
        createRequest: { name, dimension },
      });
    }
    return pinecone.Index(name);
  });
exports.getOrCreatePineconeIndex = getOrCreatePineconeIndex;
