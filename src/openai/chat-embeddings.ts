import OpenAI from "openai";
import { CHAT_COMPLETION_MODELS, CHAT_MODELS, DEFAULT_MODEL, FUNCTION_CALL_MODELS, inList } from "./constants";
import { chatOpenai, chatOpenaiWithFunction } from "./client";
import { CategoryFunction, generateFunctionCallPrompt, generateFunctions } from "./prompts";

export const generateChatPrompt = (
  choices: string[],
  metaTags: string
): OpenAI.Chat.CreateChatCompletionRequestMessage[] => [
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

const EXAMPLE_FOR_FUNCTION_CALL = "Apparel & Accessories > Clothing > Shirts & Tops";

const formatMessagesPrompt = (messages: OpenAI.Chat.CreateChatCompletionRequestMessage[]): string =>
  messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n");

export const openAiSelectProductCategory = async (
  choices: string[],
  metaTags: string,
  { model = DEFAULT_MODEL, temperature }: { k?: number; model?: string; temperature?: number }
): Promise<{
  productCategories: string;
  metadata: { prompt: string; response: string; functions?: CategoryFunction };
}> => {
  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateChatPrompt(choices, metaTags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    return {
      productCategories: response.trim().split(" ").slice(1).join(" "),
      metadata: {
        prompt: formatMessagesPrompt(messages),
        response,
      },
    };
  }

  if (inList(FUNCTION_CALL_MODELS, model)) {
    const messages = generateFunctionCallPrompt(choices, metaTags, { example: EXAMPLE_FOR_FUNCTION_CALL });
    const functions = generateFunctions({ example: EXAMPLE_FOR_FUNCTION_CALL });
    const response = (await chatOpenaiWithFunction(messages, { model, temperature, functions })) ?? "";
    console.log("response", response);

    const metadata = {
      prompt: formatMessagesPrompt(messages),
      response,
      functions,
    } as const;

    try {
      const json = JSON.parse(response) as { category?: string };
      return {
        productCategories: json.category ?? "",
        metadata,
      };
    } catch (e) {
      return {
        productCategories: "None",
        metadata,
      };
    }
  }

  throw new Error(`Select one of these models {${CHAT_MODELS.join(", ")}}`);
};
