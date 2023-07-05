export function escapeCsvCell(cell: string): string {
  return `"${cell.replace(/"/g, '""')}"`;
}
