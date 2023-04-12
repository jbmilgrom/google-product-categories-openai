import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const askOpenai = async (
  prompt: string,
  { model = "text-davinci-003", temperature = 0.6 }: { model?: string; temperature?: number } = {}
) => {
  const completion = await openai.createCompletion({
    model,
    prompt,
    temperature,
  });

  return completion.data.choices[0].text;
};

export const generatePrompt = (choices: string[], metaTags: string) => `
    Select a category from the follow string delimited list 
      
        ${choices.join(", ")}
    
    that best describes the website represented by these meta tags

    ${metaTags}

    Respond only with the selected category or an empty response if none are relevant.
`;

export const selectFromMultipleChoices = async (
  choices: string[],
  metaTags: string
): Promise<{ category: string; prompt: string }> => {
  const prompt = generatePrompt(choices, metaTags);
  const category = (await askOpenai(prompt)) ?? "";
  console.log("category", category);
  return {
    category: category.trim(),
    prompt,
  };
};
