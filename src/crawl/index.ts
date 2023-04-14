import { JSDOM } from "jsdom";

class TimeoutError extends Error {}

const timeoutPromise = async <T>(
  promise: Promise<T>,
  { errorMessage, milliseconds }: { errorMessage: string; milliseconds: number }
): Promise<T> => {
  let cancel;

  const timeout = new Promise<T>((_, reject) => {
    cancel = setTimeout(() => {
      reject(new TimeoutError(errorMessage));
    }, milliseconds);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    /**
     * Clear timeout in all cases. When the promise wins, we clear timeout to avoid incorrectly throwing a TimeoutError.
     * When the timeout wins, clearTimeout is a no-op.
     */
    clearTimeout(cancel);
  }
};

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
  const metaTags = window.document.querySelectorAll("meta");
  return Array.from(metaTags)
    .map((tag) => tag.outerHTML)
    .join("\n");
};
