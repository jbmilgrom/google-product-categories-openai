"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUnreachable = void 0;
const assertUnreachable = (x) => {
  throw new Error("Did not expect to get here.");
};
exports.assertUnreachable = assertUnreachable;
