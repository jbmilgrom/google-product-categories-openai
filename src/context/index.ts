import { Embeddings } from "langchain/dist/embeddings/base";
import { GOOGLE_PRODUCT_TYPES_URL, makeGoogleProductTypeTextLineIterator } from "../googleProducts";
import { Document } from "langchain/document";
import { Chroma } from "langchain/vectorstores/chroma";
import { VectorStore } from "langchain/dist/vectorstores/base";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

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

const loadLines = async (): Promise<string[]> => {
  const lines: string[] = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    lines.push(line);
  }
  return lines;
};

const getVectorStore = async (embedder: Embeddings, documents: Document[]): Promise<VectorStore> => {
  return Chroma.fromDocuments(documents, embedder, {
    collectionName: "Google Product Categories",
  });
};

export const similaritySearch = async (
  subject: string,
  { model = "text-embedding-ada-002", k = 10 }: { model?: string; k?: number } = {}
) => {
  const embedder = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY, modelName: model });
  const documents = await loadDocuments();
  const store = await getVectorStore(embedder, documents);
  return store.similaritySearch(subject, k);
};
