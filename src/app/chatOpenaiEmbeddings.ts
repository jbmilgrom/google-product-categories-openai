import { makeQueue, Queue, Vertices, find, Vertex } from "../utils/tree";
import { openAiSelectProductCategory } from "../openai";
import { googleProductCategoriesSimilaritySearch } from "./langchain/pinecone";
import { toPath, toLine } from "../googleProducts";

type Chat = { prompt: string; response: string };
type ChatMetadata = { transcript: Queue<Chat>; model: string; temperature: number };

type Result =
  | { type: "success"; categories: Queue<string>; metadata: ChatMetadata }
  | { type: "error:chat"; categories: Queue<string>; metadata: ChatMetadata };

/**
 * Converse with openai traversing the product taxonomy tree for the next multiple choice question
 *
 * @param productTaxonomy
 * @param webPageMetaData
 * @param openaiConfig
 * @returns
 */
export const chatOpenaiEmbeddings = async (
  productTaxonomy: Vertices<string>,
  webPageMetaData: string,
  { k = 10, model = "gpt-3.5-turbo", temperature = 0.6 }: { k?: number; model?: string; temperature?: number } = {}
): Promise<Result> => {
  const transcript = makeQueue<Chat>();

  const similarCategories = await googleProductCategoriesSimilaritySearch(webPageMetaData, { k });

  const topCategories = similarCategories.map((document) => document[0].pageContent);

  // Note that the length of categoriesList is determined by k.
  if (topCategories.length === 1) {
    const categories = toPath(topCategories[0]);

    const ok = find(productTaxonomy, { path: categories.copy() });

    if (!ok) {
      return { type: "error:chat", categories, metadata: { transcript, model, temperature } } as const;
    }

    return {
      type: "success",
      categories,
      metadata: { transcript, model, temperature },
    } as const;
  }

  const {
    productCategories,
    metadata: { prompt, response },
  } = await openAiSelectProductCategory(topCategories, webPageMetaData, {
    model,
    temperature,
  });

  transcript.enqueue({ prompt, response });

  const categories = toPath(productCategories);

  const ok = find(productTaxonomy, { path: categories.copy() });

  if (!ok) {
    return { type: "error:chat", categories, metadata: { transcript, model, temperature } } as const;
  }

  return {
    type: "success",
    categories,
    metadata: { transcript, model, temperature },
  } as const;
};
