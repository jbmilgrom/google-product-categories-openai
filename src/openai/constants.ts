/**
 * For model text-embedding-ada-002
 *
 * @see https://openai.com/blog/new-and-improved-embedding-model
 * */
export const OPEN_AI_TEXT_EMBEDDING_ADA_002_DIMENSION = 1536;
export const ADA_002_EMBEDDING_MODEL = "text-embedding-ada-002";

/**
 * The "list all models" endpoint does not include information about type
 * so we have to do our own filtering/understanding using these hard-coded lists
 *
 * @see https://platform.openai.com/docs/models/model-endpoint-compatibility
 */
export const CHAT_COMPLETION_MODELS = [
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0301",
] as const;
export type ChatCompletionModel = (typeof CHAT_COMPLETION_MODELS)[number];
export const INSTRUCTION_MODELS = [
  "text-davinci-003",
  "text-davinci-002",
  "text-curie-001",
  "text-babbage-001",
  "text-ada-001",
] as const;
export type CompletionModel = (typeof INSTRUCTION_MODELS)[number];
export const CHAT_AND_COMPlETION_MODELS = [...CHAT_COMPLETION_MODELS, ...INSTRUCTION_MODELS] as const;
export type ChatOrCompletionModel = (typeof CHAT_AND_COMPlETION_MODELS)[number];
export const chatOrCompletionModel = new Set(CHAT_AND_COMPlETION_MODELS);
export function inList<T extends string>(list: Readonly<T[]>, s: string): s is T {
  return list.includes(s as T);
}
