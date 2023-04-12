import { parse } from "node-html-parser";

export const getMetaTags = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const html = await response.text();
  const root = parse(html);
  const metaTags = root.querySelectorAll("meta");
  return metaTags.map((e) => e.toString()).join("\n");
};
