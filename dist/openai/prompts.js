"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFunctionCallPrompt = exports.generateFunctions = void 0;
const generateFunctions = ({ example }) => [
  {
    name: "format_product_category",
    description: "Format a product category.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: `The product category e.g. ${example}`,
        },
      },
      required: ["category"],
    },
  },
];
exports.generateFunctions = generateFunctions;
const generateFunctionCallPrompt = (choices, metaTags, { example }) => [
  {
    role: "system",
    content: `Respond with the choice that best applies e.g. "${example}" or "None of the Above"`,
  },
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
exports.generateFunctionCallPrompt = generateFunctionCallPrompt;
