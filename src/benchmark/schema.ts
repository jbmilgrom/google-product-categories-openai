import { escapeCsvCell } from "../utils/escapeCsv";
import { avg, range } from "../utils/numby";
import { Queue } from "../utils/tree";
import { Precision } from "./constants";

type Accuracy = "accurate" | "inaccurate";
type HumanAuditNeeded = "Needs a Human Audit";

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

export const parsePrecision = (x?: string): Precision | null => {
  const formatted = x?.trim().toLowerCase();
  switch (formatted) {
    case "correct":
    case "relevant":
    case "irrelevant":
      return formatted;
    default:
      return null;
  }
};

export const parseString = (x?: string): string | null => {
  if (x?.length) {
    return x;
  }
  return null;
};

export const parsePrevious = ([
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
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
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
  gpcQuality: gpcQuality.trim() as Precision,
  gccQuality: gccQuality.trim() as Precision,
  htmlContent: htmlContent.trim() as Accuracy,
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
  gpcQuality: Precision | HumanAuditNeeded | null;
  htmlQuality: Accuracy;
  previousGpcQuality: Precision;
  change: 1 | 0 | -1 | HumanAuditNeeded;
};

export const HEADER = [
  "url",
  "html",
  "html_quality",
  "embedding_model",
  "chat_model",
  "openai_response",
  "human_gpc",
  "previous_gpc",
  "gpc",
  "k",
  "top_k_scores",
  "avg_of_top_k_scores",
  "range_of_top_k_scores",
  "top_k",
  "previous_qpc_quality",
  "gpc_quality",
  "change",
] as const;

export type Row = ReturnType<typeof toRow>;

export const toRow = ({
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
}: Schema): ReadonlyArray<string> => {
  const topKScores = topKWithScore.map(({ score }) => score);
  return [
    escapeCsvCell(url),
    escapeCsvCell(html),
    htmlQuality,
    embeddingModel,
    chatModel,
    escapeCsvCell(
      openaiResponse.map(({ prompt, response }) => `"prompt: ${prompt} \n\nresponse: ${response}"`).join("\n")
    ),
    escapeCsvCell(humanGpc),
    escapeCsvCell(previousGpc),
    escapeCsvCell(gpc === null ? "None" : gpc),
    k.toString(),
    escapeCsvCell(topKScores.join("\n")),
    escapeCsvCell(avg(topKScores).toString()),
    escapeCsvCell(range(topKScores).toString()),
    escapeCsvCell(topKWithScore.map(({ category }) => category).join("\n")),
    previousGpcQuality,
    gpcQuality === null ? "None" : gpcQuality,
    change.toString(),
  ];
};

export const createRowFromPrevious = (
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
      gpcQuality: null,
      change: previous.gpcQuality === "irrelevant" ? 1 : -1,
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
