import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { ChatCompletionModel, ChatOrCompletionModel, CompletionModel, chatOrCompletionModel } from "./constants";
import * as dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
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
  { model = "gpt-3.5-turbo", temperature = 0.6 }: { model?: ChatCompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion API with model: "${model}", temperature: ${temperature}`);
  const completion = await openai.createChatCompletion({
    model,
    messages,
    temperature,
  });

  return completion.data.choices[0].message?.content;
};

export const listSupportedModels = async (): Promise<string[]> => {
  const models = await openai.listModels();

  return models.data.data
    .map((model) => model.id)
    .filter((id) => chatOrCompletionModel.has(id as ChatOrCompletionModel));
};
