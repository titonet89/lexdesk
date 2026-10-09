import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export interface MemberSession {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * Devuelve la sesión del miembro SOLO si pasó la verificación en dos pasos.
 * Memoizada por request con `cache` para no repetir llamadas.
 */
export const getMemberSession = cache(async (): Promise<MemberSession | null> => {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();
  if (!profile || !profile.is_active) return null;

  return { userId: userData.user.id, email: userData.user.email ?? profile.email, profile };
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

  // Sesión válida con 2FA pero perfil inexistente o desactivado.
  await supabase.auth.signOut();
  redirect("/acceso?estado=inactivo");
}

/** Exige que el miembro sea la titular; si no, lo devuelve al panel. */
export async function requireTitular(): Promise<MemberSession> {
  const session = await requireMember();
  if (session.profile.role !== "titular") redirect("/panel");
  return session;
}

/** Para Server Actions: devuelve la sesión de la titular o `null` (sin redirigir). */
export async function getTitularOrNull(): Promise<MemberSession | null> {
  const session = await getMemberSession();
  return session?.profile.role === "titular" ? session : null;
}
