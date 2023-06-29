import { escapeHtml } from "../../utils/escapeHtml";
import { makeQueryParams } from "../../utils/makeQueyParams";

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

        form.url-form {
          display: grid;
          width: max(38vw, 400px);
          grid-template-columns: 1fr 2fr;
          grid-auto-rows: minmax(30px, auto);
          gap: 16px;
        }

        form .footnote {
          font-size: .85em;
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

export const urlAndModelFormTemplate = (aiModels: string[]): string => {
  return /*html*/ `
    <label for="url">URL</label>
    <input type="url" name="url" id="url"
          placeholder="https://example.com"
          pattern="https?://.*" 
          required>
    <label for="ai-models">OpenAI Model</label>
    <input list="ai-models" placeholder="Start typing..." name="model">
    <datalist id="ai-models">
      ${aiModels
        .map(
          (name) =>
            /*html*/
            `<option>${name}</option>`
        )
        .join("")}
    </datalist>
    <div></div>
    <div class="footnote">The model <b>"gpt-3.5-turbo"</b> is used by default because it is significantly less expensive. Also, more time has been invested optimizing the turbo prompts.</div>
`;
};

export const kFormTemplate = (k: number): string => {
  return /* html */ `
    <label for="k-select">Top "k"</label>
    <select id="k-select" name="k">
      ${Array(k)
        .fill(null)
        .map(
          (_, index) => /* html */ `
        <option value=${index + 1}>${index + 1}</option>
      `
        )
        .join("")}
    </select>
    <div></div>
    <div class="footnote">The number of similar product categories that should be retrieved from the vector space. The top "k" similar product cateogories will be inserted into the query to an OpenAI chat or instruction model (selected above) in order to decide the best among them. If you think OpenAI embeddings should be sufficient without querying OpenAI again, this time through a chat/instruction model, then set "k" to 1, which will result in the chat with OpenAI being skipped altogether since there is nothing to chat about.</div>
  `;
};

export const resultsHeaderTemplate = (url: string) => /*html*/ `
  <h1>Loading URL</h1>
  <div>${url}</div>
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
  <h1>OpenAI</h1>
  <h2>Model</h2>
  <p>${model}</p>
  <h2>Temperature</h2>
  <p>${temperature}</p>
  <h2>Words Used</h2>
  <p>${words}</p>
  <h2>Tokens Used</h2>
  <p>${tokens}</p>
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
