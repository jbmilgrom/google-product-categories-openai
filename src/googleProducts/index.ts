import { makeTextFileLineIterator } from "../utils/readTxtFile";
import { GOOGLE_PRODUCT_TYPES_URL } from "..";
import { Queue, Vertices, insert, makeQueue } from "../utils/tree";

export const getGoogleProductCategoriesTaxonomy = async (): Promise<Vertices<string>> => {
  let nodes: Vertices<string> = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    insert(nodes, getPath(line));
  }
  return nodes;
};

export async function* makeGoogleProductTypeTextLineIterator(): AsyncGenerator<string> {
  const response = await fetch(GOOGLE_PRODUCT_TYPES_URL);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Error fetching. Please try again");
  }

  let i = 0;
  for await (const line of makeTextFileLineIterator(reader)) {
    // skip the first line since its a title, not data
    if (i !== 0) {
      yield line;
    }
    i++;
  }
}

/**
 * Parse a text line e.g.
 *   "Animals & Pet Supplies > Pet Supplies > Bird Supplies > Bird Cage Accessories"
 *
 * Leveraging the ">" character to indicate level, and turn into a Queue<string> data structure.
 *
 * @param line
 * @returns
 */
export const getPath = (line: string, { delimitingChar = ">" }: { delimitingChar?: string } = {}): Queue<string> => {
  const list = line.split(delimitingChar).map((token) => token.trim());
  const queue = makeQueue<string>();
  list.forEach((token) => queue.enqueue(token));
  return queue;
};
