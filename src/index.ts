import express from "express";
import { makeQueue, maxDepth, maxDegree, traverse, toList } from "./utils/tree";
import { getMetaTags } from "./crawl";
import { escapeHtml } from "./utils/escapeHtml";
import { generatePrompt } from "./openai";
import { getGoogleProductCategoriesTaxonomy, getPath, makeGoogleProductTypeTextLineIterator } from "./googleProducts";
import { chatOpenaiAboutGoogleProducts } from "./chatOpenaiAboutGoogleProducts";
import { templateTrascript } from "./templates";
import { ROUTES, RouteKeys } from "./routes";

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
  // this needs to be a character that does not appear in a google product category name (e.g. "," won't work properly)
  const QUERY_PARAM_DELIMITER = ">";

  const nodes = await getGoogleProductCategoriesTaxonomy();
  try {
    const pathString = (req.query.path as string) ?? null;
    const path = pathString ? getPath(pathString, { delimitingChar: QUERY_PARAM_DELIMITER }) : makeQueue<string>();
    const node = traverse(nodes, path.copy());
    const children = node?.children ?? nodes;

    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(/*html*/ `
      <h1>${node ? path.toString(" > ") : "Root Nodes"}</h1>
      <ul>
        ${toList(children)
          .map(
            (value) => /*html*/ `<li>
                <a 
                  href="${ROUTES.TRAVERSE}?path=${[...path.toList(), value]
              .map(encodeURIComponent)
              .join(QUERY_PARAM_DELIMITER)}"
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
      Buffer.from(/*html*/ `
      <h1>Find the Google Product Categories</h1>
      <form action=${ROUTES.URL} method="post">
        <label for="url">URL:</label>
        <input type="url" name="url" id="url"
              placeholder="https://example.com"
              pattern="https?://.*" 
              required>
        <input type="submit" value="Submit">
      </form>
      <p>Only submit the form once to avoid multiple submissions. It will take a moment!</p>
    `)
    );
  })
  .post(async (req, res) => {
    const url: string | undefined = req.body.url;
    if (!url) {
      res.send("No URL received");
      return;
    }

    try {
      const metaTags = await getMetaTags(url);
      const nodes = await getGoogleProductCategoriesTaxonomy();
      const result = await chatOpenaiAboutGoogleProducts(nodes, metaTags);

      res.set("Content-Type", "text/html");

      if (result.type === "error") {
        res.send(
          Buffer.from(/*html*/ `
            <h1>Results</h1>
            <div>${url}</div>
            <h2>Error Retrieving Product Categories</h2>
            <div>Node not found for category "${result.category}"</div>
            <h2>Scraped Meta Tags</h2>
            <pre><code>${escapeHtml(metaTags)}</code></pre>
            <h2>Transcript with Openai</h2>
            <h3>Prompt Template</h3>
            <p>${generatePrompt(["CHOICE_1", "CHOICE_2", "CHOICE_3"], "SOME_META_TAGS")}</p>
            <h3>Trascript (Verbatum)</h3>
            ${templateTrascript(result.transcript)}
          `)
        );
        return;
      }

      const { categories, transcript } = result;

      res.send(
        Buffer.from(/*html*/ `
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
          ${templateTrascript(transcript)}
        `)
      );
    } catch (e) {
      res.send(e);
    }
  });

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
