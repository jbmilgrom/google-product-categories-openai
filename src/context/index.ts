import { makeGoogleProductTypeTextLineIterator } from "../googleProducts";

const ingestDocument = async () => {
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
  }
};
