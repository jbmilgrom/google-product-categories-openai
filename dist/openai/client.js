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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSupportedModels = exports.chatOpenaiWithFunction = exports.chatOpenai = void 0;
const openai_1 = __importDefault(require("openai"));
const constants_1 = require("./constants");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const { OPENAI_API_KEY } = process.env;
if (OPENAI_API_KEY === undefined) {
  throw new Error("OPENAI_API_KEY is undefined.");
}
const openai = new openai_1.default({
  apiKey: OPENAI_API_KEY,
});
const chatOpenai = (messages, { model = constants_1.DEFAULT_MODEL, temperature = constants_1.DEFAULT_TEMP } = {}) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`Calling Chat Completion API with model: "${model}", temperature: ${temperature}`);
    const completion = yield openai.chat.completions.create({
      model,
      messages,
      temperature,
    });
    console.log("OpenAI chatOpenai Response", completion.choices);
    return (_a = completion.choices[0].message) === null || _a === void 0 ? void 0 : _a.content;
  });
exports.chatOpenai = chatOpenai;
const chatOpenaiWithFunction = (
  messages,
  { model = "gpt-3.5-turbo-0613", temperature = constants_1.DEFAULT_TEMP, functions = [] } = {}
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    console.log(`Calling Chat Completion with Functions API with model: "${model}", temperature: ${temperature}`);
    const completion = yield openai.chat.completions.create({
      model,
      messages,
      temperature,
      functions,
    });
    console.log("OpenAI chatOpenaiWithFunction Response", completion.choices);
    const choice = completion.choices[0];
    // if (choice.finish_reason === "stop") {
    //   return `"category": ${choice.message?.content}`;
    // }
    return (_c = (_b = choice.message) === null || _b === void 0 ? void 0 : _b.function_call) === null || _c === void 0
      ? void 0
      : _c.arguments;
  });
exports.chatOpenaiWithFunction = chatOpenaiWithFunction;
const listSupportedModels = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const models = yield openai.models.list();
    return models.data.map((model) => model.id).filter((id) => constants_1.ChatModels.has(id));
  });
exports.listSupportedModels = listSupportedModels;
