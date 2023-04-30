import express from "express";
import { makeQueue, maxDepth, maxDegree, find, getValues, Vertices } from "./utils/tree";
import { getMetaTags } from "./crawl";
import { CHAT_AND_COMPlETION_MODELS, inList, listSupportedModels } from "./openai";
import { getGoogleProductCategoriesTaxonomy, getPath, makeGoogleProductTypeTextLineIterator } from "./googleProducts";
import { chatOpenaiAboutGoogleProducts } from "./chatOpenaiAboutGoogleProducts";
import {
  cookieTrailTemplate,
  homeTemplate,
  linkTemplate,
  openAiTemplate,
  resultsHeaderTemplate,
  scrapedMetaTagsTemplate,
  urlFormTemplate,
} from "./templates";
import { ROUTES, RouteKeys } from "./routes";
import { isValidHttpUrl } from "./utils/isValidHttpUrl";
import { encode } from "gpt-3-encoder";

const app = express();

/**
 * These configurations are needed to be receive form data in POST methods
 *
 * @see https://stackoverflow.com/a/12008719/3645851
 * @see https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT /* needed for Heroku deployment */ ?? 3003;

// this needs to be a character that does not appear in a google product category name (e.g. "," won't work properly)
const QUERY_PARAM_DELIMITER = "_";

app.get("/", async (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(
    Buffer.from(`
    <h1>Explore Google Product Types</h1>
    <ul>
      ${(Object.keys(ROUTES) as RouteKeys)
        .map((k) => `<li><a href=${ROUTES[k].url}>${ROUTES[k].description}</a></li>`)
        .join("")}
    </ul>
  `)
  );
});

app.get(ROUTES.TEXT.url, async (req, res) => {
  console.log(`fetching google product type...`);
  let lineCount = 0;
  let characterCount = 0;
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    lineCount++;
    characterCount += line.length;
    res.write(`${line}\n`);
  }
  console.log(`Line/Path Count: ${lineCount}`);
  console.log(`Avg line length: ${characterCount / lineCount}`);
  res.end();
});

app.get(ROUTES.INTERNAL_REPRESENTATION.url, async (req, res) => {
  console.log(`fetching google product type...`);
  const nodes = await getGoogleProductCategoriesTaxonomy();
  res.send(nodes);
});

app.get(ROUTES.MAX_DEPTH.url, async (req, res) => {
  console.log("calculating max depth...");
  let max = 0;
  const nodes = await getGoogleProductCategoriesTaxonomy();
  res.send(`Max depth: ${maxDepth(nodes)}\n`);
});

app.get(ROUTES.MAX_DEGREE.url, async (req, res) => {
  console.log("calculating max degree...");
  const nodes = await getGoogleProductCategoriesTaxonomy();

  const [token, max] = maxDegree(nodes);

  res.write(`Max degree: ${max}\n`);
  res.write(`Token: "${token}"\n`);
  res.end();
});

app.get(ROUTES.TRAVERSE.url, async (req, res) => {
  console.log("calculating children...");

  const nodes = await getGoogleProductCategoriesTaxonomy();
  try {
    const pathString = (req.query.path as string) ?? null;
    const path = pathString ? getPath(pathString, { delimitingChar: QUERY_PARAM_DELIMITER }) : makeQueue<string>();
    const node = find(nodes, { path: path.copy() });
    const children = node?.children ?? nodes;
    const pathList = path.toList();
    const childrenList = getValues(children);

    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(
        homeTemplate(/*html*/ `
      <h2>Path</h2>
      <div>
        <span>${pathList.length ? `<a href=${ROUTES.TRAVERSE.url}>Root</a><span> > </span>` : "Root"}</span>
        ${cookieTrailTemplate(ROUTES.TRAVERSE.url, pathList, { delimiter: QUERY_PARAM_DELIMITER })}
      </div>
      <h2>Next</h2>
      ${childrenList.length === 0 ? `<div><span>Leaf Node &#127809;</span></div>` : ""}
      <ul>
        ${childrenList
          .map(
            (value) =>
              `<li>
                ${linkTemplate(ROUTES.TRAVERSE.url, [...pathList, value], {
                  delimiter: QUERY_PARAM_DELIMITER,
                })}
              </li>`
          )
          .join("")}
      </ul>
    `)
      )
    );
  } catch {
    res.send("error parsing path. Make sure path is comma delimited");
  }
});

app.get(ROUTES.SEARCH.url, async (req, res) => {
  console.log("searching...");

  const term = (req.query.term as string) ?? null;
  if (!term) {
    res.send('Add a valid query parameter of form "?term=MY_SEARCH_TERM" to the url and hit enter.');
    return;
  }

  const lineMatches = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    if (line.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
      lineMatches.push(line);
    }
  }

  res.set("Content-Type", "text/html");
  res.send(
    Buffer.from(
      homeTemplate(/*html*/ `
    <h1>Search Results</h1>
    ${
      !lineMatches.length
        ? "<p>No Results</p>"
        : `<ul>
        ${lineMatches.map((match) => `<li>${match}</li>`).join("")}
      </ul>`
    }
  `)
    )
  );
});

app
  .route(ROUTES.URL.url)
  .get(async (req, res) => {
    const url = (req.query.url as string) ?? null;
    const model = (req.query.model as string) ?? null;

    if (!isValidHttpUrl(url)) {
      let models: string[];
      try {
        models = await listSupportedModels();
      } catch (e) {
        console.log(e);
        res.send("Failed to fetch open ai models. Try again.");
        return;
      }

      res.set("Content-Type", "text/html");
      res.send(Buffer.from(homeTemplate(urlFormTemplate(ROUTES.URL.url, models))));
      return;
    }

    console.log(`Received request for URL: ${url}, model: ${model}`);

    let metaTags: string;
    try {
      console.log("scraping meta tags...");
      metaTags = await getMetaTags(url);
    } catch (e) {
      console.log("error", e);
      res.send(
        `Error Fetching ${url}. \n\nMost likely we failed the advertiser bot check. I would try a different advertiser in the same product category and try again.`
      );
      return;
    }

    if (!metaTags.length) {
      res.send(`No metatags retrieved at: ${url}`);
      return;
    }

    let nodes: Vertices<string>;
    try {
      console.log("parsing google product categories into tree...");
      nodes = await getGoogleProductCategoriesTaxonomy();
    } catch (e) {
      console.log("error", e);
      res.send("Error fetching Google Product Categories. Try again.");
      return;
    }

    let result: Awaited<ReturnType<typeof chatOpenaiAboutGoogleProducts>>;
    try {
      console.log("chating openai...");
      result = await chatOpenaiAboutGoogleProducts(nodes, metaTags, {
        retries: 1,
        model: inList(CHAT_AND_COMPlETION_MODELS, model) ? model : undefined,
      });
    } catch (e) {
      console.log("error", e);
      res.send("OpenAI Error. Try again.");
      return;
    }

    res.set("Content-Type", "text/html");

    const transcript = result.metadata.transcript
      .toList()
      .map(({ prompt, response }) => `${prompt} ${response}`)
      .join(" ");

    const words = transcript.match(/\S+/g)?.length ?? 0;
    const tokens = encode(transcript);

    if (result.type === "error:chat") {
      const { metadata } = result;
      const incorrectResult = metadata.transcript.peakLast();
      res.send(
        Buffer.from(
          homeTemplate(/*html*/ `
          ${resultsHeaderTemplate(url)}
          <h2>No Product Category Found</h2>
          <p>Did the URL not include a reference to a product? If so, this is the answer we want! If not, was the scraped metadata off? Please slack @jmilgrom with what you found. Thank you!</p>
          ${scrapedMetaTagsTemplate(metaTags)}
          ${openAiTemplate({
            model: metadata.model,
            temperature: metadata.temperature,
            tokens: tokens.length,
            words,
            transcript: metadata.transcript.toList(),
          })}
        `)
        )
      );
      return;
    }

    if (result.type === "error:purge") {
      const { categories, metadata } = result;
      res.send(
        Buffer.from(
          homeTemplate(/*html*/ `
          ${resultsHeaderTemplate(url)}
          <h2>Error Purging Product Categories</h2>
          <div>Purged path: "${categories.toList().join(" > ")}"</div>
          ${scrapedMetaTagsTemplate(metaTags)}
          ${openAiTemplate({
            model: metadata.model,
            temperature: metadata.temperature,
            tokens: tokens.length,
            words,
            transcript: metadata.transcript.toList(),
          })}
        `)
        )
      );
      return;
    }

    const { categories, metadata } = result;
    res.send(
      Buffer.from(
        homeTemplate(/*html*/ `
        ${resultsHeaderTemplate(url)}
        <h2>Product Categories</h2>
        <div>
          ${cookieTrailTemplate(ROUTES.TRAVERSE.url, categories.toList(), { delimiter: QUERY_PARAM_DELIMITER })}
        </div>
        ${scrapedMetaTagsTemplate(metaTags)}
        ${openAiTemplate({
          model: metadata.model,
          temperature: metadata.temperature,
          tokens: tokens.length,
          words,
          transcript: metadata.transcript.toList(),
        })}
      `)
      )
    );
  })
  .post(async (req, res) => {
    const model: string | undefined = req.body.model;
    const url: string | undefined = req.body.url;
    if (!url) {
      res.send("No URL received");
      return;
    }

    res.redirect(
      ROUTES.URL.url + `?url=${encodeURIComponent(url)}&model=${encodeURIComponent(model ? model : "default")}`
    );
  });

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
