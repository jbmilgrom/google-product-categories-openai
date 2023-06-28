import { PineconeClient } from "@pinecone-database/pinecone";
import * as dotenv from "dotenv";

dotenv.config();

const { ENVIRONMENT, API_KEY } = process.env;

if (ENVIRONMENT === undefined) {
  throw new Error("Pinecone ENVIRONMENT is undefined.");
}
if (API_KEY === undefined) {
  throw new Error("Pinecone API_KEY is undefined.");
}

export const initializePineconeClient = async (): Promise<PineconeClient> => {
  const pinecone = new PineconeClient();

  await pinecone.init({
    environment: ENVIRONMENT,
    apiKey: API_KEY,
  });

  return pinecone;
};
