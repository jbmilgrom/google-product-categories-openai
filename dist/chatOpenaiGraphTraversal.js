"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatOpenaiGraphTraversal = void 0;
const tree_1 = require("./utils/tree");
const openai_1 = require("./openai");
const assertUnreachable_1 = require("./utils/assertUnreachable");
const constants_1 = require("./openai/constants");
/**
 * Converse with openai traversing the product taxonomy tree for the next multiple choice question
 *
 * @param productTaxonomy
 * @param webPageMetaData
 * @param openaiConfig
 * @returns
 */
const chatOpenaiGraphTraversal = (
  productTaxonomy,
  webPageMetaData,
  { retries = 0, model = constants_1.DEFAULT_MODEL, temperature = constants_1.DEFAULT_TEMP } = {}
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const transcript = (0, tree_1.makeQueue)();
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
    const orchestrate = (retries) =>
      __awaiter(void 0, void 0, void 0, function* () {
        let choices = productTaxonomy;
        const categories = (0, tree_1.makeQueue)();
        const backtrackablePath = (0, tree_1.makeStack)();
        while (choices.length) {
          const {
            category,
            metadata: { prompt, response },
          } = yield (0, openai_1.openAiSelectCategoryFromChoices)((0, tree_1.getValues)(choices), webPageMetaData, {
            model,
            temperature,
          });
          categories.enqueue(category);
          backtrackablePath.push(category);
          transcript.enqueue({ prompt, response });
          const node = (0, tree_1.find)(choices, { path: (0, tree_1.makeQueue)([category]) });
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
              return { type: "error:chat", category, metadata: { transcript, model, temperature } };
            }
            console.log("Attempting a different path entirely");
            const ok = (0, tree_1.purge)(productTaxonomy, { path: (0, tree_1.makeQueue)(backtrackablePath.toList()) });
            /**
             * Something went wrong with the purge util above. This is likely a developer error.
             */
            if (!ok) {
              return { type: "error:purge", categories, metadata: { transcript, model, temperature } };
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
          const { state, metadata } = yield (0, openai_1.openAiAssessStateOfDeadend)(
            webPageMetaData,
            { parent: backtrackablePath.peak(), children: (0, tree_1.getValues)(choices) },
            {
              model,
              temperature,
            }
          );
          transcript.enqueue({ prompt: metadata.prompt, response: metadata.response });
          switch (state) {
            case openai_1.Correct:
              return {
                type: "success",
                categories: (0, tree_1.makeQueue)(backtrackablePath.toList()),
                metadata: { transcript, model, temperature },
              };
            case openai_1.Incorrect: {
              return maybeRetryDifferentPath();
            }
            default:
              return (0, assertUnreachable_1.assertUnreachable)(state);
          }
        }
        return { type: "success", categories, metadata: { transcript, model, temperature } };
      });
    return orchestrate(retries);
  });
exports.chatOpenaiGraphTraversal = chatOpenaiGraphTraversal;
