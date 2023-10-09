"use strict";
/**
 * Numbies are lists of numbers in highest -> lowest order.
 * I dunno, made up the term.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.range = exports.avg = void 0;
const sum = (numbies) => {
  return numbies.reduce((sum, next) => sum + next, 0);
};
const avg = (numbies) => {
  return sum(numbies) / numbies.length;
};
exports.avg = avg;
const range = (numbies) => {
  return numbies[0] - numbies[numbies.length - 1];
};
exports.range = range;
