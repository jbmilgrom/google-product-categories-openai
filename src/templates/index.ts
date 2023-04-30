import { escapeHtml } from "../utils/escapeHtml";
import { makeQueryParams } from "../utils/makeQueyParams";

type Chat = { prompt: string; response: string };

export const htmlTemplate = (children?: string): string => {
  return /*html*/ `
  <html>
    <head>
      <style>
        body {
          color: #353740;
        }

        footer {
          font-family: "ColfaxAI", Helvetica, sans-serif;
          position: fixed;
          left: 0;
          bottom: 0;
          width: 100%;
          text-align: center;
          background-color: white;
          color: #aaa;       
        }

        footer a:visited {
          color: inherit
        }

        footer a:hover {
          color: #353740;
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
  `;
};

export const footerTemplate = () => {
  return /*html*/ `
    <footer>
      <p><a href="https://github.com/jbmilgrom/google-product-categories-openai">Code</a> |  Powered by <a href="https://openai.com/product">OpenAI</a> © 2023 <a href="https://softwarefordays.com/">Jonathan Milgrom</a>. All rights reserved.</p> 
    </footer>
  `;
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

export const urlFormTemplate = (url: string, aiModels: string[]): string => {
  return /*html*/ `
  <h1>Find the Google Product Categories</h1>
  <form action=${url} method="post">
    <label for="url">URL:</label>
    <input type="url" name="url" id="url"
          placeholder="https://example.com"
          pattern="https?://.*" 
          required>
    <label for="ai-models">OpenAI Model:</label>
    <input list="ai-models" placeholder="Start typing..." name="model">
    <datalist id="ai-models">
      ${aiModels
        .map(
          (name) =>
            /*html*/
            `<option >${name}</option>`
        )
        .join("")}
    </datalist>
    <input type="submit" value="Submit">
  </form>
  <p>Only submit the form <b>once</b> to avoid multiple submissions. It will take a moment!</p>
  <p>The model <b>"gpt-3.5-turbo"</b> is used by default because it is significantly less expensive. Also, more time has been invested optimizing the turbo prompts.</p>
  ${footerTemplate()}
`;
};

export const resultsHeaderTemplate = (url: string) => /*html*/ `
  <h1>URL</h1>
  <div>${url}</div>
`;

export const scrapedMetaTagsTemplate = (metaTags: string) => /*html*/ `
  <h1>Scraped Meta Tags</h1>
  <pre><code>${escapeHtml(metaTags)}</code></pre>
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
  <h2>Trascript (Verbatum)</h2>
  ${templateTrascript(transcript)}
`;
