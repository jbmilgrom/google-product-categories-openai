import fs from "fs";
import { Parser, parse } from "csv-parse";
import { chatOpenaiEmbeddings } from "../chatOpenaiEmbeddings";
import { getGoogleProductCategoriesTaxonomy } from "../googleProducts";
import { Queue, Vertices } from "../utils/tree";
import { assertUnreachable } from "../utils/assertUnreachable";
import { ADA_002_EMBEDDING_MODEL } from "../openai";
import { escapeCsvCell } from "../utils/escapeCsv";

const RESOURCE_DIR = "resources";
const GOLDEN_SET_BENCHMARK = "google_category_label_set_ad_3_5.csv";

const readCSV = (filePath: string): Parser => {
  return fs.createReadStream(filePath).pipe(
    parse({
      /* CSV options */
    })
  );
};

const COLUMNS = [
  "url",
  "openai_response",
  "gpc",
  "sim",
  "gcc",
  "sim",
  "html",
  "version",
  "gpc_result",
  "gcc_result",
  "gpc_quality",
  "gcc_quality",
  "html content",
  "Comment",
] as const;
const KEEP = ["url", "html", "gpc_result", "gpc_quality", "html content"] as const;
const KEEP_COLUMNS = KEEP.reduce((res, name) => {
  const index = COLUMNS.findIndex((n) => n === name);
  if (index < 0) {
    throw new Error("KEEP list should reference names in COLUMNS");
  }
  return { ...res, name: index };
}, {} as { [key in (typeof KEEP)[number]]: number });

console.log("Keeping:", KEEP_COLUMNS);

type Accuracy = "accurate" | "inaccurate";
type Precision = "correct" | "relevant" | "irrelevant";
type HumanAuditNeeded = "Needs a Human Audit";
type NoCategoryFound = "NoCategoryFound";

type PreviousModelSchema = {
  url: string;
  openaiResponse: string;
  gpc: string;
  gpcSim: string;
  gcc: string;
  gccSim: string;
  html: string;
  version: string;
  gpcResult: string;
  gccResult: string;
  gpcQuality: Precision;
  gccQuality: Precision;
  htmlContent: Accuracy;
  comment: string;
};

const parsePrevious = ([
  url,
  openaiResponse,
  gpc,
  gpcSim,
  gcc,
  gccSim,
  html,
  version,
  gpcResult,
  gccResult,
  gpcQuality,
  gccQuality,
  htmlContent,
  comment,
]: [
  PreviousModelSchema["url"],
  PreviousModelSchema["openaiResponse"],
  PreviousModelSchema["gpc"],
  PreviousModelSchema["gpcSim"],
  PreviousModelSchema["gcc"],
  PreviousModelSchema["gccSim"],
  PreviousModelSchema["html"],
  PreviousModelSchema["version"],
  PreviousModelSchema["gpcResult"],
  PreviousModelSchema["gccResult"],
  PreviousModelSchema["gpcQuality"],
  PreviousModelSchema["gccQuality"],
  PreviousModelSchema["htmlContent"],
  PreviousModelSchema["comment"]
]): PreviousModelSchema => ({
  url,
  openaiResponse,
  gpc,
  gpcSim,
  gcc,
  gccSim,
  html,
  version,
  gpcResult,
  gccResult,
  gpcQuality,
  gccQuality,
  htmlContent,
  comment,
});

type Schema = {
  url: string;
  html: string;
  embeddingModel: string;
  chatModel: string;
  openaiResponse: { prompt: string; response: string }[];
  gpc: string | null;
  previousGpc: string;
  k: number;
  topKWithScore: { category: string; score: number }[];
  humanGpc: string;
  gpcQuality: Precision | NoCategoryFound | HumanAuditNeeded;
  htmlQuality: Accuracy;
  previousGpcQuality: Precision;
  change: 1 | 0 | -1 | HumanAuditNeeded;
};

const HEADER = [
  "url",
  "html",
  "embedding_model",
  "chat_model",
  "openai_response",
  "human_gpc",
  "previous_gpc",
  "gpc",
  "k",
  "top_k_scores",
  "avg_of_top_k_scores",
  "top_k",
  "gpc_quality",
  "html_quality",
  "previous_qpc_quality",
  "change",
] as const;

type Row = ReturnType<typeof toRow>;

const toRow = ({
  url,
  html,
  embeddingModel,
  chatModel,
  openaiResponse,
  humanGpc,
  previousGpc,
  gpc,
  k,
  topKWithScore,
  gpcQuality,
  htmlQuality,
  previousGpcQuality,
  change,
}: Schema) =>
  [
    escapeCsvCell(url),
    escapeCsvCell(html),
    embeddingModel,
    chatModel,
    escapeCsvCell(
      openaiResponse.map(({ prompt, response }) => `"prompt: ${prompt} \n\nresponse: ${response}"`).join("\n")
    ),
    escapeCsvCell(humanGpc),
    escapeCsvCell(previousGpc),
    escapeCsvCell(gpc === null ? "None" : gpc),
    k.toString(),
    escapeCsvCell(topKWithScore.map(({ category: _, score }) => score).join("\n")),
    escapeCsvCell(
      (topKWithScore.reduce((sum, { category: _, score }) => sum + score, 0) / topKWithScore.length).toString()
    ),
    escapeCsvCell(topKWithScore.map(({ category }) => category).join("\n")),
    gpcQuality,
    htmlQuality,
    previousGpcQuality,
    change,
  ] as const;

const createRow = (
  { htmlMetadata, url }: { htmlMetadata: string; url: string },
  previous: { gpc: string; humanGpc: string; gpcQuality: Precision; htmlQuality: Accuracy },
  embedding: {
    gpc: Queue<string> | null;
    model: string;
    chatModel: string;
    k: number;
    topKWithScore: { category: string; score: number }[];
    transcript: Queue<{ prompt: string; response: string }>;
  }
): Row => {
  const base = {
    url,
    html: htmlMetadata,
    embeddingModel: embedding.model,
    chatModel: embedding.chatModel,
    openaiResponse: embedding.transcript.toList(),
    previousGpc: previous.gpc,
    k: embedding.k,
    topKWithScore: embedding.topKWithScore,
    humanGpc: previous.humanGpc,
    htmlQuality: previous.htmlQuality,
    previousGpcQuality: previous.gpcQuality,
  } as const;

  if (!embedding.gpc) {
    return toRow({
      ...base,
      gpc: null,
      gpcQuality: "NoCategoryFound",
      change: -1,
    });
  }

  const gpc = embedding.gpc.toList().join(" > ");
  const sameAsPreviousModel = gpc === previous.gpc;
  const sameAsHumanLabel = gpc === previous.humanGpc;

  if (sameAsHumanLabel) {
    return toRow({
      ...base,
      gpc,
      gpcQuality: "correct",
      change: sameAsPreviousModel ? 0 : 1,
    });
  }

  /**
   * !sameAsHumanLabel
   */

  return toRow({
    ...base,
    gpc,
    gpcQuality: sameAsPreviousModel ? previous.gpcQuality : "Needs a Human Audit",
    change: sameAsPreviousModel ? 0 : "Needs a Human Audit",
  });
};

const testId = new Date().getTime();

(async () => {
  let nodes: Vertices<string>;
  try {
    console.log("Parsing google product categories into tree...");
    nodes = await getGoogleProductCategoriesTaxonomy();
  } catch (e) {
    console.log("Error parsing google product categories", e);
    return;
  }

  const parser = readCSV(`${__dirname}/${RESOURCE_DIR}/tester.csv`);

  const writer = fs.createWriteStream(`${__dirname}/${RESOURCE_DIR}/test_${testId}.csv`);

  writer.write(HEADER.join(", "));
  writer.write("\n");

  for await (const result of parser) {
    const previous = parsePrevious(result);

    try {
      const { type, categories, metadata } = await chatOpenaiEmbeddings(nodes, previous.html, { k: 5 });

      switch (type) {
        case "success": {
          const row = createRow(
            { url: previous.url, htmlMetadata: previous.html },
            {
              gpc: previous.gpc,
              humanGpc: previous.gpcResult,
              gpcQuality: previous.gpcQuality,
              htmlQuality: previous.htmlContent,
            },
            {
              gpc: categories,
              model: ADA_002_EMBEDDING_MODEL,
              chatModel: metadata.model,
              k: metadata.similaritySearch.k,
              topKWithScore: metadata.similaritySearch.top,
              transcript: metadata.transcript,
            }
          );

          writer.write(row.join(","));
          writer.write("\n");
          continue;
        }
        case "error:NoCategoryFound": {
          const row = createRow(
            { url: previous.url, htmlMetadata: previous.html },
            {
              gpc: previous.gpc,
              humanGpc: previous.gpcResult,
              gpcQuality: previous.gpcQuality,
              htmlQuality: previous.htmlContent,
            },
            {
              gpc: null,
              model: ADA_002_EMBEDDING_MODEL,
              chatModel: metadata.model,
              k: metadata.similaritySearch.k,
              topKWithScore: metadata.similaritySearch.top,
              transcript: metadata.transcript,
            }
          );

          writer.write(row.join(","));
          writer.write("\n");
          continue;
        }
        default:
          return assertUnreachable(type);
      }
    } catch (e) {
      console.log("Something went wrong.", e);
    }
  }
  console.log("Done");
})();
