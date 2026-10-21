"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Cierra la sesión en este dispositivo. */
export async function signOutAction(reason?: "inactividad"): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(`/acceso?estado=${reason === "inactividad" ? "inactividad" : "sesion-cerrada"}`);
}

/** Cierra la sesión en TODOS los dispositivos (p. ej. ante la pérdida de un celular). */
export async function signOutEverywhereAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/acceso?estado=sesion-cerrada");
}

/**
 * Quita una passkey de la persona (p. ej. ante la pérdida de un celular).
 *
 * Usa la clave secreta porque Supabase solo deja administrar passkeys desde una
 * sesión con contraseña + código, y quien ingresó con huella también tiene que
 * poder quitar un dispositivo perdido. La operación queda acotada a su propio
 * usuario: el id de la passkey no alcanza para borrar la de otra persona.
 */
export async function deletePasskeyAction(passkeyId: string): Promise<void> {
  const session = await requireMember();
  const { error } = await createAdminClient().auth.admin.passkey.deletePasskey({ userId: session.userId, passkeyId });
  if (error) throw new Error("No se pudo quitar el dispositivo.");
  revalidatePath("/panel/ajustes/seguridad");
}
