"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeCsvCell = void 0;
function escapeCsvCell(cell) {
  return `"${cell.replace(/"/g, '""')}"`;
}
exports.escapeCsvCell = escapeCsvCell;
