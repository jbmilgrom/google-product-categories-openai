import { Configuration, OpenAIApi } from "openai";
import { Vertices } from "../utils/tree";

export const askOpenai = async (
  apiKey: string,
  prompt: string,
  { model = "text-davinci-003", temperature = 0.6 }: { model?: string; temperature?: number } = {}
) => {
  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);
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
  apiKey: string,
  choices: string[],
  metaTags: string
): Promise<{ category: string; prompt: string }> => {
  const prompt = generatePrompt(choices, metaTags);
  const category = (await askOpenai(apiKey, prompt)) ?? "";
  console.log("category", category);
  return {
    category: category.trim(),
    prompt,
  };
};
