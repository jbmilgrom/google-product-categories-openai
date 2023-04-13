import { escapeHtml } from "../utils/escapeHtml";
import { makeQueryParams } from "../utils/makeQueyParams";
import { Queue } from "../utils/tree";

type Transcript = { prompt: string; response: string };

export const pathLinkCookieTailTemplate = (
  base: string,
  path: string[],
  { delimiter }: { delimiter?: string } = {}
) => {
  if (path.length === 0) {
    return `<a href=${base}>Root Nodes</a>`;
  }
  const queryParams = makeQueryParams(path, delimiter);
  return /*html*/ `<a href=${`${base}?path=${queryParams}`}>${path[path.length - 1]}</a>`;
};

export const templateTrascript = (transcript: Queue<Transcript>): string => {
  const template = ({ prompt, response }: Transcript) => /*html*/ `
    <p>  
      <span><b>prompt: </b></span>
      <code><pre>${escapeHtml(prompt)}</pre><code>
      <span><b>openai: </b></span>
      <code><pre>${response}</pre><code>
    </p>
  `;
  return transcript.toList().map(template).join("");
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
  <p>Use the model <b>"text-davinci-003"</b> for best results it appears.</p>
`;
};
