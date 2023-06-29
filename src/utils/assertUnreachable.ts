export const assertUnreachable = (x: never): never => {
  throw new Error("Did not expect to get here.");
};
