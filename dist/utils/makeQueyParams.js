"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeQueryParams = void 0;
const makeQueryParams = (params, delimiter = ",") => params.map(encodeURIComponent).join(delimiter);
exports.makeQueryParams = makeQueryParams;
