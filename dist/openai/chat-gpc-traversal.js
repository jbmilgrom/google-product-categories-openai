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
exports.openAiAssessStateOfDeadend =
  exports.openAiSelectCategoryFromChoices =
  exports.generateCategorizationAuditChatPrompt =
  exports.Correct =
  exports.Incorrect =
  exports.generateChatPrompt =
  exports.generateInstructivePrompt =
    void 0;
const constants_1 = require("./constants");
const client_1 = require("./client");
const prompts_1 = require("./prompts");
const generateInstructivePrompt = (choices, metaTags) => `
  Select a category from the following list 
        
  ${choices.join(", ")}

  that best describes the website represented by these meta tags

  ${metaTags}

  Respond only with the selected category or an empty response if none are relevant.
  `;
exports.generateInstructivePrompt = generateInstructivePrompt;
const generateChatPrompt = (choices, metaTags) => [
  {
    role: "system",
    content:
      'You are a multiple-choice test taker. You may select one of the choices that best apply. Respond with "None of the Above" if none are relevant.',
  },
  {
    role: "user",
    content: `
    Question: Which product category best describes the metadata?

    metadata:
    <meta name="description" content="Buy Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee: Cooking Torches - Amazon.com ✓ FREE DELIVERY possible on eligible purchases">
    <meta name="title" content="Amazon.com: Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee : Home &amp; Kitchen">

    choices: 
      1) Bathroom Accessories
      2) Business & Home Security
      3) Decor, Emergency Preparedness
      4) Fireplace & Wood Stove Accessories
      5) Fireplaces, Flood, Fire & Gas Safety
      6) Household Appliance Accessories
      7) Household Appliances
      8) Household Supplies
      9) Kitchen & Dining
      10) Lawn & Garden, Lighting
      11) Lighting Accessories
      12) Linens & Bedding
      13) Parasols & Rain Umbrellas
      14) Plants, Pool & Spa
      15) Smoking Accessories
      16) Umbrella Sleeves & Cases
      17) Wood Stoves
  `,
  },
  { role: "assistant", content: "9) Kitchen & Dining" },
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
exports.Incorrect = "Incorrect";
exports.Correct = "Correct";
const States = [exports.Incorrect, exports.Correct];
const generateCategorizationAuditChatPrompt = (category, examples, metaTags) => [
  {
    role: "system",
    content: `You determine whether products have been correctly categorized. I'll give you metadata describing the product and a possible category. I'll also give you examples of that category.
    
    Please answer with either "Correct" or "Incorrect".
      `,
  },
  {
    role: "user",
    content: `
      Product metadata:
      <meta name="description" content="Amazon.com: Produce Red Mango, 1 Each : Grocery &amp; Gourmet Food">
      <meta name="title" content="Amazon.com: Produce Red Mango, 1 Each : Grocery &amp; Gourmet Food">

      Category: Fresh & Frozen Fruits

      Examples of the Category: Apples, Avocados, Babacos, Bananas, Berries, Coconuts, Tamarindo        
    `,
  },
  { role: "assistant", content: "Correct" },
  {
    role: "user",
    content: `
      Product metadata:
      <meta name="description" content="Find the Nike Pegasus 40 Women's Road Running Shoes at Nike.com.  Free delivery and returns.">
      <meta property="og:title" content="Nike Pegasus 40 Women's Road Running Shoes. Nike.com">
      <meta property="og:description" content="Find the Nike Pegasus 40 Women's Road Running Shoes at Nike.com.  Free delivery and returns.">

      Category: Track & Field

      Examples of the Category: Discus, High Jump Crossbars, Javelins, Shot Puts, Starter Pistols, Throwing Hammers, Track Hurdles, Vaulting Poles
    `,
  },
  { role: "assistant", content: "Incorrect" },
  {
    role: "user",
    content: `
    Product metadata::
    ${metaTags}

    Category: ${category}

    Examples of the Category: ${examples.join(", ")}
  `,
  },
];
exports.generateCategorizationAuditChatPrompt = generateCategorizationAuditChatPrompt;
const formatMessagesPrompt = (messages) => messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n");
const openAiSelectCategoryFromChoices = (choices, metaTags, { model = constants_1.DEFAULT_MODEL, temperature }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if ((0, constants_1.inList)(constants_1.CHAT_COMPLETION_MODELS, model)) {
      const messages = (0, exports.generateChatPrompt)(choices, metaTags);
      const response =
        (_a = yield (0, client_1.chatOpenai)(messages, { model, temperature })) !== null && _a !== void 0 ? _a : "";
      console.log("response", response);
      return {
        category: response.trim().split(" ").slice(1).join(" "),
        metadata: {
          prompt: formatMessagesPrompt(messages),
          response,
        },
      };
    }
    if ((0, constants_1.inList)(constants_1.FUNCTION_CALL_MODELS, model)) {
      const example = "Apparel & Accessories";
      const messages = (0, prompts_1.generateFunctionCallPrompt)(choices, metaTags, { example });
      const response =
        (_b = yield (0, client_1.chatOpenaiWithFunction)(messages, {
          model,
          temperature,
          functions: (0, prompts_1.generateFunctions)({ example }),
        })) !== null && _b !== void 0
          ? _b
          : "";
      console.log("response", response);
      const metadata = {
        prompt: formatMessagesPrompt(messages),
        response,
      };
      try {
        const json = JSON.parse(response);
        return {
          category: (_c = json.category) !== null && _c !== void 0 ? _c : "",
          metadata,
        };
      } catch (e) {
        return {
          category: "None",
          metadata,
        };
      }
    }
    throw new Error(`Select one of these models {${constants_1.CHAT_MODELS.join(", ")}}`);
  });
exports.openAiSelectCategoryFromChoices = openAiSelectCategoryFromChoices;
const openAiAssessStateOfDeadend = (
  subjectMetatags,
  { parent, children }, // state
  { model = constants_1.DEFAULT_MODEL, temperature } // model config
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    console.log("Asking OpenAI for help with deadend.");
    if ((0, constants_1.inList)(constants_1.INSTRUCTION_MODELS, model)) {
      return { state: exports.Correct, metadata: { prompt: "None", response: "None" } };
    }
    if ((0, constants_1.inList)(constants_1.CHAT_COMPLETION_MODELS, model)) {
      const messages = (0, exports.generateCategorizationAuditChatPrompt)(parent, children, subjectMetatags);
      const response =
        (_d = yield (0, client_1.chatOpenai)(messages, { model, temperature })) !== null && _d !== void 0 ? _d : "";
      console.log("response", response);
      const state = response.trim();
      const prompt = messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n");
      if (state.startsWith(exports.Correct)) {
        return {
          state: exports.Correct,
          metadata: {
            prompt,
            response,
          },
        };
      }
      return {
        state: exports.Incorrect,
        metadata: {
          prompt,
          response,
        },
      };
    }
    throw new Error(`Select one of these models {${constants_1.CHAT_MODELS.join(", ")}}`);
  });
exports.openAiAssessStateOfDeadend = openAiAssessStateOfDeadend;
