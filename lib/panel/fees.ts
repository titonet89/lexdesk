import { z } from "zod";
import type { BadgeTone } from "@/components/panel/ui";
import { parseMoney } from "@/lib/panel/money";
import { Constants, type Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const FEE_CATEGORIES = [
  "consultas",
  "generico",
  "contencioso",
  "familia",
  "penal",
  "ejecuciones",
  "incidentes",
  "recursos",
  "extrajudicial",
  "otros",
] as const;
export type FeeCategory = (typeof FEE_CATEGORIES)[number];

export const feeCategoryLabels: Record<FeeCategory, string> = {
  consultas: "Consultas",
  generico: "Genérico para todos los fueros",
  contencioso: "Contencioso administrativo",
  familia: "Familia y violencia de género",
  penal: "Penal",
  ejecuciones: "Ejecuciones",
  incidentes: "Incidentes, exhortos y oficios",
  recursos: "Recursos",
  extrajudicial: "Labores extrajudiciales",
  otros: "Otros",
};

export const chargeKindLabels: Record<Enums["charge_kind"], string> = {
  honorario: "Honorario",
  gasto: "Gasto",
};

export const paymentMethodLabels: Record<Enums["payment_method"], string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  otro: "Otro",
};

export type ChargeStatus = "pendiente" | "parcial" | "pagado";

export const chargeStatusLabels: Record<ChargeStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagado: "Pagado",
};

export const chargeStatusTones: Record<ChargeStatus, BadgeTone> = {
  pendiente: "amber",
  parcial: "blue",
  pagado: "green",
};

export function asChargeStatus(value: string | null): ChargeStatus {
  return value === "parcial" || value === "pagado" ? value : "pendiente";
}

/** Art. 23 Ley 6368: 20% del monto del proceso; excepcionalmente entre 15% y 25%. */
export const PERCENTAGE_RULE = { default: 20, min: 15, max: 25 } as const;

// ---------------------------------------------------------------------------
// Validaciones (servidor)
// ---------------------------------------------------------------------------

const money = (label: string) =>
  z.string().transform((value, ctx) => {
    const parsed = parseMoney(value);
    if (parsed === null || parsed <= 0) {
      ctx.addIssue({ code: "custom", message: `${label}: ingresá un monto válido (ej.: 150.000,00).` });
      return z.NEVER;
    }
    return parsed;
  });

const optionalPositive = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value.replace(",", "."))))
  .refine((value) => value === null || (Number.isFinite(value) && value > 0), { error: "Valor inválido." });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." });
const optionalIsoDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), { error: "Fecha inválida." });
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .transform((value) => (value === "" ? null : value));
const uuidOrNull = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || z.uuid().safeParse(value).success, { error: "Valor inválido." });

export const chargeSchema = z.object({
  matter_id: z.uuid(),
  kind: z.enum(Constants.public.Enums.charge_kind),
  concept: z.string().trim().min(2, { error: "Concepto: mínimo 2 caracteres." }).max(200),
  amount: money("Monto"),
  uma_quantity: optionalPositive,
  uma_value: optionalPositive,
  schedule_item_id: uuidOrNull,
  charged_on: isoDate,
  due_on: optionalIsoDate,
  notes: optionalText(2000),
});

export const paymentSchema = z.object({
  charge_id: z.uuid(),
  amount: money("Monto"),
  paid_on: isoDate,
  method: z.enum(Constants.public.Enums.payment_method),
  notes: optionalText(500),
});

export const umaValueSchema = z.object({
  value: money("Valor de la UMA"),
  effective_from: isoDate,
  note: optionalText(200),
});

export const scheduleItemSchema = z
  .object({
    category: z.enum(FEE_CATEGORIES),
    name: z.string().trim().min(2, { error: "Nombre: mínimo 2 caracteres." }).max(160),
    min_uma: z
      .string()
      .trim()
      .transform((value) => Number(value.replace(",", ".")))
      .refine((value) => Number.isFinite(value) && value >= 0 && value <= 10000, { error: "Cantidad de UMA inválida." }),
    max_uma: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value.replace(",", "."))))
      .refine((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 10000), { error: "Cantidad de UMA inválida." }),
    legal_reference: optionalText(160),
  })
  .refine((value) => value.max_uma === null || value.max_uma >= value.min_uma, {
    error: "El máximo no puede ser menor al mínimo.",
    path: ["max_uma"],
  });
