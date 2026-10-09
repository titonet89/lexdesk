"use server";

import { redirect } from "next/navigation";
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
