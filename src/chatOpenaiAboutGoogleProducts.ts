import { makeQueue, Vertices, Queue, traverse, toList } from "./utils/tree";
import { openAiSelectCategoryFromChoices } from "./openai";

type Chat = { prompt: string; response: string };

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
  { model, temperature }: { model?: string; temperature?: number } = {}
): Promise<
  | { type: "success"; categories: Queue<string>; transcript: Queue<Chat> }
  | { type: "error"; category: string; transcript: Queue<Chat> }
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

    const node = traverse(productTaxonomy, { path: categories.copy() });
    if (!node) {
      return { type: "error", category, transcript };
    }
    choices = node.children;
  }
  return { type: "success", categories, transcript };
};
