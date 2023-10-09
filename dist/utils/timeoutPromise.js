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
exports.timeoutPromise = void 0;
class TimeoutError extends Error {}
const timeoutPromise = (promise, { errorMessage, milliseconds }) =>
  __awaiter(void 0, void 0, void 0, function* () {
    let cancel;
    const timeout = new Promise((_, reject) => {
      cancel = setTimeout(() => {
        reject(new TimeoutError(errorMessage));
      }, milliseconds);
    });
    try {
      return yield Promise.race([promise, timeout]);
    } finally {
      /**
       * Clear timeout in all cases. When the promise wins, we clear timeout to avoid incorrectly throwing a TimeoutError.
       * When the timeout wins, clearTimeout is a no-op.
       */
      clearTimeout(cancel);
    }
  });
exports.timeoutPromise = timeoutPromise;
