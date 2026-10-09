"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, formText, GENERIC_ERROR, zodFieldErrors, type ActionState } from "@/lib/actions";
import { getTitularOrNull } from "@/lib/auth/session";
import { clientSchema, uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";

function parseClient(formData: FormData) {
  return clientSchema.safeParse({
    kind: formText(formData, "kind"),
    full_name: formText(formData, "full_name"),
    document_type: formText(formData, "document_type"),
    document_number: formText(formData, "document_number"),
    phone: formText(formData, "phone"),
    email: formText(formData, "email"),
    address: formText(formData, "address"),
    locality: formText(formData, "locality"),
    notes: formText(formData, "notes"),
  });
}

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getTitularOrNull();
  if (!session) return actionError("No autorizado.");

  const parsed = parseClient(formData);
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert({ ...parsed.data, organization_id: session.active.organizationId }).select("id").single();
  if (error || !data) return actionError(GENERIC_ERROR);

  revalidatePath("/panel/clientes");
  redirect(`/panel/clientes/${data.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  if (!uuidSchema.safeParse(clientId).success) return actionError("Cliente inválido.");

  const parsed = parseClient(formData);
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(parsed.data).eq("id", clientId);
  if (error) return actionError(GENERIC_ERROR);

  revalidatePath("/panel/clientes");
  revalidatePath(`/panel/clientes/${clientId}`);
  redirect(`/panel/clientes/${clientId}`);
}

export async function toggleArchiveClientAction(clientId: string, archive: boolean): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(clientId).success) return;

  const supabase = await createClient();
  await supabase
    .from("clients")
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", clientId);

  revalidatePath("/panel/clientes");
  revalidatePath(`/panel/clientes/${clientId}`);
}
