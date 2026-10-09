import type { z } from "zod";

/** Estado estándar que devuelven las Server Actions de formularios. */
export interface ActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false, message: null, fieldErrors: {} };

export function actionError(message: string, fieldErrors: Record<string, string> = {}): ActionState {
  return { ok: false, message, fieldErrors };
}

export function actionSuccess(message: string): ActionState {
  return { ok: true, message, fieldErrors: {} };
}

/** Convierte los errores de Zod en un mapa campo → primer mensaje. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Lee un campo de texto de un FormData (cadena vacía si no existe). */
export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Mensaje genérico para errores inesperados: nunca se exponen detalles internos. */
export const GENERIC_ERROR = "No se pudo completar la operación. Intentá de nuevo en unos minutos.";
