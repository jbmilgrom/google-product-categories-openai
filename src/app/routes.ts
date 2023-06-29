const URL_PATH = "/url";

export const ROUTES = {
  TEXT: { url: "/text", description: "Text File" },
  INTERNAL_REPRESENTATION: {
    url: "/internal-representation.json",
    description: "JSON (Internal Representation)",
  },
  GPC_STATS: { url: "/gpc-stats", description: "Stats" },
  SEARCH: { url: "/search", description: "Search" },
  TRAVERSE: { url: "/traverse", description: "Explore" },
  URL: {
    url: URL_PATH,
    description: "Categorize a URL using Google Product Categories",
    ROUTES: {
      GRAPH_TRAVERSAL: { url: `${URL_PATH}/graph-traversal`, description: "Graph Traversal of GPC Taxonomy" },
      VECTOR_SEARCH: { url: `${URL_PATH}/vector-search`, description: "Embed GPC and Perform Vector Search" },
    },
  },
} as const;
