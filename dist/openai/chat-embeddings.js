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
exports.openAiSelectProductCategory = exports.generateChatPrompt = void 0;
const constants_1 = require("./constants");
const client_1 = require("./client");
const prompts_1 = require("./prompts");
const generateChatPrompt = (choices, metaTags) => [
  {
    role: "system",
    content:
      'You may select one of the choices that best apply. Respond with "None of the Above" if none are relevant.',
  },
  {
    role: "user",
    content: `
    Question: Which product category best describes the metadata?

    metadata:
      <meta name="description" content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% P">
      <meta property="og:title" content="The Men's Pocket Tee. -- Heather Grey">

    choices: 
      1) Apparel & Accessories > Clothing > Pants,
      2) Apparel & Accessories > Clothing > Underwear & Socks > Undershirts
      3) Apparel & Accessories > Clothing > Activewear
      4) Apparel & Accessories > Clothing > Shirts & Tops
      5) Apparel & Accessories > Clothing > Activewear > American Football Pants
  `,
  },
  { role: "assistant", content: "4) Apparel & Accessories > Clothing > Shirts & Tops" },
  {
    role: "user",
    content: `
    Question: Which product category best describes the metadata?

    metadata:
    ${metaTags}

    choices: \n\t${choices.map((choice, i) => `${i + 1}) ${choice}`).join("\n\t")}
  `,
  },
];
exports.generateChatPrompt = generateChatPrompt;
const EXAMPLE_FOR_FUNCTION_CALL = "Apparel & Accessories > Clothing > Shirts & Tops";
const formatMessagesPrompt = (messages) => messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n");
const openAiSelectProductCategory = (choices, metaTags, { model = constants_1.DEFAULT_MODEL, temperature }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if ((0, constants_1.inList)(constants_1.CHAT_COMPLETION_MODELS, model)) {
      const messages = (0, exports.generateChatPrompt)(choices, metaTags);
      const response =
        (_a = yield (0, client_1.chatOpenai)(messages, { model, temperature })) !== null && _a !== void 0 ? _a : "";
      console.log("response", response);
      return {
        productCategories: response.trim().split(" ").slice(1).join(" "),
        metadata: {
          prompt: formatMessagesPrompt(messages),
          response,
        },
      };
    }
    if ((0, constants_1.inList)(constants_1.FUNCTION_CALL_MODELS, model)) {
      const messages = (0, prompts_1.generateFunctionCallPrompt)(choices, metaTags, {
        example: EXAMPLE_FOR_FUNCTION_CALL,
      });
      const functions = (0, prompts_1.generateFunctions)({ example: EXAMPLE_FOR_FUNCTION_CALL });
      const response =
        (_b = yield (0, client_1.chatOpenaiWithFunction)(messages, { model, temperature, functions })) !== null &&
        _b !== void 0
          ? _b
          : "";
      console.log("response", response);
      const metadata = {
        prompt: formatMessagesPrompt(messages),
        response,
        functions,
      };
      try {
        const json = JSON.parse(response);
        return {
          productCategories: (_c = json.category) !== null && _c !== void 0 ? _c : "",
          metadata,
        };
      } catch (e) {
        return {
          productCategories: "None",
          metadata,
        };
      }
    }
    throw new Error(`Select one of these models {${constants_1.CHAT_MODELS.join(", ")}}`);
  });
exports.openAiSelectProductCategory = openAiSelectProductCategory;
