class TimeoutError extends Error {}

export const timeoutPromise = async <T>(
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
