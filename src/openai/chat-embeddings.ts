import { ChatCompletionRequestMessage } from "openai";
import {
  CHAT_AND_COMPlETION_MODELS,
  CHAT_COMPLETION_MODELS,
  DEFAULT_MODEL,
  INSTRUCTION_MODELS,
  inList,
} from "./constants";
import { chatOpenai, instructOpenai } from "./client";

export const generateChatPrompt = (choices: string[], metaTags: string): ChatCompletionRequestMessage[] => [
  {
    role: "system",
    content:
      'Respond with the choice that best applies e.g. "Apparel & Accessories > Clothing > Shirts & Tops" or "None of the Above"',
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

export const generateInstructivePrompt = (choices: string[], metaTags: string) => `
  Select a category from the following list 
          
  ${choices.join(", ")}

  that best describes the website represented by these meta tags

  ${metaTags}

  Respond only with the selected category or an empty response if none are relevant.
  `;

export const openAiSelectProductCategory = async (
  choices: string[],
  metaTags: string,
  { model = DEFAULT_MODEL, temperature }: { k?: number; model?: string; temperature?: number }
): Promise<{ productCategories: string; metadata: { prompt: string; response: string } }> => {
  if (inList(INSTRUCTION_MODELS, model)) {
    const prompt = generateInstructivePrompt(choices, metaTags);
    const response = (await instructOpenai(prompt, { model, temperature })) ?? "";
    console.log("category", response);
    return {
      productCategories: response.trim(),
      metadata: { prompt, response },
    };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateChatPrompt(choices, metaTags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    try {
      const json = JSON.parse(response) as { category?: string };
      return {
        productCategories: json.category ?? "",
        metadata: {
          prompt: messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n"),
          response,
        },
      };
    } catch (e) {
      return {
        productCategories: "None",
        metadata: {
          prompt: messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n"),
          response,
        },
      };
    }
  }

  throw new Error(`Select one of these models {${CHAT_AND_COMPlETION_MODELS.join(", ")}}`);
};
