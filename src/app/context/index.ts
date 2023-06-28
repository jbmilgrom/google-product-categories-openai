import { Document } from "langchain/document";
import { getVectorStore } from "../vectorStore";

export const similaritySearch = async (
  subject: string,
  { k = 10 }: { k?: number } = {}
): Promise<[Document, number][]> => {
  console.log("retrieving vector store");
  const store = await getVectorStore();
  console.log("executing similarity search");
  // return store.asRetriever(k).getRelevantDocuments(subject);
  return store.similaritySearchWithScore(subject, k);
};
