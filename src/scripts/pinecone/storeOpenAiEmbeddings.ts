import * as dotenv from "dotenv";
import { initializePineconeClient } from "../../pinecone";

dotenv.config();

/**
 * For model text-embedding-ada-002
 *
 * @see https://openai.com/blog/new-and-improved-embedding-model
 * */
const OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION = 1536;

const { OPEN_AI_ADA_002_INDEX_NAME } = process.env;

if (OPEN_AI_ADA_002_INDEX_NAME === undefined) {
  throw new Error("OPEN_AI_ADA_002_INDEX_NAME is undefined.");
}

(async () => {
  try {
    const pinecone = await initializePineconeClient();

    const indexes = await pinecone.listIndexes();

    if (!indexes.includes(OPEN_AI_ADA_002_INDEX_NAME)) {
      pinecone.createIndex({
        createRequest: { name: OPEN_AI_ADA_002_INDEX_NAME, dimension: OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION },
      });
    }

    console.log("Successfully populated OpenAI vector embeddings DB.");
  } catch (e) {
    console.log("Error populating OpenAI vector embeddings:", e);
  }
})();
