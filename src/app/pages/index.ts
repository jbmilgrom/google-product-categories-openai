import { Express } from "express";
import { isValidHttpUrl } from "../../utils/isValidHttpUrl";
import { CHAT_AND_COMPlETION_MODELS, inList, listSupportedModels } from "../../openai";
import {
  cookieTrailTemplate,
  errorTemplate,
  formTemplate,
  homeTemplate,
  htmlTemplate,
  kFormTemplate,
  openAiTemplate,
  resultsHeaderTemplate,
  scrapedMetaTagsTemplate,
  urlAndModelFormTemplate,
} from "../templates";
import { getMetaTags } from "../crawl";
import { Vertices } from "../../utils/tree";
import { getGoogleProductCategoriesTaxonomy } from "../../googleProducts";
import { chatOpenaiGraphTraversal } from "../chatOpenaiGraphTraversal";
import { encode } from "gpt-3-encoder";
import { ROUTES } from "../routes";
import { chatOpenaiEmbeddings } from "../chatOpenaiEmbeddings";

export const configureGraphTraversalRoute = (
  app: Express,
  { route, queryParamDelimiter }: { route: string; queryParamDelimiter: string }
): void => {
  app
    .route(route)
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

      /**
       * Case where either
       *  (i) user's first time through /url and "url" is empty --> show the form
       *  (ii) url entered in /url is invalid --> show the form
       */
      if (!isValidHttpUrl(url)) {
        let models: string[];
        try {
          models = await listSupportedModels();
        } catch (e) {
          console.log(e);
          sendHtml(errorTemplate("Failed to fetch OpenAI models. Try again."));
          return;
        }

        sendHtml(htmlTemplate(homeTemplate(formTemplate(route, urlAndModelFormTemplate(models)))));
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

      let result: Awaited<ReturnType<typeof chatOpenaiGraphTraversal>>;
      try {
        console.log("chating openai...");
        result = await chatOpenaiGraphTraversal(nodes, metaTags, {
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
          ${cookieTrailTemplate(ROUTES.TRAVERSE.url, categories.toList(), { delimiter: queryParamDelimiter })}
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

      res.redirect(route + `?model=${encodeURIComponent(model ? model : "default")}&url=${encodeURIComponent(url)}`);
    });
};

export const configureVectorSearchRoute = (
  app: Express,
  { route, queryParamDelimiter }: { route: string; queryParamDelimiter: string }
): void => {
  app
    .route(route)
    .get(async (req, res) => {
      res.set("Content-Type", "text/html");

      const url = (req.query.url as string) ?? null;
      const model = (req.query.model as string) ?? null;
      const k = (req.query.k as string) ?? null;

      const writeHtml = (html: string): void => {
        res.write(Buffer.from(html));
      };
      const sendHtml = (html: string): void => {
        writeHtml(html);
        res.end();
      };

      /**
       * Case where either
       *  (i) user's first time through /url and "url" is empty --> show the form
       *  (ii) url entered in /url is invalid --> show the form
       */
      if (!isValidHttpUrl(url)) {
        let models: string[];
        try {
          models = await listSupportedModels();
        } catch (e) {
          console.log(e);
          sendHtml(errorTemplate("Failed to fetch OpenAI models. Try again."));
          return;
        }

        sendHtml(htmlTemplate(homeTemplate(formTemplate(route, urlAndModelFormTemplate(models) + kFormTemplate(10)))));
        return;
      }

      const kNumber = parseInt(k);

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

      let result: Awaited<ReturnType<typeof chatOpenaiEmbeddings>>;
      try {
        console.log("chating openai...");
        result = await chatOpenaiEmbeddings(nodes, metaTags, {
          k: Number.isInteger(kNumber) ? kNumber : undefined,
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

      const { categories, metadata } = result;
      sendHtml(/*html*/ `
        <h1>Result (Google Product Category)</h1>
        <div>
          ${cookieTrailTemplate(ROUTES.TRAVERSE.url, categories.toList(), { delimiter: queryParamDelimiter })}
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
      const k: string | undefined = req.body.k;
      if (!url) {
        res.send("No URL received");
        return;
      }

      res.redirect(
        route +
          `?model=${encodeURIComponent(model ? model : "default")}&url=${encodeURIComponent(
            url
          )}&k=${encodeURIComponent(k ? k : "default")}`
      );
    });
};
