import type { BadgeTone } from "@/components/panel/ui";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const practiceAreaLabels: Record<Enums["practice_area"], string> = {
  familia: "Familia",
  sucesiones: "Sucesiones",
  civil: "Civil",
  laboral: "Laboral",
  violencia_genero: "Violencia de género",
  otro: "Otro",
};

export const matterStatusLabels: Record<Enums["matter_status"], string> = {
  consulta: "Consulta",
  activo: "Activo",
  en_espera: "En espera",
  cerrado: "Cerrado",
  archivado: "Archivado",
};

export const matterStatusTones: Record<Enums["matter_status"], BadgeTone> = {
  consulta: "blue",
  activo: "green",
  en_espera: "amber",
  cerrado: "neutral",
  archivado: "neutral",
};

export const entryKindLabels: Record<Enums["entry_kind"], string> = {
  escrito: "Escrito",
  audiencia: "Audiencia",
  notificacion: "Notificación",
  resolucion: "Resolución",
  reunion: "Reunión",
  llamada: "Llamada",
  nota: "Nota",
  otro: "Otro",
};

export const eventKindLabels: Record<Enums["event_kind"], string> = {
  audiencia: "Audiencia",
  vencimiento: "Vencimiento",
  reunion: "Reunión",
  tramite: "Trámite",
  escrito: "Escrito",
  cedula: "Cédula",
  recordatorio: "Recordatorio",
};

export const eventKindTones: Record<Enums["event_kind"], BadgeTone> = {
  audiencia: "blue",
  vencimiento: "red",
  reunion: "gold",
  tramite: "neutral",
  escrito: "blue",
  cedula: "neutral",
  recordatorio: "amber",
};

/** Clases para los puntos/bloques del calendario según el tipo de evento. */
export const eventKindDot: Record<Enums["event_kind"], string> = {
  audiencia: "bg-sky-500",
  vencimiento: "bg-red-500",
  reunion: "bg-gold-600",
  tramite: "bg-slate-500",
  escrito: "bg-indigo-500",
  cedula: "bg-teal-500",
  recordatorio: "bg-amber-500",
};

/** Etapas procesales en el orden del tablero. */
export const stageLabels: Record<Enums["procedural_stage"], string> = {
  iniciacion: "Iniciación",
  tramite: "Trámite",
  prueba: "Prueba",
  alegatos: "Alegatos",
  sentencia: "Sentencia",
  recursos: "Recursos",
  ejecucion: "Ejecución",
  archivo: "Archivo",
};

export const stageTones: Record<Enums["procedural_stage"], BadgeTone> = {
  iniciacion: "blue",
  tramite: "neutral",
  prueba: "amber",
  alegatos: "amber",
  sentencia: "gold",
  recursos: "red",
  ejecucion: "green",
  archivo: "neutral",
};

/** Fueros habituales (sugerencias; el campo admite cualquier texto). */
export const forumSuggestions = [
  "Civil y Comercial",
  "Familia",
  "Laboral",
  "Penal",
  "Violencia Familiar y de Género",
  "Contencioso Administrativo",
  "Sucesiones",
  "Paz",
] as const;

export const eventPriorityLabels: Record<Enums["event_priority"], string> = {
  normal: "Normal",
  alta: "Alta",
  critica: "Crítica",
};

export const eventStatusLabels: Record<Enums["event_status"], string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  cancelado: "Cancelado",
};

export const clientKindLabels: Record<Enums["client_kind"], string> = {
  persona: "Persona",
  empresa: "Empresa",
};

export const documentTypeLabels: Record<Enums["document_type"], string> = {
  DNI: "DNI",
  CUIT: "CUIT",
  CUIL: "CUIL",
  Pasaporte: "Pasaporte",
  Otro: "Otro",
};

export const sharePermissionLabels: Record<Enums["share_permission"], string> = {
  lectura: "Solo lectura",
  comentario: "Lectura y comentarios",
};

export const nonWorkingDayKindLabels: Record<Enums["non_working_day_kind"], string> = {
  feriado: "Feriado",
  feria_judicial: "Feria judicial",
  inhabil: "Día inhábil",
};

export const auditActionLabels: Record<string, string> = {
  insert: "Alta",
  update: "Modificación",
  delete: "Baja",
  view: "Consulta",
  download: "Descarga",
};

export const auditTableLabels: Record<string, string> = {
  clients: "Cliente",
  matters: "Expediente",
  matter_entries: "Actuación",
  matter_shares: "Acceso compartido",
  matter_comments: "Comentario",
  events: "Agenda",
  documents: "Documento",
  profiles: "Usuario",
  non_working_days: "Día inhábil",
};

/** Convierte un objeto de etiquetas en opciones para un <select>. */
export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
