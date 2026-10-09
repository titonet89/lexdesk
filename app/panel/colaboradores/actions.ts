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

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * Invita a un colega al estudio activo.
 * - Si ya tiene cuenta en LexDesk (p. ej. colabora con otro estudio), se lo suma directamente.
 * - Si no, recibe un email para crear su contraseña y activar su 2FA.
 */
export async function inviteCollaboratorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getTitularOrNull();
  if (!session) return actionError("No autorizado.");
  const parsed = inviteSchema.safeParse({
    email: formText(formData, "email"),
    full_name: formText(formData, "full_name"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const organizationId = session.active.organizationId;
  // El cliente admin se usa SOLO después de verificar que quien invita es titular (con 2FA) del estudio.
  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  let userId = existing?.id ?? null;

  if (userId) {
    const { data: membership } = await admin
      .from("memberships")
      .select("role, is_active")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membership) {
      return actionError(
        membership.is_active ? "Esa persona ya forma parte del estudio." : "Esa persona está desactivada: reactivala desde la lista.",
        { email: "Ya es miembro del estudio." },
      );
    }
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { full_name: parsed.data.full_name },
      redirectTo: `${await siteOrigin()}/auth/confirm?next=/acceso/nueva-clave`,
    });
    if (error || !data.user) return actionError(GENERIC_ERROR);
    userId = data.user.id;
  }

  const { error: membershipError } = await admin
    .from("memberships")
    .insert({ organization_id: organizationId, user_id: userId, role: "colaborador" });
  if (membershipError) return actionError(GENERIC_ERROR);

  revalidatePath("/panel/colaboradores");
  return actionSuccess(
    existing
      ? `${parsed.data.email} ya tenía cuenta en LexDesk: lo sumamos al estudio.`
      : `Enviamos la invitación a ${parsed.data.email}.`,
  );
}

/** Activa o desactiva a un colaborador SOLO en el estudio activo (no afecta otros estudios). */
export async function setCollaboratorActiveAction(userId: string, active: boolean): Promise<void> {
  const session = await getTitularOrNull();
  if (!session) return;
  if (!uuidSchema.safeParse(userId).success || userId === session.userId) return;

  const organizationId = session.active.organizationId;
  const admin = createAdminClient();
  // Nunca se desactiva a una titular desde acá: el filtro por rol lo garantiza.
  const { data: updated } = await admin
    .from("memberships")
    .update({ is_active: active })
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("role", "colaborador")
    .select("user_id");
  if (!updated?.length) return;

  if (!active) {
    // Se revocan sus accesos a expedientes de ESTE estudio (queda registrado en la auditoría).
    const supabase = await createClient();
    const { data: shares } = await supabase
      .from("matter_shares")
      .select("id, matters!inner(organization_id)")
      .eq("collaborator_id", userId)
      .eq("matters.organization_id", organizationId)
      .is("revoked_at", null);
    const ids = (shares ?? []).map((share) => share.id);
    if (ids.length > 0) {
      await supabase.from("matter_shares").update({ revoked_at: new Date().toISOString() }).in("id", ids);
    }
  }

  revalidatePath("/panel/colaboradores");
}
