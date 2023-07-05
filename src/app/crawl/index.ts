import { JSDOM } from "jsdom";
import { timeoutPromise } from "../../utils/timeoutPromise";

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
  const response = await timeoutPromise(fetch(url), {
    errorMessage: `Advertiser Server Capitulated (${url})`,
    milliseconds: 10000 /* 10 seconds */,
  });
  const html = await response.text();
  const { window } = new JSDOM(html);
  const metaTagsDescription = window.document.querySelectorAll("meta[name='description']");
  const metaTagsTitle = window.document.querySelectorAll("meta[name='title']");
  const ogTitle = window.document.querySelectorAll("meta[property='og:title']");
  const ogDescription = window.document.querySelectorAll("meta[property='og:description']");
  return [
    ...Array.from(metaTagsDescription),
    ...Array.from(metaTagsTitle),
    ...Array.from(ogTitle),
    ...Array.from(ogDescription),
  ]
    .map((tag) => tag.outerHTML)
    .join("\n");
};
