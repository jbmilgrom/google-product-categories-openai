import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * The "list all models" endpoint does not include information about type
 * so we have to do our own filtering/understanding using these hard-coded lists
 *
 * @see https://platform.openai.com/docs/models/model-endpoint-compatibility
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
  console.log(`Calling Completion API with model: "${model}", temperature: ${temperature}`);
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
  console.log(`Calling Chat Completion API with model: "${model}", temperature: ${temperature}`);
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

export const generateInstructivePrompt = (choices: string[], metaTags: string) => `
Select a category from the follow string delimited list 
      
${choices.join(", ")}

that best describes the website represented by these meta tags

${metaTags}

Respond only with the selected category or an empty response if none are relevant.
`;

export const generateCompletionPrompt = (choices: string[], metaTags: string) => `
Please select category that best describes the metadata or the word "none" if none of the categories are relevant.

metadata:
<meta charset="utf-8">
<meta http-equiv="x-dns-prefetch-control" content="on">
<meta http-equiv="content-type" content="text/html; charset=iso-8859-1">
<meta name="description" content="Buy Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee: Cooking Torches - Amazon.com ✓ FREE DELIVERY possible on eligible purchases">
<meta name="title" content="Amazon.com: Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee : Home &amp; Kitchen">

categories: Bathroom Accessories, Business & Home Security, Decor, Emergency Preparedness, Fireplace & Wood Stove Accessories, Fireplaces, Flood, Fire & Gas Safety, Household Appliance Accessories, Household Appliances, Household Supplies, Kitchen & Dining, Lawn & Garden, Lighting, Lighting Accessories, Linens & Bedding, Parasols & Rain Umbrellas, Plants, Pool & Spa, Smoking Accessories, Umbrella Sleeves & Cases, Wood Stoves

answer: Kitchen & Dining

metadata:
${metaTags}

categories: ${choices.join(", ")}

answer:`;

export const openAiSelectCategoryFromChoices = async (
  choices: string[],
  metaTags: string,
  { model = "text-davinci-003", temperature }: { model?: string; temperature?: number }
): Promise<{ category: string; prompt: string }> => {
  if (inList(COMPLETION_MODELS, model)) {
    const prompt = generateInstructivePrompt(choices, metaTags);
    const category = (await askOpenai(prompt, { model, temperature })) ?? "";
    console.log("category", category);
    return {
      category: category.trim(),
      prompt,
    };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const prompt = generateCompletionPrompt(choices, metaTags);
    const category = (await chatOpenai(prompt, { model })) ?? "";
    console.log("category", category);
    return {
      category: category.trim(),
      prompt,
    };
  }

  throw new Error(`Select one of these models ${CHAT_COMPLETION_MODELS.join(", ")}, ${COMPLETION_MODELS.join(", ")}`);
};
