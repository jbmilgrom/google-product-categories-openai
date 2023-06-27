import { Embeddings } from "langchain/dist/embeddings/base";
import { Document } from "langchain/document";
import { VectorStore } from "langchain/dist/vectorstores/base";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GOOGLE_PRODUCT_TYPES_URL, makeGoogleProductTypeTextLineIterator } from "../googleProducts";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

const fromDocuments = async (embedder: Embeddings, documents: Document[]): Promise<VectorStore> => {
  return MemoryVectorStore.fromDocuments(documents, embedder);
};

const loadDocuments = async (): Promise<Document[]> => {
  const documents: Document[] = [];
  let lineNumber = 0;
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    documents.push(
      new Document({ pageContent: line, metadata: { source: GOOGLE_PRODUCT_TYPES_URL, id: lineNumber++ } })
    );
  }
  return documents;
};

/**
 * Not awaiting to so non-blocking
 */
const documentsPromise = loadDocuments();
const embedder = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-ada-002",
});

// don't want to block the running of this file
const storePromise: Promise<VectorStore> = new Promise(async (resolve, reject) => {
  try {
    console.log("loading documents");
    const documents = await documentsPromise;
    console.log("creating vector store");
    const vectorStore = await fromDocuments(embedder, documents);
    resolve(vectorStore);
  } catch (e) {
    reject(e);
  }
});

export const getDocuments = (): Promise<Document[]> => {
  return documentsPromise;
};

export const getVectorStore = (): Promise<VectorStore> => {
  return storePromise;
};
