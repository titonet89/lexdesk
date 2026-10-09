/** Formato habitual del número de expediente: "Expte. N.º 1024/2026". */
export function formatFileNumber(fileNumber: string | null, fileYear: number | null): string | null {
  if (!fileNumber) return fileYear ? `Expte. año ${fileYear}` : null;
  const hasYear = /\/\s*\d{2,4}$/.test(fileNumber);
  return `Expte. N.º ${fileNumber}${fileYear && !hasYear ? `/${fileYear}` : ""}`;
}
