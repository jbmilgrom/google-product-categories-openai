"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidHttpUrl = void 0;
const isValidHttpUrl = (s) => {
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};
exports.isValidHttpUrl = isValidHttpUrl;
