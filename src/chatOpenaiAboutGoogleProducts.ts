import { makeQueue, Vertices, Queue, traverse, toList } from "./utils/tree";
import { selectFromMultipleChoices } from "./openai";

type Transcript = { prompt: string; response: string };

/**
 * Converse with openai traversing the product taxonomy tree for the next multiple choice question
 *
 * @param openaiApiKey
 * @param productTaxonomy
 * @param webPageMetaData
 * @returns
 */
export const chatOpenaiAboutGoogleProducts = async (
  openaiApiKey: string,
  productTaxonomy: Vertices<string>,
  webPageMetaData: string
): Promise<
  | { type: "success"; categories: Queue<string>; transcript: Queue<Transcript> }
  | { type: "error"; category: string; transcript: Queue<Transcript> }
> => {
  /**
   * 1. Get next choices (from node or default)
   * 2. Select token from multiple choices
   * 3. Find node from token, go to 1.
   */
  let choices: Vertices<string> = productTaxonomy;
  const categories = makeQueue<string>();
  const transcript = makeQueue<Transcript>();
  while (choices.length) {
    const { category, prompt } = await selectFromMultipleChoices(toList(choices), webPageMetaData);
    categories.enqueue(category);
    transcript.enqueue({ prompt, response: category });

    const node = traverse(productTaxonomy, categories.copy());
    if (!node) {
      return { type: "error", category, transcript };
    }
    choices = node.children;
  }
  return { type: "success", categories, transcript };
};
