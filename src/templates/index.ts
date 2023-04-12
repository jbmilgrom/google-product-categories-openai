import { escapeHtml } from "../utils/escapeHtml";
import { Queue } from "../utils/tree";

export const templateTrascript = (transcript: Queue<{ prompt: string; response: string }>) =>
  transcript
    .toList()
    .map(
      ({ prompt, response }) => `
<p>prompt: ${escapeHtml(prompt)}</p>
<p>openai: ${response}</p>
`
    )
    .join("");
