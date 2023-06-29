import * as dotenv from "dotenv";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ADA_002_EMBEDDING_MODEL } from "../../openai";

dotenv.config();

const { OPENAI_API_KEY } = process.env;

if (OPENAI_API_KEY === undefined) {
  throw new Error("OPENAI_API_KEY is undefined.");
}

export const openAiEmbedder = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
  modelName: ADA_002_EMBEDDING_MODEL,
});
