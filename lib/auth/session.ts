import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isStrongSession } from "@/lib/auth/assurance";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

/** Cookie con el estudio activo. Solo es una preferencia: siempre se valida contra las membresías. */
export const ACTIVE_ORG_COOKIE = "lexdesk_org";

export interface Membership {
  organizationId: string;
  organizationName: string;
  role: AppRole;
}

export interface MemberSession {
  userId: string;
  email: string;
  profile: Profile;
  /** Estudios donde la persona es miembro activo. */
  memberships: Membership[];
  /** Estudio en el que está trabajando ahora. */
  active: Membership;
}

/**
 * Devuelve la sesión SOLO si pasó la verificación en dos pasos (contraseña +
 * código, o passkey) y pertenece
 * al menos a un estudio activo. Memoizada por request con `cache`.
 */
export const getMemberSession = cache(async (): Promise<MemberSession | null> => {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!isStrongSession(aal)) return null;

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userData.user.id).single(),
    supabase
      .from("memberships")
      .select("organization_id, role, organizations(name)")
      .eq("user_id", userData.user.id)
      .eq("is_active", true),
  ]);
  if (!profile || !rows || rows.length === 0) return null;

  const memberships: Membership[] = rows
    .map((row) => ({
      organizationId: row.organization_id,
      organizationName: row.organizations?.name ?? "Estudio",
      role: row.role,
    }))
    // Primero los estudios donde es titular.
    .sort((a, b) => Number(b.role === "titular") - Number(a.role === "titular") || a.organizationName.localeCompare(b.organizationName));

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((membership) => membership.organizationId === preferred) ?? memberships[0];

  return { userId: userData.user.id, email: userData.user.email ?? profile.email, profile, memberships, active };
});

/**
 * Exige un miembro con 2FA. Si falta algún paso, redirige al que corresponda:
 * sin sesión → /acceso · sin 2FA configurado → /acceso/activar-2fa ·
 * 2FA sin verificar en esta sesión → /acceso/verificar.
 */
export async function requireMember(): Promise<MemberSession> {
  const session = await getMemberSession();
  if (session) return session;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/acceso");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal1") redirect("/acceso/activar-2fa");
  if (aal?.currentLevel === "aal1") redirect("/acceso/verificar");

  // Sesión válida con 2FA pero sin ningún estudio activo.
  await supabase.auth.signOut();
  redirect("/acceso?estado=inactivo");
}

/** Exige que la persona sea titular del estudio activo; si no, la devuelve al panel. */
export async function requireTitular(): Promise<MemberSession> {
  const session = await requireMember();
  if (session.active.role !== "titular") redirect("/panel");
  return session;
}

/** Para Server Actions: sesión de la titular del estudio activo o `null` (sin redirigir). */
export async function getTitularOrNull(): Promise<MemberSession | null> {
  const session = await getMemberSession();
  return session?.active.role === "titular" ? session : null;
}

/** ¿Es titular del estudio indicado? (para recursos de un estudio distinto del activo). */
export function isTitularOf(session: MemberSession, organizationId: string): boolean {
  return session.memberships.some(
    (membership) => membership.organizationId === organizationId && membership.role === "titular",
  );
}
