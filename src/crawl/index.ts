import { JSDOM } from "jsdom";

/**
 * For speed, switch to below. I originally switched away from the below to JSDOM
 * because of some parsing failures, but JSDOM appears to have the same issues thus far.
 *
 *  import { parse } from "node-html-parser";
 *
 *  const root = parse(html);
 *  const metaTags = root.querySelectorAll("meta");
 *  const body = root.querySelector("body");
 *  const metaNested = body?.querySelectorAll("meta");
 *  return metaTags.map((e) => e.toString()).join("\n");
 *
 * @param url
 * @returns
 */
export const getMetaTags = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const html = await response.text();
  const { window } = new JSDOM(html);
  const metaTags = window.document.querySelectorAll("meta");
  return Array.from(metaTags)
    .map((tag) => tag.outerHTML)
    .join("\n");
};
