import { escapeHtml } from "../utils/escapeHtml";
import { Queue } from "../utils/tree";

type Transcript = { prompt: string; response: string };

export const templateTrascript = (transcript: Queue<Transcript>): string => {
  const template = ({ prompt, response }: Transcript) => /*html*/ `
    <p>prompt: ${escapeHtml(prompt)}</p>
    <p>openai: ${response}</p>
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
    <input list="ai-models" placeholder="Start typing..." name="model" value="text-davinci-003">
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
