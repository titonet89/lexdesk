/** Tipos de archivo admitidos (deben coincidir con el bucket "expedientes" en la migración). */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt";

export function isAllowedDocumentType(value: string): value is AllowedDocumentType {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(value);
}

/** Nombre de archivo seguro para la ruta en Storage (sin acentos ni caracteres especiales). */
export function safeStorageName(name: string): string {
  const normalized = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+/, "");
  return (cleaned || "archivo").slice(-120);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
