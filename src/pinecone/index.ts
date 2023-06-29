import { PineconeClient } from "@pinecone-database/pinecone";
import { VectorOperationsApi } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const { PINECONE_ENVIRONMENT, PINECONE_API_KEY } = process.env;

if (PINECONE_ENVIRONMENT === undefined) {
  throw new Error("PINECONE_ENVIRONMENT is undefined.");
}
if (PINECONE_API_KEY === undefined) {
  throw new Error("Pinecone API_KEY is undefined.");
}

export const initializePineconeClient = async (): Promise<PineconeClient> => {
  const pinecone = new PineconeClient();

  await pinecone.init({
    environment: PINECONE_ENVIRONMENT,
    apiKey: PINECONE_API_KEY,
  });

  return pinecone;
};

export const getOrCreatePineconeIndex = async (
  pinecone: PineconeClient,
  { name, dimension }: { name: string; dimension: number }
): Promise<VectorOperationsApi> => {
  const indexes = await pinecone.listIndexes();

  if (!indexes.includes(name)) {
    pinecone.createIndex({
      createRequest: { name, dimension },
    });
  }

  return pinecone.Index(name);
};
