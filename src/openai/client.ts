import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import {
  ChatCompletionModel,
  ChatOrCompletionModel,
  CompletionModel,
  DEFAULT_MODEL,
  DEFAULT_TEMP,
  FunctionCallModel,
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
  { model = "text-davinci-003", temperature = DEFAULT_TEMP }: { model?: CompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.createCompletion({
    model,
    prompt,
    temperature,
  });

  console.log("OpenAI instructOpenai Response", completion.data.choices);

  return completion.data.choices[0].text;
};

export const chatOpenai = async (
  messages: ChatCompletionRequestMessage[],
  { model = "gpt-3.5-turbo", temperature = DEFAULT_TEMP }: { model?: ChatCompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.createChatCompletion({
    model,
    messages,
    temperature,
  });

  console.log("OpenAI chatOpenai Response", completion.data.choices);

  return completion.data.choices[0].message?.content;
};

export const chatOpenaiWithFunction = async (
  messages: ChatCompletionRequestMessage[],
  {
    model = "gpt-3.5-turbo-0613",
    temperature = DEFAULT_TEMP,
    example = "Apparel & Accessories",
  }: { model?: FunctionCallModel; temperature?: number; example?: string } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion with Functions API with model: "${model}", temperature: ${temperature}`);
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
              description: `The product category e.g. ${example}`,
            },
          },
          required: ["category"],
        },
      },
    ],
  });

  console.log("OpenAI chatOpenaiWithFunction Response", completion.data.choices);

  const choice = completion.data.choices[0];

  // if (choice.finish_reason === "stop") {
  //   return `"category": ${choice.message?.content}`;
  // }

  return choice.message?.function_call?.arguments;
};

export const listSupportedModels = async (): Promise<string[]> => {
  const models = await openai.listModels();

  return models.data.data
    .map((model) => model.id)
    .filter((id) => chatOrCompletionModel.has(id as ChatOrCompletionModel));
};
