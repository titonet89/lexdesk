"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { z } from "zod";
import {
  actionError,
  actionSuccess,
  formText,
  GENERIC_ERROR,
  zodFieldErrors,
  type ActionState,
} from "@/lib/actions";
import { getMemberSession, getTitularOrNull } from "@/lib/auth/session";
import { parseDateOnly, toDateOnly } from "@/lib/panel/dates";
import { nonWorkingDaySchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";

const MAX_RANGE_DAYS = 62;

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getMemberSession();
  if (!session) return actionError("No autorizado.");
  const parsed = z
    .object({
      full_name: z.string().trim().min(2, { error: "Mínimo 2 caracteres." }).max(120),
      professional_registration: z
        .string()
        .trim()
        .max(60)
        .transform((value) => (value === "" ? null : value)),
    })
    .safeParse({
      full_name: formText(formData, "full_name"),
      professional_registration: formText(formData, "professional_registration"),
    });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", session.userId);
  if (error) return actionError(GENERIC_ERROR);

  revalidatePath("/panel", "layout");
  return actionSuccess("Datos actualizados.");
}

export async function addNonWorkingDaysAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  const parsed = nonWorkingDaySchema.safeParse({
    from: formText(formData, "from"),
    to: formText(formData, "to"),
    kind: formText(formData, "kind"),
    description: formText(formData, "description"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const { from, to, kind, description } = parsed.data;
  const rows: { day: string; kind: typeof kind; description: string }[] = [];
  const end = parseDateOnly(to ?? from);
  for (let cursor = parseDateOnly(from); cursor <= end; cursor = addDays(cursor, 1)) {
    rows.push({ day: toDateOnly(cursor), kind, description });
    if (rows.length > MAX_RANGE_DAYS) {
      return actionError(`El rango no puede superar ${MAX_RANGE_DAYS} días.`, { to: "Rango demasiado largo." });
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("non_working_days").upsert(rows, { onConflict: "day" });
  if (error) return actionError(GENERIC_ERROR);

  revalidatePath("/panel/ajustes/feriados");
  revalidatePath("/panel/agenda");
  return actionSuccess(rows.length === 1 ? "Día inhábil agregado." : `${rows.length} días inhábiles agregados.`);
}

export async function deleteNonWorkingDayAction(day: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const supabase = await createClient();
  await supabase.from("non_working_days").delete().eq("day", day);
  revalidatePath("/panel/ajustes/feriados");
  revalidatePath("/panel/agenda");
}
