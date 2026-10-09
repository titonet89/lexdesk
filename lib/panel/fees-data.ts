import "server-only";
import { todayIso } from "@/lib/panel/dates";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUma {
  value: number;
  effectiveFrom: string;
  note: string | null;
}

/** UMA vigente del estudio: el último valor con vigencia hasta hoy. */
export async function getCurrentUma(organizationId: string): Promise<CurrentUma | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("uma_values")
    .select("value, effective_from, note")
    .eq("organization_id", organizationId)
    .lte("effective_from", todayIso())
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { value: Number(data.value), effectiveFrom: data.effective_from, note: data.note } : null;
}

export interface ScheduleOption {
  id: string;
  category: string;
  name: string;
  minUma: number;
  maxUma: number | null;
  legalReference: string | null;
}

/** Ítems activos del arancel del estudio, ordenados por categoría. */
export async function getScheduleOptions(organizationId: string): Promise<ScheduleOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fee_schedule_items")
    .select("id, category, name, min_uma, max_uma, legal_reference")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("category")
    .order("sort_order");
  return (data ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    minUma: Number(item.min_uma),
    maxUma: item.max_uma === null ? null : Number(item.max_uma),
    legalReference: item.legal_reference,
  }));
}
