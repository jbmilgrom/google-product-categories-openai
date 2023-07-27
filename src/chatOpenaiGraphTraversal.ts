import { makeQueue, Vertices, Queue, find, getValues, makeStack, purge } from "./utils/tree";
import { Correct, Incorrect, openAiAssessStateOfDeadend, openAiSelectCategoryFromChoices } from "./openai";
import { assertUnreachable } from "./utils/assertUnreachable";
import { DEFAULT_MODEL, DEFAULT_TEMP } from "./openai/constants";

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
export const chatOpenaiGraphTraversal = async (
  productTaxonomy: Vertices<string>,
  webPageMetaData: string,
  {
    retries = 0,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMP,
  }: { retries?: number; model?: string; temperature?: number } = {}
): Promise<Result> => {
  const transcript = makeQueue<Chat>();

  /**
   *  0. No choices left? We're done! We've found the product category heirarchy.
   *  1. Select token from choices (OpenAI)
   *  2. Find node from token,
   *  3. Get next choices (i.e. the found node's children), go to 0.
   *  4. Can't find node
   *  5. Determine whether the parent category is sufficient (OpenAI)
   *  6. If not and Retries > 0, go to 1 and try again w/o the failed path in the product taxonomy
   *  7. No retries left, we're done, and we haven't found the product category heirarchy
   */
  const orchestrate = async (retries: number): Promise<Result> => {
    let choices: Vertices<string> = productTaxonomy;
    const categories = makeQueue<string>();
    const backtrackablePath = makeStack<string>();
    while (choices.length) {
      const {
        category,
        metadata: { prompt, response },
      } = await openAiSelectCategoryFromChoices(getValues(choices), webPageMetaData, {
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

      const maybeRetryDifferentPath = () => {
        /**
         * No retries left and we haven't been able to find an appropriate product category.
         * This means that either the website is not really a product or that the openai model we chose failed to categorize
         * the metadata we scraped.
         */
        if (!retries) {
          return { type: "error:chat", category, metadata: { transcript, model, temperature } } as const;
        }

        console.log("Attempting a different path entirely");

        const ok = purge(productTaxonomy, { path: makeQueue(backtrackablePath.toList()) });

        /**
         * Something went wrong with the purge util above. This is likely a developer error.
         */
        if (!ok) {
          return { type: "error:purge", categories, metadata: { transcript, model, temperature } } as const;
        }

        return orchestrate(retries - 1);
      };

      /**
       * last node not found, so pop it out of our path.
       * */
      backtrackablePath.pop();

      if (backtrackablePath.isEmpty()) {
        return maybeRetryDifferentPath();
      }

      /**
       * Node may not have been found, but the parent category may nevertheless be on point, so query OpenAI to figure if so.
       * You might be wondering why we are querying OpenAI about the parent category when the parent category was necessarily
       * already selected by OpenAI one iteration ago? Well that is because we now have the parent's children
       * to further explicate the parent category in case it was ambiguous to begin with. OpenAI makes mistakes, and with these
       * examples in hand, we now have the ability to deterime if it did. We finish successfully with the broader parent category
       * as the leafiest node if the original determination was fine.
       *
       * e.g.
       *
       * For say, ... > Fruits & Vegetables (Parent) > [Apple, Banana, Carrot] (children),
       *
       *  and a website about
       *
       *  Apples: We never reach openAiAssessStateOfDeadend, b/c there is never a dead end
       *  Mangos: We would deadend, because Mango is neither an Apple, Banana or Carrot,
       *    and openAiAssessStateOfDeadend should return Correct b/c it is nevertheless a Fruit
       *  Lawn Furniture: We would deadend, and openAiAssessStateOfDeadend should return Incorrect
       *
       */
      const { state, metadata } = await openAiAssessStateOfDeadend(
        webPageMetaData,
        { parent: backtrackablePath.peak(), children: getValues(choices) },
        {
          model,
          temperature,
        }
      );
      transcript.enqueue({ prompt: metadata.prompt, response: metadata.response });

      switch (state) {
        case Correct:
          return {
            type: "success",
            categories: makeQueue(backtrackablePath.toList()),
            metadata: { transcript, model, temperature },
          };
        case Incorrect: {
          return maybeRetryDifferentPath();
        }
        default:
          return assertUnreachable(state);
      }
    }
    return { type: "success", categories, metadata: { transcript, model, temperature } };
  };

  return orchestrate(retries);
};
