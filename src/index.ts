import express from "express";
import { makeTextFileLineIterator } from "./readTxtFile";
import { makeQueue, insert, Vertices, maxDepth, Queue, maxDegree } from "./tree";
import { parse } from "node-html-parser";
import { getMetaTags, escapeHtml } from "./getMetaTags";

const app = express();

/**
 * These configurations are needed to be receive form data in POST methods
 *
 * @see https://stackoverflow.com/a/12008719/3645851
 * @see https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3003;

const GOOGLE_PRODUCT_TYPES_URL = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt";

const ROUTES = {
  TEXT: "/text",
  INTERNAL_REPRESENTATION: "/internal-representation.json",
  MAX_DEPTH: "/max-depth",
  MAX_DEGREE: "/max-degree",
  URL: "/url",
} as const;

type RouteKeys = Array<keyof typeof ROUTES>;

app.get("/", async (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(
    Buffer.from(`
    <h1>Explore Google Product Types</h1>
    <ul>
      ${(Object.keys(ROUTES) as RouteKeys).map((k) => `<li><a href=${ROUTES[k]}>${ROUTES[k]}</a></li>`).join("")}
    </ul>
  `)
  );
});

app.get(ROUTES.TEXT, async (req, res) => {
  console.log(`fetching google product type...`);
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    res.write(`${line}\n`);
  }
  res.end();
});

app.get(ROUTES.INTERNAL_REPRESENTATION, async (req, res) => {
  console.log(`fetching google product type...`);
  let nodes: Vertices<string> = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    insert(nodes, getPath(line));
  }
  res.send(nodes);
});

app.get(ROUTES.MAX_DEPTH, async (req, res) => {
  console.log("calculating max depth...");
  let max = 0;
  let nodes: Vertices<string> = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    insert(nodes, getPath(line));
  }
  res.send(`Max depth: ${maxDepth(nodes)}\n`);
});

app.get(ROUTES.MAX_DEGREE, async (req, res) => {
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

app
  .route(ROUTES.URL)
  .get(async (req, res) => {
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(`
      <form action=${ROUTES.URL} method="post">
        <label for="url">URL:</label>
        <input type="url" name="url" id="url"
              placeholder="https://example.com"
              pattern="https?://.*" 
              required>
        <input type="submit" value="Submit">
      </form>
    `)
    );
  })
  .post(async (req, res) => {
    const url: string | undefined = req.body.url;
    if (!url) {
      res.send("No URL received");
      return;
    }

    const metaTags = await getMetaTags(url);

    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(`
     <pre><code>${escapeHtml(metaTags)}</code></pre>
    `)
    );
  });

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

async function* makeGoogleProductTypeTextLineIterator(): AsyncGenerator<string> {
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
const getPath = (line: string): Queue<string> => {
  const list = line.split(">").map((token) => token.trim());
  const queue = makeQueue<string>();
  list.forEach((token) => queue.enqueue(token));
  return queue;
};
