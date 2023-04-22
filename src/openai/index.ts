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
export const CHAT_AND_COMPlETION_MODELS = [...CHAT_COMPLETION_MODELS, ...INSTRUCTION_MODELS] as const;
type ChatOrCompletionModel = (typeof CHAT_AND_COMPlETION_MODELS)[number];
const chatOrCompletionModel = new Set(CHAT_AND_COMPlETION_MODELS);
export function inList<T extends string>(list: Readonly<T[]>, s: string): s is T {
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
  Select a category from the following list 
        
  ${choices.join(", ")}

  that best describes the website represented by these meta tags

  ${metaTags}

  Respond only with the selected category or an empty response if none are relevant.
  `;

export const generateChatPrompt = (choices: string[], metaTags: string): ChatCompletionRequestMessage[] => [
  {
    role: "system",
    content:
      'You are a multiple-choice test taker. You may select one of the choices that best apply. Please respond with "None of the Above" if none are relevant.',
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

export const StartOver = "Start Over";
export const GoOneLevelUp = "Go One Level Up";
const NextSteps = [StartOver, GoOneLevelUp] as const;
export type FailerModeNextStep = (typeof NextSteps)[number];
function isValidNextStep(step: string): step is FailerModeNextStep {
  return Object.values(NextSteps).includes(step as FailerModeNextStep);
}

export const generateMetaPathTraversalChatPrompt = (
  parentCategory: string,
  choices: string[],
  metaTags: string
): ChatCompletionRequestMessage[] => [
  {
    role: "system",
    content: `You help a software program categorize products using html metadata. The program works by representing possible categories as a tree and descending each level of the tree to pick the best category that applies at that level. For example, a cooking torch can be categorized like \"Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils > Cooking Torches\".
    
    This program has two main cases where it struggles
      1) It goes down the wrong path. It can't go down any farther and the parent category now seems off. In this case, the program should probably start over and try again. Call this case "Start Over".
      2) It has gone down a decent path, but it can't go down any farther. The parent category makes sense, but the remaining choices are missing this particular product. Call this case "Go One Level Up". 
      `,
  },
  {
    role: "user",
    content: `
      Question: Should this program "Start Over" or "Go One Level Up"?

      Product Metadata:
      <meta charset="utf-8">
      <meta http-equiv="x-dns-prefetch-control" content="on">
      <meta http-equiv="content-type" content="text/html; charset=iso-8859-1">
      <meta name="description" content="Amazon.com: Produce Red Mango, 1 Each : Grocery &amp; Gourmet Food">
      <meta name="title" content="Amazon.com: Produce Red Mango, 1 Each : Grocery &amp; Gourmet Food">

      Parent Category: Fresh & Frozen Fruits

      Next Choices:
      1) Apples
      2) Atemoyas
      3) Avocados
      4) Babacos
      5) Bananas
      6) Berries
      7) Breadfruit
      8) Cactus Pears
      9) Cherimoyas
      10) Citrus Fruits
      11) Coconuts
      12) Dates
      13) Feijoas
      14) Figs
      15) Fruit Mixes
      16) Grapes
      17) Guavas
      18) Homely Fruits
      19) Kiwis
      20) Longan
      21) Loquats
      22) Lychees
      23) Madroño
      24) Mamey
      25) Mangosteens
      26) Melons
      27) Papayas
      28) Passion Fruit
      29) Pears
      30) Persimmons
      31) Physalis
      32) Pineapples
      33) Pitahayas
      34) Pomegranates
      35) Quince
      36) Rambutans
      37) Sapodillo
      38) Sapote
      39) Soursops
      40) Starfruits
      41) Stone Fruits
      42) Sugar Apples
      43) Tamarindo        
    `,
  },
  { role: "assistant", content: "Go One Level Up" },
  {
    role: "user",
    content: `
      Question: Should this program "Start Over" or "Go One Level Up"?

      Product Metadata:
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">
      <meta name="description" content="Find the Nike Pegasus 40 Women's Road Running Shoes at Nike.com.  Free delivery and returns.">
      <meta name="keywords" content="Nike Pegasus 40 Women's Road Running Shoes">
      <meta name="robots" content="index, follow">
      <meta property="og:title" content="Nike Pegasus 40 Women's Road Running Shoes. Nike.com">
      <meta property="og:description" content="Find the Nike Pegasus 40 Women's Road Running Shoes at Nike.com.  Free delivery and returns.">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://www.nike.com/t/pegasus-40-womens-road-running-shoes-bF2QL9/DV3854-102">
      <meta property="og:image" content="https://static.nike.com/a/images/t_default/3a487dc8-1548-4e91-8d00-0ebdfd7fe26a/pegasus-40-womens-road-running-shoes-bF2QL9.png">
      <meta property="og:locale" content="en_US">
      <meta property="og:site_name" content="Nike.com">
      <meta property="og:price:currency" content="USD">
      <meta property="og:price:amount" content="130">
      <meta name="branch:deeplink:$deeplink_path" content="x-callback-url/product-details?style-color=DV3854-102">
      <meta property="fb:app_id" content="1397260880304609">
      <meta name="next-head-count" content="20">

      Parent Category: Track & Field

      Next Choices: 
      1) Discus
      2) High Jump Crossbars
      3) High Jump Pits
      4) Javelins
      5) Pole Vault Pits
      6) Relay Batons
      7) Shot Puts
      8) Starter Pistols
      9) Throwing Hammers
      10) Track Hurdles
      11) Track Starting Blocks
      12) Vaulting Poles
    `,
  },
  { role: "assistant", content: "Start Over" },
  {
    role: "user",
    content: `
    Question: Should this program "Start Over" or "Go One Level Up"?

    Product Metadata:
    ${metaTags}

    Categories So Far: ${parentCategory}

    Next Choices: \n\t${choices.map((choice, i) => `${i + 1}) ${choice}`).join("\n\t")}
  `,
  },
];

export const openAiSelectCategoryFromChoices = async (
  choices: string[],
  metaTags: string,
  { model = "gpt-3.5-turbo", temperature }: { model?: string; temperature?: number }
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

export const openAiNextStepsFollowingDeadend = async (
  parentCategory: string,
  choices: string[],
  metaTags: string,
  { model = "gpt-3.5-turbo", temperature }: { model?: string; temperature?: number }
): Promise<{ nextStep: FailerModeNextStep | null; metadata: { prompt: string; response: string } }> => {
  console.log("Asking OpenAI for help with deadend.");
  if (inList(INSTRUCTION_MODELS, model)) {
    return { nextStep: GoOneLevelUp, metadata: { prompt: "None", response: "None" } };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateMetaPathTraversalChatPrompt(parentCategory, choices, metaTags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    const nextStep = response.trim();
    const prompt = messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n");
    if (!isValidNextStep(nextStep)) {
      return {
        nextStep: null,
        metadata: {
          prompt,
          response,
        },
      };
    }
    return {
      nextStep,
      metadata: {
        prompt,
        response,
      },
    };
  }

  throw new Error(`Select one of these models {${CHAT_AND_COMPlETION_MODELS.join(", ")}}`);
};
