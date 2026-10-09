// Da de alta un ESTUDIO nuevo con su titular (alta de un cliente de la plataforma).
//
// Uso:
//   npm run admin:crear-titular -- --email titular@ejemplo.com --nombre "Dra. Nombre Apellido" --estudio "Estudio Apellido"
//
// - Si el email no tiene cuenta, se crea con una contraseña temporal aleatoria
//   que se muestra UNA vez. Al ingresar se exige activar la verificación en dos pasos.
// - Si ya tiene cuenta (p. ej. colabora con otro estudio), se la suma como titular del estudio nuevo.
//
// Requiere en el entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

// Acepta --email/--nombre/--estudio o, en ese mismo orden, argumentos sueltos:
// en PowerShell, `npm run ... -- --email x` pierde los nombres de las opciones.
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
    estudio: { type: "string" },
  },
});

const email = (values.email ?? positionals[0])?.trim().toLowerCase();
const fullName = (values.nombre ?? positionals[1])?.trim();
const organizationName = (values.estudio ?? positionals[2])?.trim() || (fullName ? `Estudio ${fullName}` : "");

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName) {
  console.error(
    'Uso: npm run admin:crear-titular -- --email titular@ejemplo.com --nombre "Dra. Nombre Apellido" [--estudio "Estudio Apellido"]',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en el entorno.");
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

/** Contraseña temporal que cumple la política: mayúsculas, minúsculas y números. */
const newTemporaryPassword = () => `Tmp-${randomBytes(12).toString("base64url")}9aZ`;

const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
let userId = existing?.id ?? null;
let temporaryPassword = null;
let createdNow = false;

if (userId) {
  // Cuenta existente sin ningún estudio (p. ej. un alta anterior que falló a mitad de
  // camino): nunca recibió su contraseña, así que se le asigna una temporal nueva.
  const { count } = await supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("user_id", userId);
  if (!count) {
    temporaryPassword = newTemporaryPassword();
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: temporaryPassword });
    if (error) {
      console.error("No se pudo asignar una contraseña temporal:", error.message);
      process.exit(1);
    }
  }
} else {
  temporaryPassword = newTemporaryPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    console.error("No se pudo crear el usuario:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
  createdNow = true;
}

/** Si algo falla después de crear la cuenta, se deshace para no dejar usuarios sin estudio. */
async function abort(message, organizationId) {
  console.error(message);
  if (organizationId) await supabase.from("organizations").delete().eq("id", organizationId);
  if (createdNow) await supabase.auth.admin.deleteUser(userId);
  process.exit(1);
}

const { data: organization, error: orgError } = await supabase
  .from("organizations")
  .insert({ name: organizationName })
  .select("id")
  .single();
if (orgError) await abort(`No se pudo crear el estudio: ${orgError.message}`);

const { error: membershipError } = await supabase
  .from("memberships")
  .insert({ organization_id: organization.id, user_id: userId, role: "titular" });
if (membershipError) await abort(`No se pudo asignar la titular: ${membershipError.message}`, organization.id);

console.log("");
console.log(`Estudio "${organizationName}" creado.`);
console.log(`  Titular:              ${email}`);
if (temporaryPassword) {
  console.log(`  Contraseña temporal:  ${temporaryPassword}`);
  console.log("");
  console.log("Guardala en un lugar seguro: no se vuelve a mostrar.");
  console.log("Al ingresar se pedirá activar la verificación en dos pasos.");
} else {
  console.log("  (La cuenta ya existía: ingresa con su contraseña actual.)");
}
