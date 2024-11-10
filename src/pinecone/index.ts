import { Index, Pinecone } from "@pinecone-database/pinecone";
import * as dotenv from "dotenv";

dotenv.config();

const { PINECONE_API_KEY } = process.env;

if (PINECONE_API_KEY === undefined) {
  throw new Error("Pinecone API_KEY is undefined.");
}

export const initializePineconeClient = async (): Promise<Pinecone> => {
  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });

  return pinecone;
};

export const getOrCreatePineconeIndex = async (
  pinecone: Pinecone,
  { name, dimension }: { name: string; dimension: number }
): Promise<Index> => {
  const indexes = await pinecone.listIndexes();

  if (!indexes.indexes?.some((index) => index.name === name)) {
    await pinecone.createIndex({
      name,
      dimension,
      spec: {
        serverless: {
          cloud: "aws",
          // free plan supports this region
          region: "us-east-1",
        },
      },
    });
  }

  return pinecone.Index(name);
};
