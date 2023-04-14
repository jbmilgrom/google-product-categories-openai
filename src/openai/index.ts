import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";

dotenv.config();

/**
 *
 */
const CHAT_COMPLETION_MODELS = [
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0301",
] as const;
type ChatCompletionModel = (typeof CHAT_COMPLETION_MODELS)[number];

const COMPLETION_MODELS = [
  "text-davinci-003",
  "text-davinci-002",
  "text-curie-001",
  "text-babbage-001",
  "text-ada-001",
] as const;
type CompletionModel = (typeof COMPLETION_MODELS)[number];

function inList<T extends string>(list: Readonly<T[]>, s: string): s is T {
  return list.includes(s as T);
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const askOpenai = async (
  prompt: string,
  { model = "text-davinci-003", temperature = 0.6 }: { model?: CompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Completion API with model: "${model}"`);
  const completion = await openai.createCompletion({
    model,
    prompt,
    temperature,
  });

  return completion.data.choices[0].text;
};

export const chatOpenai = async (
  content: string,
  { model = "gpt-3.5-turbo", temperature = 0.6 }: { model?: ChatCompletionModel; temperature?: number } = {}
): Promise<string | undefined> => {
  console.log(`Calling Chat Completion API with model: "${model}"`);
  const completion = await openai.createChatCompletion({
    model,
    messages: [{ role: "user", content }],
    temperature,
  });

  return completion.data.choices[0].message?.content;
};

export const listModels = async () => {
  const models = await openai.listModels();

  return models.data.data.map((model) => model.id);
};

export const generatePrompt = (choices: string[], metaTags: string) => `
    Select a category from the follow string delimited list 
      
        ${choices.join(", ")}
    
    that best describes the website represented by these meta tags

    ${metaTags}

    Respond only with the selected category or an empty response if none are relevant.
`;

export const openAiSelectCategoryFromChoices = async (
  choices: string[],
  metaTags: string,
  { model = "text-davinci-003", temperature }: { model?: string; temperature?: number }
): Promise<{ category: string; prompt: string }> => {
  const prompt = generatePrompt(choices, metaTags);

  if (inList(COMPLETION_MODELS, model)) {
    const category = (await askOpenai(prompt, { model, temperature })) ?? "";
    console.log("category", category);
    return {
      category: category.trim(),
      prompt,
    };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const category = (await chatOpenai(prompt, { model, temperature })) ?? "";
    console.log("category", category);
    return {
      category: category.trim(),
      prompt,
    };
  }

  throw new Error(`Select one of these models ${CHAT_COMPLETION_MODELS.join(", ")}, ${COMPLETION_MODELS.join(", ")}`);
};
