import { Express } from "express";
import { isValidHttpUrl } from "../../utils/isValidHttpUrl";
import { inList, listSupportedModels } from "../../openai";
import {
  errorTemplate,
  homeTemplate,
  htmlTemplate,
  resultsHeaderTemplate,
  scrapedMetaTagsTemplate,
  resultsHeaderTemplateText,
  graphTraversalForm,
  noCategoryFound,
  errorPurgingPath,
  categoryResultWithChatTemplate,
  vectorSearchForm,
  categoryResult,
  topKTemplate,
} from "../templates";
import { getMetaTags } from "../crawl";
import { Vertices } from "../../utils/tree";
import { getGoogleProductCategoriesTaxonomy } from "../../googleProducts";
import { chatOpenaiGraphTraversal } from "../../chatOpenaiGraphTraversal";
import { encode } from "gpt-3-encoder";
import { chatOpenaiEmbeddings, similaritySearch } from "../../chatOpenaiEmbeddings";
import { assertUnreachable } from "../../utils/assertUnreachable";
import { escapeHtml } from "../../utils/escapeHtml";
import { CHAT_MODELS } from "../../openai/constants";
import { textSpanEnd } from "typescript";

type Source = "url" | "text";

const renderGraphTraversalFormOrError = async ({
  route,
  source,
}: {
  route: string;
  source: Source;
}): Promise<string> => {
  let models: string[];
  try {
    models = await listSupportedModels();
  } catch (e) {
    console.log(e);
    return errorTemplate("Failed to fetch OpenAI models. Try again.");
  }

  return graphTraversalForm({ models, route, source });
};

const renderVectorSearchFormOrError = async ({ route, source }: { route: string; source: Source }): Promise<string> => {
  let models: string[];
  try {
    models = await listSupportedModels();
  } catch (e) {
    console.log(e);
    return errorTemplate("Failed to fetch OpenAI models. Try again.");
  }

  return vectorSearchForm({ source, models, route });
};

const getProductCategoriesOrRenderError = async <T extends object>(
  getResult: (nodes: Vertices<string>) => Promise<T>
): Promise<T | string> => {
  let nodes: Vertices<string>;
  try {
    console.log("parsing google product categories into tree...");
    nodes = await getGoogleProductCategoriesTaxonomy();
  } catch (e) {
    console.log("error", e);
    return errorTemplate("Error fetching Google Product Categories. Try again.");
  }

  try {
    console.log("chating openai...");
    return await getResult(nodes);
  } catch (e) {
    console.log("error", e);
    return errorTemplate("OpenAI Error. Try again.");
  }
};

const parseSource = (source?: string): Source => {
  const defaultSource = "url";
  if (!source) {
    return defaultSource;
  }
  const lower = source.toLowerCase();
  switch (lower) {
    case "url":
    case "text":
      return lower;
    default:
      return defaultSource;
  }
};

const analyzeTranscript = (
  transcipt: Array<{ prompt: string; response: string }>
): { transcript: string; words: number; tokens: number[] } => {
  const formatted = transcipt.map(({ prompt, response }) => `${prompt} ${response}`).join(" ");

  return {
    transcript: formatted,
    words: formatted.match(/\S+/g)?.length ?? 0,
    tokens: encode(formatted),
  } as const;
};

export const configureGraphTraversalRoute = (
  app: Express,
  { route, queryParamDelimiter }: { route: string; queryParamDelimiter: string }
): void => {
  app
    .route(route)
    .get(async (req, res) => {
      res.set("Content-Type", "text/html");

      const url = (req.query.url as string | null) ?? undefined;
      const model = (req.query.model as string | null) ?? "";
      const source = parseSource((req.query.source as string | null) ?? undefined);
      const text = (req.query.text as string | null) ?? null;

      const writeHtml = (html: string): void => {
        res.write(Buffer.from(html));
      };
      const sendHtml = (html: string): void => {
        writeHtml(html);
        res.end();
      };

      switch (source) {
        case "url": {
          /**
           * Case where either
           *  (i) user's first time through /url and "url" is empty --> show the form
           *  (ii) url entered in /url is invalid --> show the form
           */
          if (!(url && isValidHttpUrl(url))) {
            const formOrError = await renderGraphTraversalFormOrError({ route, source: "url" });
            sendHtml(formOrError);
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

          const result = await getProductCategoriesOrRenderError((nodes) =>
            chatOpenaiGraphTraversal(nodes, metaTags, {
              retries: 1,
              model: inList(CHAT_MODELS, model) ? model : undefined,
            })
          );

          if (typeof result === "string") {
            sendHtml(result);
            return;
          }

          const { metadata } = result;

          const { words, tokens } = analyzeTranscript(metadata.transcript.toList());

          if (result.type === "error:chat") {
            sendHtml(
              noCategoryFound({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
              })
            );
            return;
          }

          const { categories } = result;

          if (result.type === "error:purge") {
            sendHtml(
              errorPurgingPath({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
                categories: categories.toList(),
              })
            );
            return;
          }

          sendHtml(
            categoryResultWithChatTemplate({
              model: metadata.model,
              temperature: metadata.temperature,
              tokens: tokens.length,
              words,
              transcript: metadata.transcript.toList(),
              categories: categories.toList(),
              queryParamDelimiter,
            })
          );
          return;
        }
        case "text": {
          /**
           * Case where either
           *  (i) user's first time through /url and "url" is empty --> show the form
           *  (ii) url entered in /url is invalid --> show the form
           */
          if (!text) {
            const formOrError = await renderGraphTraversalFormOrError({ route, source: "text" });
            sendHtml(formOrError);
            return;
          }

          console.log(`Received request for text: ${text}\n, model: ${model}`);

          writeHtml(htmlTemplate(homeTemplate(resultsHeaderTemplateText(escapeHtml(text)))));

          const result = await getProductCategoriesOrRenderError((nodes) =>
            chatOpenaiGraphTraversal(nodes, text, {
              retries: 1,
              model: inList(CHAT_MODELS, model) ? model : undefined,
            })
          );

          if (typeof result === "string") {
            sendHtml(result);
            return;
          }

          const { metadata } = result;

          const { words, tokens } = analyzeTranscript(metadata.transcript.toList());

          if (result.type === "error:chat") {
            sendHtml(
              noCategoryFound({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
              })
            );
            return;
          }

          const { categories } = result;

          if (result.type === "error:purge") {
            sendHtml(
              errorPurgingPath({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
                categories: categories.toList(),
              })
            );
            return;
          }

          sendHtml(
            categoryResultWithChatTemplate({
              model: metadata.model,
              temperature: metadata.temperature,
              tokens: tokens.length,
              words,
              transcript: metadata.transcript.toList(),
              categories: categories.toList(),
              queryParamDelimiter,
            })
          );
          return;
        }
        default:
          return assertUnreachable(source);
      }
    })
    .post(async (req, res) => {
      const model: string | undefined = req.body.model;
      const url: string | undefined = req.body.url;
      const text: string | undefined = req.body.text;
      const source = parseSource(req.body.source);

      switch (source) {
        case "text":
          if (!text) {
            res.send("No Text received.");
            return;
          }

          res.redirect(
            route +
              `?model=${encodeURIComponent(model ? model : "default")}&text=${encodeURIComponent(
                text
              )}&source=${source}`
          );
          return;
        case "url":
          if (!url) {
            res.send("No URL received");
            return;
          }

          res.redirect(
            route +
              `?model=${encodeURIComponent(model ? model : "default")}&url=${encodeURIComponent(url)}&source=${source}`
          );
          return;
        default:
          return assertUnreachable(source);
      }
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

      const url = (req.query.url as string | null) ?? null;
      const model = (req.query.model as string | null) ?? "";
      const k = (req.query.k as string | null) ?? "";
      const source = parseSource((req.query.source as string | null) ?? undefined);
      const text = (req.query.text as string | null) ?? null;

      const writeHtml = (html: string): void => {
        res.write(Buffer.from(html));
      };
      const sendHtml = (html: string): void => {
        writeHtml(html);
        res.end();
      };

      switch (source) {
        case "url": {
          /**
           * Case where either
           *  (i) user's first time through /url and "url" is empty --> show the form
           *  (ii) url entered in /url is invalid --> show the form
           */
          if (!(url && isValidHttpUrl(url))) {
            const formOrError = await renderVectorSearchFormOrError({ route, source: "url" });
            sendHtml(formOrError);
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

          const search = await getProductCategoriesOrRenderError((nodes) =>
            similaritySearch(nodes, metaTags, { k: Number.isInteger(kNumber) ? kNumber : undefined })
          );

          if (typeof search === "string") {
            sendHtml(search);
            return;
          }
          if (search.type === "error:NoCategoryFound") {
            sendHtml(/*html*/ `
            <h1>No Product Category Found</h1>
            <p>Unable to parse found category string for k = 1</p>
            `);
            return;
          }

          writeHtml(topKTemplate({ top: search.metadata.top, k: search.metadata.k }));

          if (search.type === "success") {
            sendHtml(
              categoryResult({
                categories: search.categories.toList(),
                queryParamDelimiter,
              })
            );
            return;
          }

          const result = await getProductCategoriesOrRenderError((nodes) =>
            chatOpenaiEmbeddings(nodes, metaTags, search.metadata.top, {
              model: inList(CHAT_MODELS, model) ? model : undefined,
            })
          );

          if (typeof result === "string") {
            sendHtml(result);
            return;
          }

          const { metadata } = result;

          const { words, tokens } = analyzeTranscript(metadata.transcript.toList());

          if (result.type === "error:NoCategoryFound") {
            sendHtml(
              noCategoryFound({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
              })
            );
            return;
          }

          const { categories } = result;
          sendHtml(
            categoryResultWithChatTemplate({
              model: metadata.model,
              temperature: metadata.temperature,
              tokens: tokens.length,
              words,
              transcript: metadata.transcript.toList(),
              categories: categories.toList(),
              queryParamDelimiter,
            })
          );
          return;
        }

        case "text": {
          /**
           * Case where either
           *  (i) user's first time through /url and "text" is empty --> show the form
           *  (ii) text entered in /url is invalid --> show the form
           */
          if (!text) {
            const formOrError = await renderVectorSearchFormOrError({ route, source: "text" });
            sendHtml(formOrError);
            return;
          }

          const kNumber = parseInt(k);

          console.log(`Received request for text: ${text}\n, model: ${model}`);

          writeHtml(htmlTemplate(homeTemplate(resultsHeaderTemplateText(escapeHtml(text)))));

          const search = await getProductCategoriesOrRenderError((nodes) =>
            similaritySearch(nodes, text, { k: Number.isInteger(kNumber) ? kNumber : undefined })
          );

          if (typeof search === "string") {
            sendHtml(search);
            return;
          }
          if (search.type === "error:NoCategoryFound") {
            sendHtml(/*html*/ `
            <h1>No Product Category Found</h1>
            <p>Unable to parse found category string for k = 1</p>
            `);
            return;
          }

          writeHtml(topKTemplate({ top: search.metadata.top, k: search.metadata.k }));

          if (search.type === "success") {
            sendHtml(
              categoryResult({
                categories: search.categories.toList(),
                queryParamDelimiter,
              })
            );
            return;
          }

          const result = await getProductCategoriesOrRenderError((nodes) =>
            chatOpenaiEmbeddings(nodes, text, search.metadata.top, {
              model: inList(CHAT_MODELS, model) ? model : undefined,
            })
          );

          if (typeof result === "string") {
            sendHtml(result);
            return;
          }

          if (typeof result === "string") {
            sendHtml(result);
            return;
          }

          const { metadata } = result;

          const { words, tokens } = analyzeTranscript(metadata.transcript.toList());

          if (result.type === "error:NoCategoryFound") {
            sendHtml(
              noCategoryFound({
                model: metadata.model,
                temperature: metadata.temperature,
                tokens: tokens.length,
                words,
                transcript: metadata.transcript.toList(),
              })
            );
            return;
          }

          const { categories } = result;
          sendHtml(
            categoryResultWithChatTemplate({
              model: metadata.model,
              temperature: metadata.temperature,
              tokens: tokens.length,
              words,
              transcript: metadata.transcript.toList(),
              categories: categories.toList(),
              queryParamDelimiter,
            })
          );
          return;
        }

        default:
          return assertUnreachable(source);
      }
    })
    .post(async (req, res) => {
      const model: string | undefined = req.body.model;
      const url: string | undefined = req.body.url;
      const text: string | undefined = req.body.text;
      const k: string | undefined = req.body.k;
      const source = parseSource(req.body.source);

      switch (source) {
        case "text":
          if (!text) {
            res.send("No Text received.");
            return;
          }

          res.redirect(
            route +
              `?model=${encodeURIComponent(model ? model : "default")}&text=${encodeURIComponent(
                text
              )}&k=${encodeURIComponent(k ? k : "default")}&source=${source}`
          );
          return;
        case "url":
          if (!url) {
            res.send("No URL received");
            return;
          }

          res.redirect(
            route +
              `?model=${encodeURIComponent(model ? model : "default")}&url=${encodeURIComponent(
                url
              )}&k=${encodeURIComponent(k ? k : "default")}&source=${source}`
          );
          return;
        default:
          return assertUnreachable(source);
      }
    });
};
