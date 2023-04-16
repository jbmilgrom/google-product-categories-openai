import { makeQueue, Vertices, Queue, find, toList, makeStack, Stack, purge } from "./utils/tree";
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
  {
    retries = 0,
    model = "text-davinci-003",
    temperature = 0.6,
  }: { retries?: number; model?: string; temperature?: number } = {}
): Promise<
  | { type: "success"; categories: Queue<string>; metadata: ChatMetadata }
  | { type: "error:chat"; category: string; metadata: ChatMetadata }
  | { type: "error:purge"; categories: Queue<string>; metadata: ChatMetadata }
> => {
  /**
   * (No choices left? We're done! We've found the product category heirarchy.)
   *  1. Get next choices (from found node's children or root product taxonomy)
   *  2. Select token from choices
   *  3. Find node from token, go to 1.
   *  4. Can't find node
   *  5. Retries > 0, go to 1 and try again w/o the failed path in the product taxonomy
   *  6. No retries left, we're done, and we haven't found the product category heirarchy
   */
  let choices: Vertices<string> = productTaxonomy;
  const categories = makeQueue<string>();
  const backtrackablePath = makeStack<string>();
  const transcript = makeQueue<Chat>();
  while (choices.length) {
    const {
      category,
      metadata: { prompt, response },
    } = await openAiSelectCategoryFromChoices(toList(choices), webPageMetaData, {
      model,
      temperature,
    });
    categories.enqueue(category);
    backtrackablePath.push(category);
    transcript.enqueue({ prompt, response });

    const node = find(choices, { path: makeQueue([category]) });

    if (node) {
      choices = node.children;
      continue;
    }

    console.log("Attempting a different path entirely");

    /**
     * No retries left and we haven't been able to find an appropriate product category.
     * This means that either the website is not really a product or that the openai model we chose failed to categorize
     * the metadata we scraped.
     */
    if (retries > 0) {
      return { type: "error:chat", category, metadata: { transcript, model, temperature } };
    }

    /**
     * last node not found and we have some retries left, so we pop it out and purge the product taxonomy of the whole
     * path and try again.
     * */
    backtrackablePath.pop();
    const ok = purge(productTaxonomy, { path: makeQueue(backtrackablePath.toList()) });

    /**
     * Something went wrong with the purge util above. This is likely a developer error.
     */
    if (!ok) {
      return { type: "error:purge", categories, metadata: { transcript, model, temperature } };
    }

    return chatOpenaiAboutGoogleProducts(productTaxonomy, webPageMetaData, {
      retries: retries - 1,
      model,
      temperature,
    });
  }
  return { type: "success", categories, metadata: { transcript, model, temperature } };
};
