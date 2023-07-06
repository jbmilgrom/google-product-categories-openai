/**
 * Numbies are lists of numbers in highest -> lowest order.
 * I dunno, made up the term.
 */

const sum = (numbies: number[]): number => {
  return numbies.reduce((sum, next) => sum + next, 0);
};

export const avg = (numbies: number[]): number => {
  return sum(numbies) / numbies.length;
};

export const range = (numbies: number[]): number => {
  return numbies[0] - numbies[numbies.length - 1];
};
