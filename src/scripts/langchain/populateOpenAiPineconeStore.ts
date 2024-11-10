import * as dotenv from "dotenv";
import { getOrCreatePineconeIndex, initializePineconeClient } from "../../pinecone";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { GOOGLE_PRODUCT_TYPES_URL, makeGoogleProductTypeTextLineIterator } from "../../googleProducts";
import { ADA_002_EMBEDDING_MODEL, OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION } from "../../openai";

dotenv.config();

const { PINECONE_INDEX_NAME_OPEN_AI_ADA_002 } = process.env;

if (PINECONE_INDEX_NAME_OPEN_AI_ADA_002 === undefined) {
  throw new Error("PINECONE_INDEX_NAME_OPEN_AI_ADA_002 is undefined.");
}

const openAiAda002Embedder = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: ADA_002_EMBEDDING_MODEL,
});

const loadGoogleProductCategories = async (): Promise<Document[]> => {
  const documents: Document[] = [];
  let lineNumber = 0;
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    documents.push(
      new Document({ pageContent: line, metadata: { source: GOOGLE_PRODUCT_TYPES_URL, id: lineNumber++ } })
    );
  }
  return documents;
};

(async () => {
  try {
    console.log("Loading documents.");

    const documents = await loadGoogleProductCategories();

    console.log("Initializing Pinecone.");

    const pineconeClient = await initializePineconeClient();

    const pineconeIndex = await getOrCreatePineconeIndex(pineconeClient, {
      name: PINECONE_INDEX_NAME_OPEN_AI_ADA_002,
      dimension: OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION,
    });

    console.log("Retrieving embeddings from OpenAI and populating Pinecone index.");

    await PineconeStore.fromDocuments(documents, openAiAda002Embedder, {
      pineconeIndex,
    });

    console.log("Successfully populated Pinecone with OpenAI vector embeddings.");
  } catch (e) {
    console.log("Error populating Pinecone with OpenAI vector embeddings:", e);
  }
})();
