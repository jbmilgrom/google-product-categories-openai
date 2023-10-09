"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetaTags = void 0;
const jsdom_1 = require("jsdom");
const timeoutPromise_1 = require("../../utils/timeoutPromise");
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
const getMetaTags = (url) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const response = yield (0, timeoutPromise_1.timeoutPromise)(fetch(url), {
      errorMessage: `Advertiser Server Capitulated (${url})`,
      milliseconds: 10000 /* 10 seconds */,
    });
    const html = yield response.text();
    const { window } = new jsdom_1.JSDOM(html);
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
  });
exports.getMetaTags = getMetaTags;
