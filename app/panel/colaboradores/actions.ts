"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  actionError,
  actionSuccess,
  formText,
  GENERIC_ERROR,
  zodFieldErrors,
  type ActionState,
} from "@/lib/actions";
import { getTitularOrNull } from "@/lib/auth/session";
import { inviteSchema, uuidSchema } from "@/lib/panel/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Bloqueo de login prácticamente permanente para usuarios desactivados. */
const BAN_FOREVER = "876000h";

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function inviteCollaboratorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  const parsed = inviteSchema.safeParse({
    email: formText(formData, "email"),
    full_name: formText(formData, "full_name"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  // El cliente admin se usa SOLO después de verificar que quien invita es la titular con 2FA.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.full_name },
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/acceso/nueva-clave`,
  });
  if (error) {
    if (error.code === "email_exists" || error.status === 422) {
      return actionError("Ya existe un usuario con ese email.", { email: "Email ya registrado." });
    }
    return actionError(GENERIC_ERROR);
  }

  revalidatePath("/panel/colaboradores");
  return actionSuccess(`Enviamos la invitación a ${parsed.data.email}.`);
}

export async function setCollaboratorActiveAction(userId: string, active: boolean): Promise<void> {
  const session = await getTitularOrNull();
  if (!session) return;
  if (!uuidSchema.safeParse(userId).success || userId === session.userId) return;

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  // Nunca se desactiva a la titular desde acá.
  if (!target || target.role !== "colaborador") return;

  await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : BAN_FOREVER });

  if (!active) {
    // Al desactivar, se revocan todos sus accesos (queda registrado en la auditoría).
    const supabase = await createClient();
    await supabase
      .from("matter_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("collaborator_id", userId)
      .is("revoked_at", null);
  }

  revalidatePath("/panel/colaboradores");
}
