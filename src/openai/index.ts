import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
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
const INSTRUCTION_MODELS = [
  "text-davinci-003",
  "text-davinci-002",
  "text-curie-001",
  "text-babbage-001",
  "text-ada-001",
] as const;
type CompletionModel = (typeof INSTRUCTION_MODELS)[number];
const CHAT_AND_COMPlETION_MODELS = [...CHAT_COMPLETION_MODELS, ...INSTRUCTION_MODELS] as const;
type ChatOrCompletionModel = (typeof CHAT_AND_COMPlETION_MODELS)[number];
const chatOrCompletionModel = new Set(CHAT_AND_COMPlETION_MODELS);
function inList<T extends string>(list: Readonly<T[]>, s: string): s is T {
  return list.includes(s as T);
}

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

export const generateInstructivePrompt = (choices: string[], metaTags: string) => `
  Select a category from the follow string delimited list 
        
  ${choices.join(", ")}

  that best describes the website represented by these meta tags

  ${metaTags}

  Respond only with the selected category or an empty response if none are relevant.
  `;

export const generateChatPrompt = (choices: string[], metaTags: string): ChatCompletionRequestMessage[] => [
  {
    role: "system",
    content:
      "You are multiple-choice test taker; you may select one of the choices the best apply or with an empty response of none are relevant.",
  },
  {
    role: "user",
    content: `
    Question: Which product category best describes the metadata?

    metadata:
    <meta charset="utf-8">
    <meta http-equiv="x-dns-prefetch-control" content="on">
    <meta http-equiv="content-type" content="text/html; charset=iso-8859-1">
    <meta name="description" content="Buy Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee: Cooking Torches - Amazon.com ✓ FREE DELIVERY possible on eligible purchases">
    <meta name="title" content="Amazon.com: Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee : Home &amp; Kitchen">

    choices: 
      1) Bathroom Accessories
      2) Business & Home Security
      3) Decor, Emergency Preparedness
      4) Fireplace & Wood Stove Accessories
      5) Fireplaces, Flood, Fire & Gas Safety
      6) Household Appliance Accessories
      7) Household Appliances
      8) Household Supplies
      9) Kitchen & Dining
      10) Lawn & Garden, Lighting
      11) Lighting Accessories
      12) Linens & Bedding
      13) Parasols & Rain Umbrellas
      14) Plants, Pool & Spa
      15) Smoking Accessories
      16) Umbrella Sleeves & Cases
      17) Wood Stoves
  `,
  },
  { role: "assistant", content: "9) Kitchen & Dining" },
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

export const openAiSelectCategoryFromChoices = async (
  choices: string[],
  metaTags: string,
  { model = "text-davinci-003", temperature }: { model?: string; temperature?: number }
): Promise<{ category: string; metadata: { prompt: string; response: string } }> => {
  if (inList(INSTRUCTION_MODELS, model)) {
    const prompt = generateInstructivePrompt(choices, metaTags);
    const response = (await instructOpenai(prompt, { model, temperature })) ?? "";
    console.log("category", response);
    return {
      category: response.trim(),
      metadata: { prompt, response },
    };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateChatPrompt(choices, metaTags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    return {
      category: response.trim().split(" ").slice(1).join(" "),
      metadata: {
        prompt: messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n"),
        response,
      },
    };
  }

  throw new Error(`Select one of these models {${CHAT_AND_COMPlETION_MODELS.join(", ")}}`);
};
