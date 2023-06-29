import { ChatCompletionRequestMessage } from "openai";
import { CHAT_AND_COMPlETION_MODELS, CHAT_COMPLETION_MODELS, INSTRUCTION_MODELS, inList } from "./constants";
import { chatOpenai, instructOpenai } from "./client";

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
      'You are a multiple-choice test taker. You may select one of the choices that best apply. Respond with "None of the Above" if none are relevant.',
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

export const openAiAssessStateOfDeadend = async (
  subjectMetatags: string,
  { parent, children }: { parent: string; children: string[] }, // state
  { model = "gpt-3.5-turbo", temperature }: { model?: string; temperature?: number } // model config
): Promise<{ state: State; metadata: { prompt: string; response: string } }> => {
  console.log("Asking OpenAI for help with deadend.");
  if (inList(INSTRUCTION_MODELS, model)) {
    return { state: Correct, metadata: { prompt: "None", response: "None" } };
  }

  if (inList(CHAT_COMPLETION_MODELS, model)) {
    const messages = generateCategorizationAuditChatPrompt(parent, children, subjectMetatags);
    const response = (await chatOpenai(messages, { model, temperature })) ?? "";
    console.log("response", response);
    const state = response.trim();
    const prompt = messages.map(({ role, content }) => `${role}: ${content}`).join("\n\n");
    if (state.startsWith(Correct)) {
      return {
        state: Correct,
        metadata: {
          prompt,
          response,
        },
      };
    }
    return {
      state: Incorrect,
      metadata: {
        prompt,
        response,
      },
    };
  }

  throw new Error(`Select one of these models {${CHAT_AND_COMPlETION_MODELS.join(", ")}}`);
};
