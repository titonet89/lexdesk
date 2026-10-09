import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

const enums = Constants.public.Enums;

/** Texto opcional: recorta espacios y convierte la cadena vacía en `null`. */
const optionalText = (max: number, message = `Máximo ${max} caracteres.`) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((value) => (value === "" ? null : value));

const requiredText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label}: mínimo ${min} caracteres.` })
    .max(max, { error: `${label}: máximo ${max} caracteres.` });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });
const optionalIsoDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), { error: "Fecha inválida." });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Hora inválida." });

export const uuidSchema = z.uuid({ error: "Identificador inválido." });

export const clientSchema = z.object({
  kind: z.enum(enums.client_kind),
  full_name: requiredText(2, 160, "Nombre"),
  document_type: z
    .enum([...enums.document_type, ""])
    .transform((value) => (value === "" ? null : value)),
  document_number: optionalText(30),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(160)
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { error: "Email inválido." })
    .transform((value) => (value === "" ? null : value.toLowerCase())),
  address: optionalText(200),
  locality: optionalText(100),
  notes: optionalText(5000),
});

export const matterSchema = z
  .object({
    client_id: uuidSchema,
    title: requiredText(3, 300, "Carátula"),
    file_number: optionalText(60),
    area: z.enum(enums.practice_area),
    court: optionalText(200),
    jurisdiction: requiredText(2, 100, "Jurisdicción"),
    counterpart: optionalText(300),
    status: z.enum(enums.matter_status),
    stage: z.enum(enums.procedural_stage),
    file_year: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value)))
      .refine((value) => value === null || (Number.isInteger(value) && value >= 1900 && value <= 2100), {
        error: "Año inválido.",
      }),
    forum: optionalText(100),
    secretariat: optionalText(100),
    counterpart_lawyer: optionalText(200),
    opened_on: isoDate,
    closed_on: optionalIsoDate,
    description: optionalText(10000),
    is_sensitive: z.boolean(),
  })
  .refine((value) => !value.closed_on || value.closed_on >= value.opened_on, {
    error: "La fecha de cierre no puede ser anterior a la de inicio.",
    path: ["closed_on"],
  });

export const entrySchema = z.object({
  matter_id: uuidSchema,
  occurred_on: isoDate,
  kind: z.enum(enums.entry_kind),
  summary: requiredText(2, 300, "Resumen"),
  details: optionalText(10000),
});

export const eventSchema = z
  .object({
    matter_id: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .refine((value) => value === null || uuidSchema.safeParse(value).success, { error: "Expediente inválido." }),
    title: requiredText(2, 200, "Título"),
    kind: z.enum(enums.event_kind),
    priority: z.enum(enums.event_priority),
    date: isoDate,
    all_day: z.boolean(),
    start_time: z.string(),
    end_time: z.string(),
    location: optionalText(200),
    notes: optionalText(5000),
    is_peremptory: z.boolean(),
    deadline_from: optionalIsoDate,
    deadline_business_days: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value)))
      .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 365), {
        error: "Entre 1 y 365 días hábiles.",
      }),
  })
  .superRefine((value, ctx) => {
    if (!value.all_day) {
      if (!hhmm.safeParse(value.start_time).success) {
        ctx.addIssue({ code: "custom", message: "Indicá la hora de inicio.", path: ["start_time"] });
      }
      if (value.end_time && !hhmm.safeParse(value.end_time).success) {
        ctx.addIssue({ code: "custom", message: "Hora de fin inválida.", path: ["end_time"] });
      }
      if (value.end_time && value.start_time && value.end_time < value.start_time) {
        ctx.addIssue({ code: "custom", message: "La hora de fin es anterior a la de inicio.", path: ["end_time"] });
      }
    }
  });

export const shareSchema = z.object({
  matter_id: uuidSchema,
  collaborator_id: uuidSchema,
  permission: z.enum(enums.share_permission),
  include_documents: z.boolean(),
  expires_on: optionalIsoDate,
});

export const commentSchema = z.object({
  matter_id: uuidSchema,
  body: requiredText(1, 5000, "Comentario"),
});

export const nonWorkingDaySchema = z
  .object({
    from: isoDate,
    to: optionalIsoDate,
    kind: z.enum(enums.non_working_day_kind),
    description: requiredText(2, 120, "Descripción"),
  })
  .refine((value) => !value.to || value.to >= value.from, {
    error: "La fecha final no puede ser anterior a la inicial.",
    path: ["to"],
  });

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { error: "Email inválido." })
    .max(160),
  full_name: requiredText(2, 120, "Nombre"),
});

/** Quita caracteres con significado en los filtros de PostgREST para búsquedas seguras. */
export function sanitizeSearch(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").replace(/[%,()*\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
