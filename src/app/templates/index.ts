import { inList } from "../../openai";
import { CHAT_COMPLETION_MODELS, FUNCTION_CALL_MODELS, INSTRUCTION_MODELS } from "../../openai/constants";
import { assertUnreachable } from "../../utils/assertUnreachable";
import { escapeHtml } from "../../utils/escapeHtml";
import { makeQueryParams } from "../../utils/makeQueyParams";
import { ROUTES } from "../routes";

type Chat = { prompt: string; response: string };

export const htmlTemplate = (children?: string): string => {
  return /*html*/ `
  <html>
    <head>
      <style>
        body {
          padding-left: 1em;
          padding-top: 1em;
          padding-bottom: 4em;
          color: #353740;
        }

        footer {
          font-family: "ColfaxAI", Helvetica, sans-serif;
          position: fixed;
          left: 0;
          bottom: 0;
          width: 100%;
          text-align: center;
          color: #aaa;
          font-size: 13px;
          background-color: rgba(255, 255, 255, .9);       
        }

        footer a {
          color: #aaa;
        }

        footer a:visited {
          color: inherit
        }

        footer a:hover {
          color: #353740;
        }

        header {
          margin-bottom: 2em;
        }
        
        header h1 {
          margin-bottom: 0;
        }

        header p {
          margin-top: .5em;
          margin-bottom: 0;
          width: max(80vw, 400px);
        }

        table, th, td {
          border: 1px solid black;
        }

        td {
          padding: .5em 1em;
        }

        thead {
          font-weight: bold;
        }

        form.url-form {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          width: max(46vw, 600px);
          grid-template-areas: 
            "source-label   source-input     source-input     source-input    source-input      source-input    source-change"
            "model-label    model-input      model-input      .               .                 .               ."
            ".              model-footnote   model-footnote   model-footnote  model-footnote    model-footnote  ."
            "k-label        k-input          .                .               .                 .               ."
            ".              k-footnote       k-footnote       k-footnote      k-footnote        k-footnote      ."
            ".              submit-button    submit-button    submit-button   submit-button     .               ."
            ;
          gap: 16px;
        }

        ${[
          "source-label",
          "source-input",
          "source-change",
          "model-label",
          "model-input",
          "model-footnote",
          "k-label",
          "k-input",
          "k-footnote",
          "submit-button",
        ]
          .map(
            (gridArea) => /* html */ `.${gridArea} {
              grid-area: ${gridArea};
            }`
          )
          .join("\n")}

        form .footnote {
          font-size: .85em;
        }

        .source-input, .model-input, .k-input, .submit-button {
          padding: 6px;
        }

      </style>
    </head>
    <body>
      ${children}
    </body>
  </html>
  `;
};

export const homeTemplate = (children?: string): string => {
  return /*html*/ `
    <div>
      <a href="/">Home</a>
    <div>
    ${children}
    ${footerTemplate()}
  `;
};

export const footerTemplate = () => {
  return /*html*/ `
    <footer>
      <p><a href="https://github.sc-corp.net/jmilgrom/google-product-types">Code</a> |  Powered by <a href="https://openai.com/product">OpenAI</a>.</p> 
    </footer>
  `;
};

export const routeList = <T extends { [k: string]: { url: string; description: string } }>(routes: T): string => {
  return (Object.keys(routes) as Array<keyof typeof routes>)
    .map((k) => `<li><a href=${routes[k].url}>${routes[k].description}</a></li>`)
    .join("");
};

export const linkTemplate = (base: string, path: string[], { delimiter }: { delimiter?: string } = {}) => {
  const queryParams = makeQueryParams(path, delimiter);
  return /*html*/ `<a href=${`${base}?path=${queryParams}`}>${path[path.length - 1]}</a>`;
};

export const cookieTrailTemplate = (
  base: string,
  categories: string[],
  { delimiter }: { delimiter?: string } = {}
): string => {
  return categories
    .map((_, i) => {
      const path = categories.slice(0, i + 1);
      return linkTemplate(base, path, { delimiter });
    })
    .join(" > ");
};

export const templateTrascript = (transcript: Chat[]): string => {
  const template = ({ prompt, response }: Chat, index: number) => /*html*/ `
    <h3>Query #${index + 1}</h3>
    <h4>Prompt</h4>
    <code><pre>${escapeHtml(prompt)}</pre><code>
    <h4>OpenAI</h4>
    <code><pre>${response}</pre><code>
  `;
  return transcript.map(template).join("");
};

export const formTemplate = (postUrl: string, children: string): string => {
  return /* html */ `
    <form action=${postUrl} method="post" class="url-form">
      ${children}
      <input class="submit-button" type="submit" value="Submit">
    </form>
  `;
};

export const sourceFormTemplate = (source: "url" | "text", path: string) => {
  switch (source) {
    case "url":
      return /*html*/ `
        <label class="source-label" for="url-source">URL</label>
        <input class="source-input" type="url" name="url" id="url-source"
              placeholder="https://example.com"
              pattern="https?://.*" 
              required>
        <div class="source-change">Switch to <a href="${path}?source=text">Text</a></div>
        <input type="hidden" name="source" value="url"/>
      `;
    case "text":
      return /*html*/ `
        <label class="source-label" for="text-source">Text</label>
        <textarea maxlength="1800" class="source-input" name="text" id="text-source" required></textarea>
        <div class="source-change">Switch to <a href="${path}?source=url">URL</a></div>
        <input type="hidden" name="source" value="text"/>
      `;
    default:
      return assertUnreachable(source);
  }
};

const renderModelOption = (model: string): string => {
  if (inList(FUNCTION_CALL_MODELS, model)) {
    return "Chat Model with Function Calling";
  }
  if (inList(CHAT_COMPLETION_MODELS, model)) {
    return "Chat Model";
  }
  if (inList(INSTRUCTION_MODELS, model)) {
    return "Instruction Model";
  }
  return model;
};

export const modelFormTemplate = (aiModels: string[]): string => {
  return /*html*/ `
    <label class="model-label" for="ai-models">OpenAI Model</label>
    <input class="model-input" list="ai-models" placeholder="Start typing..." name="model">
    <datalist id="ai-models">
      ${aiModels
        .map(
          (name) =>
            /*html*/
            `<option value=${name}>${renderModelOption(name)}</option>`
        )
        .join("")}
    </datalist>
    <div class="footnote model-footnote">The model <b>"gpt-3.5-turbo"</b> is used by default because it is significantly less expensive. Also, more time has been invested optimizing the turbo prompts.</div>
`;
};

export const kFormTemplate = (k: number): string => {
  return /* html */ `
    <label class="k-label" for="k-select">Top "k"</label>
    <select class="k-input" id="k-select" name="k">
      ${Array(k)
        .fill(null)
        .map(
          (_, index) => /* html */ `
        <option value=${index + 1}>${index + 1}</option>
      `
        )
        .join("")}
    </select>
    <div class="footnote k-footnote">The number of similar product categories that should be retrieved from the vector space. The top "k" similar product cateogories will be inserted into the query to an OpenAI chat or instruction model (selected above) in order to decide the best among them. If you think OpenAI embeddings should be sufficient without querying OpenAI again, this time through a chat/instruction model, then set "k" to 1, which will result in the chat with OpenAI being skipped altogether since there is nothing to chat about.</div>
  `;
};

export const resultsHeaderTemplate = (url: string) => /*html*/ `
  <h1>Loading URL</h1>
  <div>${url}</div>
`;

export const resultsHeaderTemplateText = (text: string) => /*html*/ `
  <h1>Text</h1>
  <div>${text}</div>
`;

export const scrapedMetaTagsTemplate = (metaTags: string) => /*html*/ `
  <h1>Scraped Meta Tags</h1>
  <pre><code>${escapeHtml(metaTags)}</code></pre>
`;

export const errorTemplate = (error: string) => /*html*/ `
  <h1>Error</h1>
  <div>${error}</div>
`;

export const openAiTemplate = ({
  model,
  temperature,
  words,
  tokens,
  transcript,
}: {
  model: string;
  temperature: number;
  words: number;
  tokens: number;
  transcript: Chat[];
}) => /*html*/ `
  <h1>OpenAI Log</h1>
  <h2>Stats</h2>
  <table>
    <thead>
      <tr>
        <td>Model</td>
        <td>Temperature</td>
        <td>Words</td>
        <td>Tokens</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${model}</td>
        <td>${temperature}</td>
        <td>${words}</td>
        <td>${tokens}</td>
      </tr>
    </tbody>
  </table>
  ${
    transcript.length
      ? /*html*/ `
      <h2>Trascript (Verbatum)</h2>
      ${templateTrascript(transcript)}
      ` /*html*/
      : `
      <h2>Trascript (Verbatum)</h2>
      <p>None</p>
      `
  }
`;

export const noCategoryFound = ({
  model,
  temperature,
  tokens,
  words,
  transcript,
}: {
  model: string;
  temperature: number;
  tokens: number;
  words: number;
  transcript: { prompt: string; response: string }[];
}) => /* html */ `
  <h1>No Product Category Found</h1>
  <p>Did the URL not include a reference to a product? If so, this is the answer we want! If not, was the scraped metadata off? Please slack @jmilgrom with what you found. Thank you!</p>
  ${openAiTemplate({
    model,
    temperature,
    tokens,
    words,
    transcript,
  })}
`;

export const topKTemplate = ({ top, k }: { k: number; top: { category: string; score: number }[] }) => `
  <h1>k-Nearest Neighbor Search</h1>
  <table>
    <thead>
      <tr>
        <td>Top k=${k}</td>
        <td>Category</td>
      </tr>
    </thead>
    <tbody>
    ${top
      .map(
        ({ category, score }) => /*html*/ `
      <tr>
        <td>${score}</td>
        <td>${category}</td>
      </tr>
  `
      )
      .join("")}
    </tbody>
  </table>
`;

export const categoryResult = ({
  queryParamDelimiter,
  categories,
}: {
  categories: string[];
  queryParamDelimiter: string;
}) => /* html */ `
<h1>Result</h1>
<div>
  ${cookieTrailTemplate(ROUTES.TRAVERSE.url, categories, { delimiter: queryParamDelimiter })}
</div>
`;

export const categoryResultWithChatTemplate = ({
  model,
  temperature,
  tokens,
  words,
  transcript,
  queryParamDelimiter,
  categories,
}: {
  model: string;
  temperature: number;
  tokens: number;
  words: number;
  transcript: { prompt: string; response: string }[];
  categories: string[];
  queryParamDelimiter: string;
}) => /* html */ `
  ${categoryResult({ categories, queryParamDelimiter })}
  ${openAiTemplate({
    model,
    temperature,
    tokens,
    words,
    transcript,
  })}
`;

export const errorPurgingPath = ({
  model,
  temperature,
  tokens,
  words,
  transcript,
  categories,
}: {
  model: string;
  temperature: number;
  tokens: number;
  words: number;
  transcript: { prompt: string; response: string }[];
  categories: string[];
}): string => /*html*/ `
  <h1>Error Purging Product Categories</h1>
  <div>Purged path: "${categories.join(" > ")}"</div>
  ${openAiTemplate({
    model,
    temperature,
    tokens,
    words,
    transcript,
  })}
`;

export const graphTraversalForm = ({
  route,
  models,
  source,
}: {
  route: string;
  models: string[];
  source: "url" | "text";
}): string =>
  htmlTemplate(
    homeTemplate(/* html */ `
    <h1>Find the Google Product Categories</h1>
    ${formTemplate(route, sourceFormTemplate(source, route) + modelFormTemplate(models))}
  `)
  );

export const vectorSearchForm = ({
  route,
  models,
  source,
}: {
  route: string;
  models: string[];
  source: "url" | "text";
}): string =>
  htmlTemplate(
    homeTemplate(/* html */ `
  <header>
    <h1>Find the Google Product Categories</h1>
    <p>The Google Product Categories Taxonomy <a href="https://github.sc-corp.net/jmilgrom/google-product-types/blob/main/src/scripts/langchain/populateOpenAiPineconeStore.ts">has been embedded</a> in a vector space using OpenAI's <a href="https://openai.com/blog/new-and-improved-embedding-model">embedding API</a> and stored in a <a href="https://www.pinecone.io/">Pinecone</a> index.</p>
  </header>
  ${formTemplate(route, sourceFormTemplate(source, route) + modelFormTemplate(models) + kFormTemplate(10))}
`)
  );
