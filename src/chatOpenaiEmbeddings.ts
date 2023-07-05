import { makeQueue, Queue, Vertices, find, Vertex } from "./utils/tree";
import { openAiSelectProductCategory } from "./openai";
import { googleProductCategoriesSimilaritySearch } from "./app/langchain/pinecone";
import { toPath, toLine } from "./googleProducts";

type Chat = { prompt: string; response: string };
type SimilaritySearch = { k: number; top: Array<{ category: string; score: number }> };
type Metadata = { transcript: Queue<Chat>; model: string; temperature: number; similaritySearch: SimilaritySearch };

type Result =
  | { type: "success"; categories: Queue<string>; metadata: Metadata }
  | { type: "error:NoCategoryFound"; categories: Queue<string>; metadata: Metadata };

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

  const similar = await googleProductCategoriesSimilaritySearch(webPageMetaData, { k });

  const topCategories = similar.map(([document, score]) => ({ category: document.pageContent, score }));

  // Note that the length of categoriesList is determined by k.
  if (topCategories.length === 1) {
    const categories = toPath(topCategories[0].category);

    const ok = find(productTaxonomy, { path: categories.copy() });

    if (!ok) {
      return {
        type: "error:NoCategoryFound",
        categories,
        metadata: { transcript, model, temperature, similaritySearch: { k, top: topCategories } },
      } as const;
    }

    return {
      type: "success",
      categories,
      metadata: { transcript, model, temperature, similaritySearch: { k, top: topCategories } },
    } as const;
  }

  const {
    productCategories,
    metadata: { prompt, response },
  } = await openAiSelectProductCategory(
    topCategories.map(({ category }) => category),
    webPageMetaData,
    {
      model,
      temperature,
    }
  );

  transcript.enqueue({ prompt, response });

  const categories = toPath(productCategories);

  const ok = find(productTaxonomy, { path: categories.copy() });

  if (!ok) {
    return {
      type: "error:NoCategoryFound",
      categories,
      metadata: { transcript, model, temperature, similaritySearch: { k, top: topCategories } },
    } as const;
  }

  return {
    type: "success",
    categories,
    metadata: { transcript, model, temperature, similaritySearch: { k, top: topCategories } },
  } as const;
};
