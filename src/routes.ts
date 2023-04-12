export const ROUTES = {
  TEXT: "/text",
  INTERNAL_REPRESENTATION: "/internal-representation.json",
  MAX_DEPTH: "/max-depth",
  MAX_DEGREE: "/max-degree",
  TRAVERSE: "/traverse",
  URL: "/url",
} as const;

export type RouteKeys = Array<keyof typeof ROUTES>;
