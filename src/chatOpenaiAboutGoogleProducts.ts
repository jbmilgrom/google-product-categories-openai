import { makeQueue, Vertices, Queue, find, toList, makeStack, purge } from "./utils/tree";
import { GoOneLevelUp, openAiNextStepFollowingDeadend, openAiSelectCategoryFromChoices } from "./openai";

type Chat = { prompt: string; response: string };
type ChatMetadata = { transcript: Queue<Chat>; model: string; temperature: number };

type Result =
  | { type: "success"; categories: Queue<string>; metadata: ChatMetadata }
  | { type: "error:chat"; category: string; metadata: ChatMetadata }
  | { type: "error:purge"; categories: Queue<string>; metadata: ChatMetadata };

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
    model = "gpt-3.5-turbo",
    temperature = 0.6,
  }: { retries?: number; model?: string; temperature?: number } = {}
): Promise<Result> => {
  const transcript = makeQueue<Chat>();

  /**
   * (No choices left? We're done! We've found the product category heirarchy.)
   *  1. Get next choices (from found node's children or root product taxonomy)
   *  2. Select token from choices
   *  3. Find node from token, go to 1.
   *  4. Can't find node
   *  5. Retries > 0, go to 1 and try again w/o the failed path in the product taxonomy
   *  6. No retries left, we're done, and we haven't found the product category heirarchy
   */
  const orchestrate = async (retries: number): Promise<Result> => {
    let choices: Vertices<string> = productTaxonomy;
    const categories = makeQueue<string>();
    const backtrackablePath = makeStack<string>();
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

      /**
       * last node not found, so pop it out of our path.
       * */
      backtrackablePath.pop();

      const { nextStep, metadata } = await openAiNextStepFollowingDeadend(
        backtrackablePath.peak(),
        toList(choices),
        webPageMetaData,
        {
          model,
          temperature,
        }
      );
      transcript.enqueue({ prompt: metadata.prompt, response: metadata.response });

      if (nextStep === null) {
        return { type: "error:chat", category, metadata: { transcript, model, temperature } };
      }

      if (nextStep === GoOneLevelUp) {
        return {
          type: "success",
          categories: makeQueue(backtrackablePath.toList()),
          metadata: { transcript, model, temperature },
        };
      }

      /**
       * Everything below is for nextStep === StartOver
       */

      /**
       * No retries left and we haven't been able to find an appropriate product category.
       * This means that either the website is not really a product or that the openai model we chose failed to categorize
       * the metadata we scraped.
       */
      if (!retries) {
        return { type: "error:chat", category, metadata: { transcript, model, temperature } };
      }

      console.log("Attempting a different path entirely");

      const ok = purge(productTaxonomy, { path: makeQueue(backtrackablePath.toList()) });

      /**
       * Something went wrong with the purge util above. This is likely a developer error.
       */
      if (!ok) {
        return { type: "error:purge", categories, metadata: { transcript, model, temperature } };
      }

      return orchestrate(retries - 1);
    }
    return { type: "success", categories, metadata: { transcript, model, temperature } };
  };

  return orchestrate(retries);
};
