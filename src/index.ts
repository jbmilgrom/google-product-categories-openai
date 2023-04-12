import express from "express";
import { makeQueue, insert, Vertices, maxDepth, Queue, maxDegree, traverse, toList, Vertex } from "./tree";
import { parse } from "node-html-parser";
import { getMetaTags, escapeHtml } from "./getMetaTags";
import { askOpenai, generatePrompt, selectFromMultipleChoices } from "./openaiGetNode";
import {
  getGoogleProductCategoriesTaxonomy,
  getPath,
  makeGoogleProductTypeTextLineIterator,
} from "./googleProductCategories";

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

export const GOOGLE_PRODUCT_TYPES_URL = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt";

const ROUTES = {
  TEXT: "/text",
  INTERNAL_REPRESENTATION: "/internal-representation.json",
  MAX_DEPTH: "/max-depth",
  MAX_DEGREE: "/max-degree",
  TRAVERSE: "/traverse",
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
  const nodes = await getGoogleProductCategoriesTaxonomy();
  res.send(nodes);
});

app.get(ROUTES.MAX_DEPTH, async (req, res) => {
  console.log("calculating max depth...");
  let max = 0;
  const nodes = await getGoogleProductCategoriesTaxonomy();
  res.send(`Max depth: ${maxDepth(nodes)}\n`);
});

app.get(ROUTES.MAX_DEGREE, async (req, res) => {
  console.log("calculating max degree...");
  const nodes = await getGoogleProductCategoriesTaxonomy();

  const [token, max] = maxDegree(nodes);

  res.write(`Max degree: ${max}\n`);
  res.write(`Token: "${token}"\n`);
  res.end();
});

app.get(ROUTES.TRAVERSE, async (req, res) => {
  console.log("calculating children...");
  const nodes = await getGoogleProductCategoriesTaxonomy();

  try {
    const pathString = (req.query.path as string) ?? null;
    const path = pathString ? getPath(pathString, { delimitingChar: "," }) : makeQueue<string>();
    const node = traverse(nodes, path.copy());
    const children = node?.children ?? nodes;

    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(`
      <h1>${node ? path.toString(" > ") : "Root Nodes"}</h1>
      <ul>
        ${toList(children)
          .map(
            (value) =>
              `<li>
                <a 
                  href="${ROUTES.TRAVERSE}?path=${[...path.toList(), value].map(encodeURIComponent).join(",")}"
                >
                  ${value}
                </a>
              </li>`
          )
          .join("")}
      </ul>
    `)
    );
  } catch {
    res.send("error parsing path. Make sure path is comma delimited");
  }
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
        <label for="url">Your openai token:</label>
        <input type="texty" name="apiKey" id="apiKey"
               placeholder="k-wKob3..."
               required>
        <input type="submit" value="Submit">
      </form>
    `)
    );
  })
  .post(async (req, res) => {
    const url: string | undefined = req.body.url;
    const apiKey: string | undefined = req.body.apiKey;
    if (!url) {
      res.send("No URL received");
      return;
    }

    if (!apiKey) {
      res.send("No Api Key received");
      return;
    }

    try {
      const metaTags = await getMetaTags(url);
      const nodes = await getGoogleProductCategoriesTaxonomy();

      /**
       * 1. Get next choices (from node or default)
       * 2. Select token from multiple choices
       * 3. Find node from token, go to 1.
       */
      let choices: Vertices<string> = nodes;
      const categories = makeQueue<string>();
      const transcript = makeQueue<{ prompt: string; response: string }>();
      while (choices.length) {
        const { category, prompt } = await selectFromMultipleChoices(apiKey, toList(choices), metaTags);
        categories.enqueue(category);
        transcript.enqueue({ prompt, response: category });

        const node = traverse(nodes, categories.copy());
        if (!node) {
          res.write(`Node not found for category "${category}"\n`);
          res.write("Transcript\n");
          res.write(transcript.toString("#### Next Chat ####\n"));
          res.end();
          return;
        }
        choices = node.children;
      }

      res.set("Content-Type", "text/html");
      res.send(
        Buffer.from(`
          <h1>Results</h1>
          <div>${url}</div>
          <h2>Product Categories</h2>
          <div>${categories.toString(" > ")}</div>
          <h2>Scraped Meta Tags</h2>
          <pre><code>${escapeHtml(metaTags)}</code></pre>
          <h2>Transcript with Openai</h2>
          <h3>Prompt Template</h3>
          <p>${generatePrompt(["CHOICE_1", "CHOICE_2", "CHOICE_3"], "SOME_META_TAGS")}</p>
          <h3>Trascript (Verbatum)</h3>
          ${transcript
            .toList()
            .map(
              ({ prompt, response }) => `
            <p>prompt: ${escapeHtml(prompt)}</p>
            <p>openai: ${response}</p>
          `
            )
            .join("")}
        `)
      );
    } catch (e) {
      res.send(e);
    }
  });

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
