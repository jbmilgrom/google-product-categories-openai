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
  retries: number = 0,
  { model = "text-davinci-003", temperature = 0.6 }: { model?: string; temperature?: number } = {}
): Promise<
  | { type: "success"; categories: Queue<string>; metadata: ChatMetadata }
  | { type: "error:chat"; category: string; metadata: ChatMetadata }
  | { type: "error:purge"; category: string; metadata: ChatMetadata & { backtrackablePath: Stack<string> } }
> => {
  /**
   * 1. Get next choices (from node or default)
   * 2. Select token from multiple choices
   * 3. Find node from token, go to 1.
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

    if (!retries) {
      return { type: "error:chat", category, metadata: { transcript, model, temperature } };
    }

    backtrackablePath.pop();
    const ok = purge(productTaxonomy, { path: makeQueue(backtrackablePath.toList()) });

    if (!ok) {
      return { type: "error:purge", category, metadata: { transcript, model, temperature, backtrackablePath } };
    }

    return chatOpenaiAboutGoogleProducts(productTaxonomy, webPageMetaData, retries - 1, { model, temperature });
  }
  return { type: "success", categories, metadata: { transcript, model, temperature } };
};
