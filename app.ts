import express from "express";
import { makeTextFileLineIterator } from "./readTxtFile";
import { makeQueue, insert, Vertices, maxDepth, Queue, maxDegree } from "./tree";

const app = express();
const port = 3003;

const GOOGLE_PRODUCT_TYPES_URL = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt";

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

app.get("/text", async (req, res) => {
  console.log(`fetching google product type...`);
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    res.write(`${line}\n`);
  }

  res.end();
});

app.get("/internal-representation.json", async (req, res) => {
  console.log(`fetching google product type...`);
  let nodes: Vertices<string> = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    insert(nodes, getPath(line));
  }
  res.send(nodes);
});

app.get("/max-depth", async (req, res) => {
  console.log("calculating max depth...");
  let max = 0;
  let nodes: Vertices<string> = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    insert(nodes, getPath(line));
  }

  res.write(`Max depth: ${maxDepth(nodes)}\n`);

  res.end();
});

app.get("/max-degree", async (req, res) => {
  console.log("calculating max degree...");
  let nodes: Vertices<string> = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    insert(nodes, getPath(line));
  }

  const [token, max] = maxDegree(nodes);

  res.write(`Max degree: ${max}\n`);
  res.write(`Token: "${token}"\n`);

  res.end();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

async function* makeGoogleProductTypeTextLineIterator(): AsyncGenerator<string> {
  const response = await fetch(GOOGLE_PRODUCT_TYPES_URL);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Error fetching. Please try again");
  }

  let i = 0;
  for await (const line of makeTextFileLineIterator(reader)) {
    if (i !== 0) {
      // skip the first line since its a title, not data
      yield line;
    }
    i++;
  }
}

const getPath = (line: string): Queue<string> => {
  const list = line.split(">").map((token) => token.trim());
  const queue = makeQueue<string>();
  list.forEach((token) => queue.enqueue(token));
  return queue;
};
