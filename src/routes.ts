export const ROUTES = {
  TEXT: { url: "/text", description: "Text File" },
  INTERNAL_REPRESENTATION: {
    url: "/internal-representation.json",
    description: "JSON (Intenral Representation)",
  },
  GPC_STATS: { url: "/gpc-stats", description: "Stats" },
  SEARCH: { url: "/search", description: "Search" },
  TRAVERSE: { url: "/traverse", description: "Explore" },
  URL: { url: "/url", description: "Categorize a URL using Google Product Categories" },
} as const;

export type RouteKeys = Array<keyof typeof ROUTES>;
