import { makeQueue, Queue, Vertices, find } from "./utils/tree";
import { openAiSelectProductCategory } from "./openai";
import { googleProductCategoriesSimilaritySearch } from "./app/langchain";
import { toPath } from "./googleProducts";
import { timeoutPromise } from "./utils/timeoutPromise";
import { DEFAULT_MODEL, DEFAULT_TEMP } from "./openai/constants";

type Chat = { prompt: string; response: string };
type TopCategory = { category: string; score: number };
type SimilaritySearch = { k: number; top: TopCategory[] };
type Metadata = { transcript: Queue<Chat>; model: string; temperature: number };

type ChatResult =
  | { type: "success"; categories: Queue<string>; metadata: Metadata }
  | { type: "error:NoCategoryFound"; categories: Queue<string>; metadata: Metadata };

export const similaritySearch = async (
  productTaxonomy: Vertices<string>,
  webPageMetaData: string,
  { k = 10 }: { k?: number }
) => {
  const similar = await googleProductCategoriesSimilaritySearch(webPageMetaData, { k });

  const topCategories = similar.map(([document, score]) => ({ category: document.pageContent, score }));

  // Note that the length of categoriesList is determined by k.
  if (topCategories.length > 1) {
    return {
      type: "many",
      metadata: { k, top: topCategories },
    } as const;
  }

  const categories = toPath(topCategories[0].category);

  const ok = find(productTaxonomy, { path: categories.copy() });

  if (!ok) {
    return {
      type: "error:NoCategoryFound",
      categories,
      metadata: { k, top: topCategories },
    } as const;
  }

  return {
    type: "success",
    categories,
    metadata: { k, top: topCategories },
  } as const;
};

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
  topCategories: TopCategory[],
  { model = DEFAULT_MODEL, temperature = DEFAULT_TEMP }: { model?: string; temperature?: number } = {}
): Promise<ChatResult> => {
  const transcript = makeQueue<Chat>();

  const {
    productCategories,
    metadata: { prompt, response },
  } = await timeoutPromise(
    openAiSelectProductCategory(
      topCategories.map(({ category }) => category),
      webPageMetaData,
      {
        model,
        temperature,
      }
    ),
    { errorMessage: "OpenAI chat timed out", milliseconds: 5000 /* 5 seconds */ }
  );

  transcript.enqueue({ prompt, response });

  const categories = toPath(productCategories);

  const ok = find(productTaxonomy, { path: categories.copy() });

  if (!ok) {
    return {
      type: "error:NoCategoryFound",
      categories,
      metadata: { transcript, model, temperature },
    } as const;
  }

  return {
    type: "success",
    categories,
    metadata: { transcript, model, temperature },
  } as const;
};
