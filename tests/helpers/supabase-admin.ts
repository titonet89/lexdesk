import { createClient } from "@supabase/supabase-js";

/** Cliente admin para preparar datos de prueba (solo contra Supabase local). */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase para las pruebas (.env.local).");
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
    throw new Error("Las pruebas E2E del panel solo pueden correr contra Supabase LOCAL.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Borra (si existe) y vuelve a crear un usuario de prueba con contraseña conocida. */
export async function recreateUser(email: string, password: string, role: "titular" | "colaborador", fullName: string) {
  const admin = adminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((user) => user.email === email);
  if (existing) {
    // Los datos del usuario anterior se eliminan para que cada corrida empiece limpia.
    await admin.from("matter_comments").delete().eq("author_id", existing.id);
    const { data: owned } = await admin.from("memberships").select("organization_id").eq("user_id", existing.id).eq("role", "titular");
    for (const row of owned ?? []) await admin.from("organizations").delete().eq("id", row.organization_id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
  if (role === "titular") {
    const { data: organization } = await admin.from("organizations").insert({ name: `Estudio ${fullName}` }).select("id").single();
    await admin.from("memberships").insert({ organization_id: organization!.id, user_id: data.user.id, role: "titular" });
  }
  return data.user.id;
}

/** Elimina un usuario de prueba si existe (y sus comentarios, que son inalterables por diseño). */
export async function deleteUserIfExists(email: string) {
  const admin = adminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((user) => user.email === email);
  if (!existing) return;
  await admin.from("matter_comments").delete().eq("author_id", existing.id);
  await admin.auth.admin.deleteUser(existing.id);
}

const MAILPIT_URL = "http://127.0.0.1:54324";

/** Borra todos los emails de la bandeja de prueba local (Mailpit). */
export async function clearMailbox() {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}

/** Espera el último email enviado a `to` y devuelve el enlace de confirmación que contiene. */
export async function waitForAuthLink(to: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
      const { HTML } = (await message.json()) as { HTML: string };
      const match = HTML.match(/href="([^"]*\/auth\/confirm\?[^"]+)"/);
      if (match) return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó el email a ${to}`);
}
