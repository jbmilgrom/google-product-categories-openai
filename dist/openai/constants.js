"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL =
  exports.DEFAULT_TEMP =
  exports.inList =
  exports.ChatModels =
  exports.CHAT_MODELS =
  exports.FUNCTION_CALL_MODELS =
  exports.INSTRUCTION_MODELS =
  exports.CHAT_COMPLETION_MODELS =
  exports.ADA_002_EMBEDDING_MODEL =
  exports.OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION =
    void 0;
/**
 * For model text-embedding-ada-002
 *
 * @see https://openai.com/blog/new-and-improved-embedding-model
 * */
exports.OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION = 1536;
exports.ADA_002_EMBEDDING_MODEL = "text-embedding-ada-002";
/**
 * The "list all models" endpoint does not include information about type
 * so we have to do our own filtering/understanding using these hard-coded lists
 *
 * @see https://platform.openai.com/docs/models/model-endpoint-compatibility
 */
exports.CHAT_COMPLETION_MODELS = [
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-16k",
];
exports.INSTRUCTION_MODELS = [
  "text-davinci-003",
  "text-davinci-002",
  "text-curie-001",
  "text-babbage-001",
  "text-ada-001",
];
exports.FUNCTION_CALL_MODELS = ["gpt-3.5-turbo-0613", "gpt-4-0613"];
exports.CHAT_MODELS = [...exports.CHAT_COMPLETION_MODELS, ...exports.FUNCTION_CALL_MODELS];
exports.ChatModels = new Set(exports.CHAT_MODELS);
function inList(list, s) {
  return list.includes(s);
}
exports.inList = inList;
exports.DEFAULT_TEMP = 0.0;
exports.DEFAULT_MODEL = "gpt-3.5-turbo";
