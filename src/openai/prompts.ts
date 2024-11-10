import OpenAI from "openai";

export const generateFunctions = ({ example }: { example: string }) => [
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

export type CategoryFunction = ReturnType<typeof generateFunctions>;

export const generateFunctionCallPrompt = (
  choices: string[],
  metaTags: string,
  { example }: { example: string }
): OpenAI.Chat.ChatCompletionMessageParam[] => [
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
