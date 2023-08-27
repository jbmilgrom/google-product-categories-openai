import OpenAI from "openai";
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

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const instructOpenai = async (
  prompt: string,
  { model = "text-davinci-003", temperature = DEFAULT_TEMP }: { model?: CompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.completions.create({
    model,
    prompt,
    temperature,
  });

  console.log("OpenAI instructOpenai Response", completion.choices);

  return completion.choices[0].text;
};

export const chatOpenai = async (
  messages: OpenAI.Chat.CreateChatCompletionRequestMessage[],
  { model = "gpt-3.5-turbo", temperature = DEFAULT_TEMP }: { model?: ChatCompletionModel; temperature?: number } = {}
): Promise<string | null> => {
  console.log(`Calling Chat Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
  });

  console.log("OpenAI chatOpenai Response", completion.choices);

  return completion.choices[0].message?.content;
};

export const chatOpenaiWithFunction = async (
  messages: OpenAI.Chat.CreateChatCompletionRequestMessage[],
  {
    model = "gpt-3.5-turbo-0613",
    temperature = DEFAULT_TEMP,
    example = "Apparel & Accessories",
  }: { model?: FunctionCallModel; temperature?: number; example?: string } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion with Functions API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.chat.completions.create({
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

  console.log("OpenAI chatOpenaiWithFunction Response", completion.choices);

  const choice = completion.choices[0];

  // if (choice.finish_reason === "stop") {
  //   return `"category": ${choice.message?.content}`;
  // }

  return choice.message?.function_call?.arguments;
};

export const listSupportedModels = async (): Promise<string[]> => {
  const models = await openai.models.list();

  return models.data.map((model) => model.id).filter((id) => chatOrCompletionModel.has(id as ChatOrCompletionModel));
};
