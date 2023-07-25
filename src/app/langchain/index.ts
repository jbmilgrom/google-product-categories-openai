import * as dotenv from "dotenv";
import { getOrCreatePineconeIndex, initializePineconeClient } from "../../pinecone";
import { OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION } from "../../openai";
import { VectorOperationsApi } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch";
import { Embeddings } from "langchain/dist/embeddings/base";
import { Document } from "langchain/document";
import { VectorStore } from "langchain/dist/vectorstores/base";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ADA_002_EMBEDDING_MODEL } from "../../openai";

dotenv.config();

const { PINECONE_INDEX_NAME_OPEN_AI_ADA_002, OPENAI_API_KEY } = process.env;

if (PINECONE_INDEX_NAME_OPEN_AI_ADA_002 === undefined) {
  throw new Error("PINECONE_INDEX_NAME_OPEN_AI_ADA_002 is undefined.");
}
if (OPENAI_API_KEY === undefined) {
  throw new Error("OPENAI_API_KEY is undefined.");
}

const openAiEmbedder = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
  modelName: ADA_002_EMBEDDING_MODEL,
});

const getPineconeGoogleProductCategoriesIndex = async (): Promise<VectorOperationsApi> => {
  const pineconeClient = await initializePineconeClient();

  const pineconeIndex = await getOrCreatePineconeIndex(pineconeClient, {
    name: PINECONE_INDEX_NAME_OPEN_AI_ADA_002,
    dimension: OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION,
  });

  return pineconeIndex;
};

/**
 * Pinecone index
 *
 * @param embedder Service for embedding each document in semantic dimensional space
 * @param documents
 * @returns
 */
const fromExistingIndex = async (
  embedder: Embeddings,
  { pineconeIndex, namespace }: { pineconeIndex: VectorOperationsApi; namespace?: string }
): Promise<VectorStore> => {
  return PineconeStore.fromExistingIndex(embedder, { pineconeIndex, namespace });
};

export const googleProductCategoriesSimilaritySearch = async (
  subject: string,
  { k = 10 }: { k?: number } = {}
): Promise<[Document, number][]> => {
  console.log("Retrieveing pinecone index.");
  const pineconeIndex = await getPineconeGoogleProductCategoriesIndex();
  console.log("Configuring Langchain VectorStore");
  const store = await fromExistingIndex(openAiEmbedder, { pineconeIndex });
  console.log("Performing similarity search.");
  return store.similaritySearchWithScore(subject, k);
};
