"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  formText,
  GENERIC_ERROR,
  zodFieldErrors,
  type ActionState,
} from "@/lib/actions";
import { getTitularOrNull } from "@/lib/auth/session";
import { chargeSchema, paymentSchema, scheduleItemSchema, umaValueSchema } from "@/lib/panel/fees";
import { roundMoney } from "@/lib/panel/money";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";

function revalidateFees(matterId?: string) {
  revalidatePath("/panel/honorarios");
  revalidatePath("/panel");
  if (matterId) revalidatePath(`/panel/expedientes/${matterId}`);
}

/** Traduce los errores de reglas de negocio de la base a mensajes claros. */
function businessError(message: string | undefined) {
  if (message?.includes("supera el saldo")) return actionError("El pago supera el saldo pendiente del cargo.");
  if (message?.includes("menor a lo ya cobrado")) return actionError("El monto no puede ser menor a lo ya cobrado.");
  return actionError(GENERIC_ERROR);
}

// ---------------------------------------------------------------------------
// Cargos y pagos por expediente
// ---------------------------------------------------------------------------

export async function createChargeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  const parsed = chargeSchema.safeParse({
    matter_id: formText(formData, "matter_id"),
    kind: formText(formData, "kind"),
    concept: formText(formData, "concept"),
    amount: formText(formData, "amount"),
    uma_quantity: formText(formData, "uma_quantity"),
    uma_value: formText(formData, "uma_value"),
    schedule_item_id: formText(formData, "schedule_item_id"),
    charged_on: formText(formData, "charged_on"),
    due_on: formText(formData, "due_on"),
    notes: formText(formData, "notes"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("matter_charges").insert({ ...parsed.data, amount: roundMoney(parsed.data.amount) });
  if (error) return businessError(error.message);

  revalidateFees(parsed.data.matter_id);
  return actionSuccess(parsed.data.kind === "honorario" ? "Honorario registrado." : "Gasto registrado.");
}

export async function deleteChargeAction(matterId: string, chargeId: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(matterId).success || !uuidSchema.safeParse(chargeId).success) return;
  const supabase = await createClient();
  await supabase.from("matter_charges").delete().eq("id", chargeId).eq("matter_id", matterId);
  revalidateFees(matterId);
}

export async function addPaymentAction(matterId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  if (!uuidSchema.safeParse(matterId).success) return actionError("Expediente inválido.");
  const parsed = paymentSchema.safeParse({
    charge_id: formText(formData, "charge_id"),
    amount: formText(formData, "amount"),
    paid_on: formText(formData, "paid_on"),
    method: formText(formData, "method"),
    notes: formText(formData, "notes"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("charge_payments").insert({ ...parsed.data, amount: roundMoney(parsed.data.amount) });
  if (error) return businessError(error.message);

  revalidateFees(matterId);
  return actionSuccess("Pago registrado.");
}

export async function deletePaymentAction(matterId: string, paymentId: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(matterId).success || !uuidSchema.safeParse(paymentId).success) return;
  const supabase = await createClient();
  await supabase.from("charge_payments").delete().eq("id", paymentId);
  revalidateFees(matterId);
}

// ---------------------------------------------------------------------------
// UMA y arancel del estudio
// ---------------------------------------------------------------------------

export async function addUmaValueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getTitularOrNull();
  if (!session) return actionError("No autorizado.");
  const parsed = umaValueSchema.safeParse({
    value: formText(formData, "value"),
    effective_from: formText(formData, "effective_from"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("uma_values").upsert(
    { ...parsed.data, value: roundMoney(parsed.data.value), organization_id: session.active.organizationId },
    { onConflict: "organization_id,effective_from" },
  );
  if (error) return actionError(GENERIC_ERROR);

  revalidatePath("/panel/ajustes/honorarios");
  revalidatePath("/panel", "layout");
  return actionSuccess("Valor de la UMA actualizado.");
}

export async function saveScheduleItemAction(itemId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getTitularOrNull();
  if (!session) return actionError("No autorizado.");
  if (itemId && !uuidSchema.safeParse(itemId).success) return actionError("Ítem inválido.");
  const parsed = scheduleItemSchema.safeParse({
    category: formText(formData, "category"),
    name: formText(formData, "name"),
    min_uma: formText(formData, "min_uma"),
    max_uma: formText(formData, "max_uma"),
    legal_reference: formText(formData, "legal_reference"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = itemId
    ? await supabase.from("fee_schedule_items").update(parsed.data).eq("id", itemId)
    : await supabase
        .from("fee_schedule_items")
        .insert({ ...parsed.data, organization_id: session.active.organizationId, sort_order: 1000 });
  if (error) return actionError(GENERIC_ERROR);

  revalidatePath("/panel/ajustes/honorarios");
  return actionSuccess(itemId ? "Ítem actualizado." : "Ítem agregado al arancel.");
}

export async function toggleScheduleItemAction(itemId: string, active: boolean): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(itemId).success) return;
  const supabase = await createClient();
  await supabase.from("fee_schedule_items").update({ is_active: active }).eq("id", itemId);
  revalidatePath("/panel/ajustes/honorarios");
}

export async function restoreScheduleAction(): Promise<void> {
  const session = await getTitularOrNull();
  if (!session) return;
  const supabase = await createClient();
  await supabase.rpc("restore_fee_schedule", { p_org: session.active.organizationId });
  revalidatePath("/panel/ajustes/honorarios");
}
