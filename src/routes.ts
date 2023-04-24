export const ROUTES = {
  TEXT: { url: "/text", description: "Text File" },
  INTERNAL_REPRESENTATION: {
    url: "/internal-representation.json",
    description: "JSON (Intenral Representation)",
  },
  MAX_DEPTH: { url: "/max-depth", description: "Calculate Max Depth" },
  MAX_DEGREE: { url: "/max-degree", description: "Calculate Max Degree" },
  SEARCH: { url: "/search", description: "Search (Substring Matching Only)" },
  TRAVERSE: { url: "/traverse", description: "Explore" },
  URL: { url: "/url", description: "Categorize a URL using Google Product Categories" },
} as const;

export type RouteKeys = Array<keyof typeof ROUTES>;
