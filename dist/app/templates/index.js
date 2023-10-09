"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorSearchForm =
  exports.graphTraversalForm =
  exports.errorPurgingPath =
  exports.categoryResultWithChatTemplate =
  exports.categoryResult =
  exports.topKTemplate =
  exports.noCategoryFound =
  exports.openAiTemplate =
  exports.errorTemplate =
  exports.scrapedMetaTagsTemplate =
  exports.resultsHeaderTemplateText =
  exports.resultsHeaderTemplate =
  exports.kFormTemplate =
  exports.modelFormTemplate =
  exports.sourceFormTemplate =
  exports.formTemplate =
  exports.templateTrascript =
  exports.cookieTrailTemplate =
  exports.linkTemplate =
  exports.routeList =
  exports.footerTemplate =
  exports.homeTemplate =
  exports.htmlTemplate =
    void 0;
const openai_1 = require("../../openai");
const constants_1 = require("../../openai/constants");
const assertUnreachable_1 = require("../../utils/assertUnreachable");
const escapeHtml_1 = require("../../utils/escapeHtml");
const makeQueyParams_1 = require("../../utils/makeQueyParams");
const routes_1 = require("../routes");
const htmlTemplate = (children) => {
  return /*html*/ `
  <html>
    <head>
      <style>
        body {
          padding: 1em 1em 4em 1em;
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

        pre {
          overflow-x: auto;
          border: 1px solid #ccc;      
          padding: 1em;  
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

        table {
          empty-cells: show;
        }

        td {
          padding: .5em 1em;
        }

        thead {
          font-weight: bold;
        }

        hr {
          margin-top: 2em;
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
exports.htmlTemplate = htmlTemplate;
const homeTemplate = (children) => {
  return /*html*/ `
    <div>
      <a href="/">Home</a>
    <div>
    ${children}
    ${(0, exports.footerTemplate)()}
  `;
};
exports.homeTemplate = homeTemplate;
const footerTemplate = () => {
  return /*html*/ `
    <footer>
      <p><a href="https://github.com/jbmilgrom/google-product-categories-openai">Code</a> |  Powered by <a href="https://openai.com/product">OpenAI</a>.</p> 
    </footer>
  `;
};
exports.footerTemplate = footerTemplate;
const routeList = (routes) => {
  return Object.keys(routes)
    .map((k) => `<li><a href=${routes[k].url}>${routes[k].description}</a></li>`)
    .join("");
};
exports.routeList = routeList;
const linkTemplate = (base, path, { delimiter } = {}) => {
  const queryParams = (0, makeQueyParams_1.makeQueryParams)(path, delimiter);
  return /*html*/ `<a href=${`${base}?path=${queryParams}`}>${path[path.length - 1]}</a>`;
};
exports.linkTemplate = linkTemplate;
const cookieTrailTemplate = (base, categories, { delimiter } = {}) => {
  return categories
    .map((_, i) => {
      const path = categories.slice(0, i + 1);
      return (0, exports.linkTemplate)(base, path, { delimiter });
    })
    .join(" > ");
};
exports.cookieTrailTemplate = cookieTrailTemplate;
const templateTrascript = (transcript) => {
  const template = ({ prompt, response }, index) => /*html*/ `
    <h3>Query #${index + 1}</h3>
    <h4>Prompt</h4>
    <pre><code>${(0, escapeHtml_1.escapeHtml)(prompt)}</code></pre>
    <h4>OpenAI</h4>
    <pre><code>${response}</code></pre>
  `;
  return transcript.map(template).join("");
};
exports.templateTrascript = templateTrascript;
const formTemplate = (postUrl, children) => {
  return /* html */ `
    <form action=${postUrl} method="post" class="url-form">
      ${children}
      <input class="submit-button" type="submit" value="Submit">
    </form>
  `;
};
exports.formTemplate = formTemplate;
const sourceFormTemplate = (source, path) => {
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
      return (0, assertUnreachable_1.assertUnreachable)(source);
  }
};
exports.sourceFormTemplate = sourceFormTemplate;
const renderModelOption = (model) => {
  if ((0, openai_1.inList)(constants_1.FUNCTION_CALL_MODELS, model)) {
    return "Chat Model with Function Calling";
  }
  if ((0, openai_1.inList)(constants_1.CHAT_COMPLETION_MODELS, model)) {
    return "Chat Model";
  }
  if ((0, openai_1.inList)(constants_1.INSTRUCTION_MODELS, model)) {
    return "Instruction Model";
  }
  return model;
};
const modelFormTemplate = (aiModels) => {
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
exports.modelFormTemplate = modelFormTemplate;
const kFormTemplate = (k) => {
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
exports.kFormTemplate = kFormTemplate;
const resultsHeaderTemplate = (url) => /*html*/ `
  <h1>Loading URL</h1>
  <div>${url}</div>
`;
exports.resultsHeaderTemplate = resultsHeaderTemplate;
const resultsHeaderTemplateText = (text) => /*html*/ `
  <h1>Text</h1>
  <div>${text}</div>
`;
exports.resultsHeaderTemplateText = resultsHeaderTemplateText;
const scrapedMetaTagsTemplate = (metaTags) => /*html*/ `
  <h1>Scraped Meta Tags</h1>
  <pre><code>${(0, escapeHtml_1.escapeHtml)(metaTags)}</code></pre>
`;
exports.scrapedMetaTagsTemplate = scrapedMetaTagsTemplate;
const errorTemplate = (error) => /*html*/ `
  <h1>Error</h1>
  <div>${error}</div>
`;
exports.errorTemplate = errorTemplate;
const openAiTemplate = ({ model, temperature, words, tokens, transcript }) => /*html*/ `
  <h1>OpenAI Chat Log</h1>
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
      ${(0, exports.templateTrascript)(transcript)}
      ` /*html*/
      : `
      <h2>Trascript (Verbatum)</h2>
      <p>None</p>
      `
  }
`;
exports.openAiTemplate = openAiTemplate;
const noCategoryFound = ({ model, temperature, tokens, words, transcript }) => /* html */ `
  <h1>No Product Category Found</h1>
  <p>Did the URL not include a reference to a product? If so, this is the answer we want! If not, was the scraped metadata off? Please slack @jmilgrom with what you found. Thank you!</p>
  ${(0, exports.openAiTemplate)({
    model,
    temperature,
    tokens,
    words,
    transcript,
  })}
`;
exports.noCategoryFound = noCategoryFound;
const topKTemplate = ({ top, k }) => `
  <h1>k-Nearest Neighbor Search</h1>
  <table>
    <thead>
      <tr>
        <td>k</td>
        <td>Cosine Similarity</td>
        <td>Category</td>
      </tr>
    </thead>
    <tbody>
    ${top
      .map(
        ({ category, score }, i) => /*html*/ `
      <tr>
        <td>${i + 1}</td>
        <td>${score}</td>
        <td>${category}</td>
      </tr>
  `
      )
      .join("")}
    </tbody>
  </table>
`;
exports.topKTemplate = topKTemplate;
const categoryResult = ({ queryParamDelimiter, categories }) => /* html */ `
<h1>Result</h1>
<div>
  ${(0, exports.cookieTrailTemplate)(routes_1.ROUTES.TRAVERSE.url, categories, { delimiter: queryParamDelimiter })}
</div>
`;
exports.categoryResult = categoryResult;
const categoryResultWithChatTemplate = ({
  model,
  temperature,
  tokens,
  words,
  transcript,
  queryParamDelimiter,
  categories,
}) => /* html */ `
  ${(0, exports.categoryResult)({ categories, queryParamDelimiter })}
  <hr>
  ${(0, exports.openAiTemplate)({
    model,
    temperature,
    tokens,
    words,
    transcript,
  })}
`;
exports.categoryResultWithChatTemplate = categoryResultWithChatTemplate;
const errorPurgingPath = ({ model, temperature, tokens, words, transcript, categories }) => /*html*/ `
  <h1>Error Purging Product Categories</h1>
  <div>Purged path: "${categories.join(" > ")}"</div>
  ${(0, exports.openAiTemplate)({
    model,
    temperature,
    tokens,
    words,
    transcript,
  })}
`;
exports.errorPurgingPath = errorPurgingPath;
const graphTraversalForm = ({ route, models, source }) =>
  (0, exports.htmlTemplate)(
    (0, exports.homeTemplate)(/* html */ `
    <h1>Find the Google Product Categories</h1>
    ${(0, exports.formTemplate)(
      route,
      (0, exports.sourceFormTemplate)(source, route) + (0, exports.modelFormTemplate)(models)
    )}
  `)
  );
exports.graphTraversalForm = graphTraversalForm;
const vectorSearchForm = ({ route, models, source }) =>
  (0, exports.htmlTemplate)(
    (0, exports.homeTemplate)(/* html */ `
  <header>
    <h1>Find the Google Product Categories</h1>
    <p>The Google Product Categories Taxonomy <a href="https://github.com/jbmilgrom/google-product-categories-openai/blob/main/src/scripts/langchain/populateOpenAiPineconeStore.ts">has been embedded</a> in a vector space using OpenAI's <a href="https://openai.com/blog/new-and-improved-embedding-model">embedding API</a> and stored in a <a href="https://www.pinecone.io/">Pinecone</a> index.</p>
  </header>
  ${(0, exports.formTemplate)(
    route,
    (0, exports.sourceFormTemplate)(source, route) +
      (0, exports.modelFormTemplate)(models) +
      (0, exports.kFormTemplate)(10)
  )}
`)
  );
exports.vectorSearchForm = vectorSearchForm;
