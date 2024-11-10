import OpenAI from "openai";
import {
  ChatCompletionModel,
  ChatModel,
  DEFAULT_MODEL,
  DEFAULT_TEMP,
  FunctionCallModel,
  ChatModels,
} from "./constants";
import * as dotenv from "dotenv";
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from "openai/resources/chat/completions";

dotenv.config();

const { OPENAI_API_KEY } = process.env;

if (OPENAI_API_KEY === undefined) {
  throw new Error("OPENAI_API_KEY is undefined.");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const chatOpenai = async (
  messages: ChatCompletionMessageParam[],
  { model = DEFAULT_MODEL, temperature = DEFAULT_TEMP }: { model?: ChatCompletionModel; temperature?: number } = {}
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
  messages: ChatCompletionMessageParam[],
  {
    model = "gpt-3.5-turbo-0613",
    temperature = DEFAULT_TEMP,
    functions = [],
  }: {
    model?: FunctionCallModel;
    temperature?: number;
    functions?: Array<ChatCompletionCreateParams.Function>;
  } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion with Functions API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.chat.completions.create({
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

  return choice.message?.function_call?.arguments;
};

export const listSupportedModels = async (): Promise<string[]> => {
  const models = await openai.models.list();

  return models.data.map((model) => model.id).filter((id) => ChatModels.has(id as ChatModel));
};
