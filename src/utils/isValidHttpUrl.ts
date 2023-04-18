export const isValidHttpUrl = (s?: string): boolean => {
  if (!s) return false;
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};
