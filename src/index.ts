import express from "express";
import { makeQueue, maxDepth, maxDegree, find, getValues, Vertices, forEachBreadthFirst } from "./utils/tree";
import { getMetaTags } from "./crawl";
import { CHAT_AND_COMPlETION_MODELS, inList, listSupportedModels } from "./openai";
import { getGoogleProductCategoriesTaxonomy, getPath, makeGoogleProductTypeTextLineIterator } from "./googleProducts";
import { chatOpenaiAboutGoogleProducts } from "./chatOpenaiAboutGoogleProducts";
import {
  cookieTrailTemplate,
  errorTemplate,
  footerTemplate,
  homeTemplate,
  htmlTemplate,
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
    Buffer.from(
      htmlTemplate(/*html*/ `
    <h1>Explore Google Product Types</h1>
    <ul>
      ${(Object.keys(ROUTES) as RouteKeys)
        .map((k) => `<li><a href=${ROUTES[k].url}>${ROUTES[k].description}</a></li>`)
        .join("")}
    </ul>
    ${footerTemplate()}
  `)
    )
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

app.get(ROUTES.GPC_STATS.url, async (req, res) => {
  console.log("calculating max depth...");

  const nodes = await getGoogleProductCategoriesTaxonomy();

  const [token, maxDeg] = maxDegree(nodes);
  const maxDep = maxDepth(nodes);
  let leafNodeCount = 0;
  forEachBreadthFirst(nodes, () => {
    leafNodeCount++;
  });

  res.write(`Max degree: token "${token}" has the highest degree of ${maxDeg}\n`);
  res.write("\n");
  res.write(`Max depth: ${maxDep}\n`);
  res.write("\n");
  res.write(`Total Google Product Categories: ${leafNodeCount}`);
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
        htmlTemplate(
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
      )
    );
  } catch {
    res.send("error parsing path. Make sure path is comma delimited");
  }
});

app.get(ROUTES.SEARCH.url, async (req, res) => {
  console.log("searching...");
  res.set("Content-Type", "text/html");

  const term = (req.query.term as string) ?? null;
  if (!term) {
    res.send(
      Buffer.from(
        htmlTemplate(
          homeTemplate(/*html*/ `
          <h1>Instructions</h1>
          <p>Add a valid query parameter of form "?term=MY_SEARCH_TERM" to the url and hit enter.</P>
        `)
        )
      )
    );
    return;
  }

  const lineMatches = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    if (line.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
      lineMatches.push(line);
    }
  }

  res.send(
    Buffer.from(
      htmlTemplate(
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
    )
  );
});

app
  .route(ROUTES.URL.url)
  .get(async (req, res) => {
    res.set("Content-Type", "text/html");

    const url = (req.query.url as string) ?? null;
    const model = (req.query.model as string) ?? null;

    const writeHtml = (html: string): void => {
      res.write(Buffer.from(html));
    };
    const sendHtml = (html: string): void => {
      writeHtml(html);
      res.end();
    };

    if (!isValidHttpUrl(url)) {
      let models: string[];
      try {
        models = await listSupportedModels();
      } catch (e) {
        console.log(e);
        sendHtml(errorTemplate("Failed to fetch open ai models. Try again."));
        return;
      }

      sendHtml(htmlTemplate(homeTemplate(urlFormTemplate(ROUTES.URL.url, models))));
      return;
    }

    console.log(`Received request for URL: ${url}, model: ${model}`);

    writeHtml(htmlTemplate(homeTemplate(resultsHeaderTemplate(url))));

    let metaTags: string;
    try {
      console.log("scraping meta tags...");
      metaTags = await getMetaTags(url);
    } catch (e) {
      console.log("error", e);
      sendHtml(
        errorTemplate(
          `Error Fetching ${url}. \n\nMost likely we failed the advertiser bot check. I would try a different advertiser in the same product category and try again.`
        )
      );
      return;
    }

    if (!metaTags.length) {
      sendHtml(errorTemplate(`No metatags retrieved at: ${url}`));
      return;
    }

    writeHtml(scrapedMetaTagsTemplate(metaTags));

    let nodes: Vertices<string>;
    try {
      console.log("parsing google product categories into tree...");
      nodes = await getGoogleProductCategoriesTaxonomy();
    } catch (e) {
      console.log("error", e);
      sendHtml(errorTemplate("Error fetching Google Product Categories. Try again."));
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
      sendHtml(errorTemplate("OpenAI Error. Try again."));
      return;
    }

    const transcript = result.metadata.transcript
      .toList()
      .map(({ prompt, response }) => `${prompt} ${response}`)
      .join(" ");

    const words = transcript.match(/\S+/g)?.length ?? 0;
    const tokens = encode(transcript);

    if (result.type === "error:chat") {
      const { metadata } = result;
      const incorrectResult = metadata.transcript.peakLast();
      sendHtml(/*html*/ `
          <h1>No Product Category Found</h1>
          <p>Did the URL not include a reference to a product? If so, this is the answer we want! If not, was the scraped metadata off? Please slack @jmilgrom with what you found. Thank you!</p>
          ${openAiTemplate({
            model: metadata.model,
            temperature: metadata.temperature,
            tokens: tokens.length,
            words,
            transcript: metadata.transcript.toList(),
          })}
        `);
      return;
    }

    if (result.type === "error:purge") {
      const { categories, metadata } = result;
      sendHtml(/*html*/ `
          <h1>Error Purging Product Categories</h1>
          <div>Purged path: "${categories.toList().join(" > ")}"</div>
          ${openAiTemplate({
            model: metadata.model,
            temperature: metadata.temperature,
            tokens: tokens.length,
            words,
            transcript: metadata.transcript.toList(),
          })}
        `);
      return;
    }

    const { categories, metadata } = result;
    sendHtml(/*html*/ `
        <h1>Result (Google Product Category)</h1>
        <div>
          ${cookieTrailTemplate(ROUTES.TRAVERSE.url, categories.toList(), { delimiter: QUERY_PARAM_DELIMITER })}
        </div>
        ${openAiTemplate({
          model: metadata.model,
          temperature: metadata.temperature,
          tokens: tokens.length,
          words,
          transcript: metadata.transcript.toList(),
        })}
      `);
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
