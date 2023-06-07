import { appendFile } from "fs/promises";
import { ChatCompletionRequestMessage } from "openai";

export const writeTranscript = (transcript: {
  input: ChatCompletionRequestMessage[];
  ideal: string;
}): Promise<void> => {
  console.log("Appending File");
  return appendFile(
    "/Users/jmilgrom/Snapchat/Dev/hack/evals/evals/registry/data/web_page_metadata/transcript.json",
    JSON.stringify(transcript)
  )
    .then(() => {
      console.log("Append File Successful.");
    })
    .catch((e) => {
      console.log("Error appending file: ", e);
      throw e;
    });
};
