"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRowFromPrevious =
  exports.toRow =
  exports.HEADER =
  exports.parsePrevious =
  exports.parseString =
  exports.parsePrecision =
    void 0;
const escapeCsv_1 = require("../utils/escapeCsv");
const numby_1 = require("../utils/numby");
const parsePrecision = (x) => {
  const formatted = x === null || x === void 0 ? void 0 : x.trim().toLowerCase();
  switch (formatted) {
    case "correct":
    case "relevant":
    case "irrelevant":
      return formatted;
    default:
      return null;
  }
};
exports.parsePrecision = parsePrecision;
const parseString = (x) => {
  if (x === null || x === void 0 ? void 0 : x.length) {
    return x;
  }
  return null;
};
exports.parseString = parseString;
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
]) => ({
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
  gpcQuality: gpcQuality.trim(),
  gccQuality: gccQuality.trim(),
  htmlContent: htmlContent.trim(),
  comment,
});
exports.parsePrevious = parsePrevious;
exports.HEADER = [
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
];
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
}) => {
  const topKScores = topKWithScore.map(({ score }) => score);
  return [
    (0, escapeCsv_1.escapeCsvCell)(url),
    (0, escapeCsv_1.escapeCsvCell)(html),
    htmlQuality,
    embeddingModel,
    chatModel,
    (0, escapeCsv_1.escapeCsvCell)(
      openaiResponse.map(({ prompt, response }) => `"prompt: ${prompt} \n\nresponse: ${response}"`).join("\n")
    ),
    (0, escapeCsv_1.escapeCsvCell)(humanGpc),
    (0, escapeCsv_1.escapeCsvCell)(previousGpc),
    (0, escapeCsv_1.escapeCsvCell)(gpc === null ? "None" : gpc),
    k.toString(),
    (0, escapeCsv_1.escapeCsvCell)(topKScores.join("\n")),
    (0, escapeCsv_1.escapeCsvCell)((0, numby_1.avg)(topKScores).toString()),
    (0, escapeCsv_1.escapeCsvCell)((0, numby_1.range)(topKScores).toString()),
    (0, escapeCsv_1.escapeCsvCell)(topKWithScore.map(({ category }) => category).join("\n")),
    previousGpcQuality,
    gpcQuality === null ? "None" : gpcQuality,
    change.toString(),
  ];
};
exports.toRow = toRow;
const createRowFromPrevious = ({ htmlMetadata, url }, previous, embedding) => {
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
  };
  if (!embedding.gpc) {
    return (0, exports.toRow)(
      Object.assign(Object.assign({}, base), {
        gpc: null,
        gpcQuality: null,
        change: previous.gpcQuality === "irrelevant" ? 1 : -1,
      })
    );
  }
  const gpc = embedding.gpc.toList().join(" > ");
  const sameAsPreviousModel = gpc === previous.gpc;
  const sameAsHumanLabel = gpc === previous.humanGpc;
  if (sameAsHumanLabel) {
    return (0, exports.toRow)(
      Object.assign(Object.assign({}, base), { gpc, gpcQuality: "correct", change: sameAsPreviousModel ? 0 : 1 })
    );
  }
  /**
   * !sameAsHumanLabel
   */
  return (0, exports.toRow)(
    Object.assign(Object.assign({}, base), {
      gpc,
      gpcQuality: sameAsPreviousModel ? previous.gpcQuality : "Needs a Human Audit",
      change: sameAsPreviousModel ? 0 : "Needs a Human Audit",
    })
  );
};
exports.createRowFromPrevious = createRowFromPrevious;
