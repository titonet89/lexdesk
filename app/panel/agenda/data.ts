import "server-only";
import { addYears, subYears } from "date-fns";
import { toDateOnly } from "@/lib/panel/dates";
import { createClient } from "@/lib/supabase/server";

/** Datos que necesita el formulario de eventos: expedientes y días inhábiles. */
export async function loadEventFormData(organizationId: string) {
  const supabase = await createClient();
  const now = new Date();
  const [{ data: matters }, { data: nonWorkingDays }] = await Promise.all([
    supabase
      .from("matters")
      .select("id, title")
      .eq("organization_id", organizationId)
      .in("status", ["consulta", "activo", "en_espera"])
      .order("title"),
    supabase
      .from("non_working_days")
      .select("day, description")
      .eq("organization_id", organizationId)
      .gte("day", toDateOnly(subYears(now, 1)))
      .lte("day", toDateOnly(addYears(now, 2)))
      .order("day"),
  ]);
  return { matters: matters ?? [], nonWorkingDays: nonWorkingDays ?? [] };
}
