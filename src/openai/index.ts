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

type Prompt = { type: "Chat"; messages: ChatCompletionRequestMessage[] } | { type: "Instruction"; prompt: string };

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

export const Incorrect = "Incorrect";
export const Correct = "Correct";
const States = [Incorrect, Correct] as const;
export type State = (typeof States)[number];

export const generateCategorizationAuditChatPrompt = (
  category: string,
  examples: string[],
  metaTags: string
): ChatCompletionRequestMessage[] => [
  {
    role: "system",
    content: `You determine whether products have been correctly categorized. I'll give you metadata describing the product and a possible category. I'll also give you examples of that category.
    
    Please answer with either "Correct" or "Incorrect".
      `,
  },
  {
    role: "user",
    content: `
      Product metadata:
      <meta name="description" content="Amazon.com: Produce Red Mango, 1 Each : Grocery &amp; Gourmet Food">
      <meta name="title" content="Amazon.com: Produce Red Mango, 1 Each : Grocery &amp; Gourmet Food">

      Category: Fresh & Frozen Fruits

      Examples of the Category: Apples, Avocados, Babacos, Bananas, Berries, Coconuts, Tamarindo        
    `,
  },
  { role: "assistant", content: "Correct" },
  {
    role: "user",
    content: `
      Product metadata:
      <meta name="description" content="Find the Nike Pegasus 40 Women's Road Running Shoes at Nike.com.  Free delivery and returns.">
      <meta property="og:title" content="Nike Pegasus 40 Women's Road Running Shoes. Nike.com">
      <meta property="og:description" content="Find the Nike Pegasus 40 Women's Road Running Shoes at Nike.com.  Free delivery and returns.">

      Category: Track & Field

      Examples of the Category: Discus, High Jump Crossbars, Javelins, Shot Puts, Starter Pistols, Throwing Hammers, Track Hurdles, Vaulting Poles
    `,
  },
  { role: "assistant", content: "Incorrect" },
  {
    role: "user",
    content: `
    Product metadata::
    ${metaTags}

    Category: ${category}

    Examples of the Category: ${examples.join(", ")}
  `,
  },
];

export const openAiSelectCategoryFromChoices = async (
  choices: string[],
  metaTags: string,
  { model = "gpt-3.5-turbo", temperature }: { model?: string; temperature?: number }
): Promise<{ category: string; metadata: { transcript: string; response: string; prompt: Prompt } }> => {
  if (inList(INSTRUCTION_MODELS, model)) {
    const prompt = generateInstructivePrompt(choices, metaTags);
    const response = (await instructOpenai(prompt, { model, temperature })) ?? "";
    console.log("category", response);
    return {
      category: response.trim(),
      metadata: { transcript: prompt, response, prompt: { type: "Instruction", prompt } },
    };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateChatPrompt(choices, metaTags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    return {
      category: response.trim().split(" ").slice(1).join(" "),
      metadata: {
        transcript: messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n"),
        response,
        prompt: { type: "Chat", messages },
      },
    };
  }

  throw new Error(`Select one of these models {${CHAT_AND_COMPlETION_MODELS.join(", ")}}`);
};

export const openAiAssessStateOfDeadend = async (
  subjectMetatags: string,
  { parent, children }: { parent: string; children: string[] }, // state
  { model = "gpt-3.5-turbo", temperature }: { model?: string; temperature?: number } // model config
): Promise<{ state: State; metadata: { transcript: string; response: string; prompt: Prompt } }> => {
  console.log("Asking OpenAI for help with deadend.");
  if (inList(INSTRUCTION_MODELS, model)) {
    return {
      state: Correct,
      metadata: { transcript: "None", response: "None", prompt: { type: "Instruction", prompt: "None" } },
    };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateCategorizationAuditChatPrompt(parent, children, subjectMetatags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    const metadata = {
      transcript: messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n"),
      response,
      prompt: { type: "Chat", messages },
    } as const;

    if (response.trim().startsWith(Correct)) {
      return {
        state: Correct,
        metadata,
      };
    }
    return {
      state: Incorrect,
      metadata,
    };
  }

  throw new Error(`Select one of these models {${CHAT_AND_COMPlETION_MODELS.join(", ")}}`);
};
