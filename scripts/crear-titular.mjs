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

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
    estudio: { type: "string" },
  },
});

const email = values.email?.trim().toLowerCase();
const fullName = values.nombre?.trim();
const organizationName = values.estudio?.trim() || (fullName ? `Estudio ${fullName}` : "");

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

const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
let userId = existing?.id ?? null;
let temporaryPassword = null;

if (!userId) {
  // Contraseña temporal que cumple la política: mayúsculas, minúsculas y números.
  temporaryPassword = `Tmp-${randomBytes(12).toString("base64url")}9aZ`;
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
}

const { data: organization, error: orgError } = await supabase
  .from("organizations")
  .insert({ name: organizationName })
  .select("id")
  .single();
if (orgError) {
  console.error("No se pudo crear el estudio:", orgError.message);
  process.exit(1);
}

const { error: membershipError } = await supabase
  .from("memberships")
  .insert({ organization_id: organization.id, user_id: userId, role: "titular" });
if (membershipError) {
  console.error("No se pudo asignar la titular:", membershipError.message);
  process.exit(1);
}

console.log(`\nEstudio "${organizationName}" creado.`);
console.log(`  Titular:              ${email}`);
if (temporaryPassword) {
  console.log(`  Contraseña temporal:  ${temporaryPassword}`);
  console.log("\nGuardala en un lugar seguro: no se vuelve a mostrar.");
  console.log("Al ingresar se pedirá activar la verificación en dos pasos.\n");
} else {
  console.log("  (La cuenta ya existía: ingresa con su contraseña actual.)\n");
}
