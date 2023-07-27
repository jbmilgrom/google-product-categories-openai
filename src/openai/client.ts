import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import {
  ChatCompletionModel,
  ChatOrCompletionModel,
  CompletionModel,
  DEFAULT_MODEL,
  DEFAULT_TEMP,
  chatOrCompletionModel,
} from "./constants";
import * as dotenv from "dotenv";

dotenv.config();

const { OPENAI_API_KEY } = process.env;

if (OPENAI_API_KEY === undefined) {
  throw new Error("OPENAI_API_KEY is undefined.");
}

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const instructOpenai = async (
  prompt: string,
  { model = "text-davinci-003", temperature = 0.6 }: { model?: CompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.createCompletion({
    model,
    prompt,
    temperature,
  });

  return completion.data.choices[0].text;
};

export const chatOpenai = async (
  messages: ChatCompletionRequestMessage[],
  { model = DEFAULT_MODEL, temperature = DEFAULT_TEMP }: { model?: ChatCompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.createChatCompletion({
    model,
    messages,
    temperature,
    functions: [
      {
        name: "format_product_category",
        description: "Format a product category.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "The product category e.g. Apparel & Accessories > Clothing > Shirts & Tops",
            },
          },
          required: ["category"],
        },
      },
    ],
  });

  console.log("what is happening", completion.data.choices);
  return completion.data.choices[0].message?.function_call?.arguments;
};

export const listSupportedModels = async (): Promise<string[]> => {
  const models = await openai.listModels();

  return models.data.data
    .map((model) => model.id)
    .filter((id) => chatOrCompletionModel.has(id as ChatOrCompletionModel));
};
