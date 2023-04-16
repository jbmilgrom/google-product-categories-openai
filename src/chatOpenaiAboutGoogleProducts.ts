import { makeQueue, Vertices, Queue, find, toList } from "./utils/tree";
import { openAiSelectCategoryFromChoices } from "./openai";

type Chat = { prompt: string; response: string };
type ChatMetadata = { transcript: Queue<Chat>; model: string; temperature: number };

/**
 * Converse with openai traversing the product taxonomy tree for the next multiple choice question
 *
 * @param productTaxonomy
 * @param webPageMetaData
 * @param openaiConfig
 * @returns
 */
export const chatOpenaiAboutGoogleProducts = async (
  productTaxonomy: Vertices<string>,
  webPageMetaData: string,
  { model = "text-davinci-003", temperature = 0.6 }: { model?: string; temperature?: number } = {}
): Promise<
  | { type: "success"; categories: Queue<string>; metadata: ChatMetadata }
  | { type: "error"; category: string; metadata: ChatMetadata }
> => {
  /**
   * 1. Get next choices (from node or default)
   * 2. Select token from multiple choices
   * 3. Find node from token, go to 1.
   */
  let choices: Vertices<string> = productTaxonomy;
  const categories = makeQueue<string>();
  const transcript = makeQueue<Chat>();
  while (choices.length) {
    const { category, prompt } = await openAiSelectCategoryFromChoices(toList(choices), webPageMetaData, {
      model,
      temperature,
    });
    categories.enqueue(category);
    transcript.enqueue({ prompt, response: category });

    const node = find(choices, { path: makeQueue([category]) });
    if (!node) {
      return { type: "error", category, metadata: { transcript, model, temperature } };
    }
    choices = node.children;
  }
  return { type: "success", categories, metadata: { transcript, model, temperature } };
};
