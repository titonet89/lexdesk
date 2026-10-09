// Crea (una sola vez) el usuario titular del panel.
//
// Uso:
//   npm run admin:crear-titular -- --email titular@ejemplo.com --nombre "Dra. Nombre Apellido"
//
// Genera una contraseña temporal aleatoria que se muestra UNA vez en pantalla.
// Al ingresar, el sistema exige activar la verificación en dos pasos; después
// conviene cambiar la contraseña desde Ajustes → Seguridad.
//
// Requiere en el entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
  },
});

const email = values.email?.trim().toLowerCase();
const fullName = values.nombre?.trim();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName) {
  console.error('Uso: npm run admin:crear-titular -- --email titular@ejemplo.com --nombre "Dra. Nombre Apellido"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en el entorno.");
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existing, error: existingError } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("role", "titular")
  .limit(1);

if (existingError) {
  console.error("No se pudo consultar la base:", existingError.message);
  process.exit(1);
}
if (existing.length > 0) {
  console.error(`Ya existe un usuario titular (${existing[0].email}). No se crea otro.`);
  process.exit(1);
}

// Contraseña temporal que cumple la política: mayúsculas, minúsculas y números.
const temporaryPassword = `Tmp-${randomBytes(12).toString("base64url")}9aZ`;

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: temporaryPassword,
  email_confirm: true,
  app_metadata: { role: "titular" },
  user_metadata: { full_name: fullName },
});

if (error) {
  console.error("No se pudo crear el usuario:", error.message);
  process.exit(1);
}

console.log("\nUsuario titular creado:");
console.log(`  Email:                ${data.user.email}`);
console.log(`  Contraseña temporal:  ${temporaryPassword}`);
console.log("\nGuardala en un lugar seguro: no se vuelve a mostrar.");
console.log("Al ingresar se pedirá activar la verificación en dos pasos.\n");
