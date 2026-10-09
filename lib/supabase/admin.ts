import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Cliente con la clave secreta: IGNORA RLS.
 *
 * Usar únicamente en el servidor, para operaciones administrativas acotadas
 * (invitar o desactivar colaboradores) y SIEMPRE después de verificar que quien
 * lo pide es la titular con 2FA. Nunca exponer su resultado sin filtrar.
 */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta SUPABASE_SECRET_KEY (solo servidor). Revisá .env.local.");
  }
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
