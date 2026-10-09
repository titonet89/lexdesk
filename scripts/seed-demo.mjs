// Carga datos FICTICIOS de demostración en la base LOCAL (para capturas y pruebas manuales).
//
// Uso: npm run db:seed-demo
// Crea la usuaria demo@lexdesk.demo / Demo-LexDesk-2026 (titular) y datos de ejemplo.
// Al primer ingreso se pide activar el 2FA, como en producción.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  throw new Error("El seed de demostración solo se ejecuta contra Supabase LOCAL.");
}

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const DEMO = { email: "demo@lexdesk.demo", password: "Demo-LexDesk-2026", name: "Dra. Lucía Herrera" };

const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
const previous = users?.users.find((user) => user.email === DEMO.email);
if (previous) {
  // Se eliminan los estudios demo anteriores (borra sus datos en cascada).
  await admin.from("organizations").delete().eq("name", "Estudio Herrera & Asociados");
  await admin.auth.admin.deleteUser(previous.id);
}

const { data: created, error: userError } = await admin.auth.admin.createUser({
  email: DEMO.email,
  password: DEMO.password,
  email_confirm: true,
  user_metadata: { full_name: DEMO.name },
});
if (userError) throw userError;
const owner = created.user.id;

const { data: organization, error: orgError } = await admin
  .from("organizations")
  .insert({ name: "Estudio Herrera & Asociados" })
  .select("id")
  .single();
if (orgError) throw orgError;
const org = organization.id;
await admin.from("memberships").insert({ organization_id: org, user_id: owner, role: "titular" });

/** Fecha y hora en Jujuy (UTC−3) relativas a hoy, como ISO UTC. */
function at(daysFromToday, hours = 9, minutes = 0) {
  // "Hoy" en Jujuy (UTC−3), no en UTC.
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const local = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday, hours + 3, minutes));
  return local.toISOString();
}
const dateOnly = (daysFromToday) => at(daysFromToday, 12).slice(0, 10);

async function insert(table, rows) {
  const { data, error } = await admin.from(table).insert(rows, { defaultToNull: false }).select("id");
  if (error) throw new Error(`${table}: ${error.message}`);
  return data.map((row) => row.id);
}

const [gomez, quispe, vargas, ruiz, mamani] = await insert("clients", [
  { full_name: "Carolina Gómez", document_type: "DNI", document_number: "30111222", phone: "388 400-1001", locality: "San Salvador de Jujuy", created_by: owner, organization_id: org },
  { full_name: "Néstor Quispe", document_type: "DNI", document_number: "27333444", phone: "388 400-1002", locality: "Humahuaca", created_by: owner, organization_id: org },
  { full_name: "Andrea Vargas", document_type: "DNI", document_number: "35555666", phone: "388 400-1003", locality: "Palpalá", created_by: owner, organization_id: org },
  { full_name: "Distribuidora del Norte S.R.L.", kind: "empresa", document_type: "CUIT", document_number: "30-71234567-8", phone: "388 400-1004", locality: "San Salvador de Jujuy", created_by: owner, organization_id: org },
  { full_name: "Rosa Mamani", document_type: "DNI", document_number: "22777888", phone: "388 400-1005", locality: "Maimará", created_by: owner, organization_id: org },
]);

const [m1, m2, m3, m4, m5] = await insert("matters", [
  { client_id: gomez, title: "Gómez, Carolina c/ Ríos, Martín s/ alimentos", area: "familia", status: "activo", file_number: "F-1024/2026", court: "Juzgado de Familia N.º 2", counterpart: "Martín Ríos", opened_on: dateOnly(-60), created_by: owner, organization_id: org },
  { client_id: quispe, title: "Quispe, Néstor s/ sucesión ab intestato", area: "sucesiones", status: "activo", file_number: "S-588/2026", court: "Juzgado Civil y Comercial N.º 1", opened_on: dateOnly(-40), created_by: owner, organization_id: org },
  { client_id: vargas, title: "Vargas, Andrea c/ Transportes Andinos S.A. s/ despido", area: "laboral", status: "activo", file_number: "L-2210/2026", court: "Tribunal del Trabajo, Sala II", counterpart: "Transportes Andinos S.A.", opened_on: dateOnly(-25), created_by: owner, organization_id: org },
  { client_id: ruiz, title: "Distribuidora del Norte S.R.L. c/ Comercial Sur s/ cobro de pesos", area: "civil", status: "en_espera", file_number: "C-731/2026", court: "Juzgado Civil y Comercial N.º 4", counterpart: "Comercial Sur S.A.", opened_on: dateOnly(-90), created_by: owner, organization_id: org },
  { client_id: mamani, title: "Mamani, Rosa s/ medidas de protección", area: "violencia_genero", status: "activo", is_sensitive: true, court: "Juzgado de Violencia Familiar N.º 1", opened_on: dateOnly(-10), created_by: owner, organization_id: org },
]);

await insert("matter_entries", [
  { matter_id: m1, occurred_on: dateOnly(-60), kind: "escrito", summary: "Se presentó demanda de alimentos", created_by: owner },
  { matter_id: m1, occurred_on: dateOnly(-30), kind: "resolucion", summary: "Se fijó cuota provisoria", created_by: owner },
  { matter_id: m1, occurred_on: dateOnly(-5), kind: "notificacion", summary: "Notificación de traslado a la contraparte", created_by: owner },
  { matter_id: m2, occurred_on: dateOnly(-40), kind: "escrito", summary: "Inicio de sucesión y publicación de edictos", created_by: owner },
  { matter_id: m2, occurred_on: dateOnly(-3), kind: "resolucion", summary: "Se dictó declaratoria de herederos", created_by: owner },
  { matter_id: m3, occurred_on: dateOnly(-25), kind: "escrito", summary: "Demanda por despido sin causa", created_by: owner },
  { matter_id: m3, occurred_on: dateOnly(-2), kind: "audiencia", summary: "Audiencia de conciliación sin acuerdo", created_by: owner },
  { matter_id: m5, occurred_on: dateOnly(-10), kind: "resolucion", summary: "Se ordenó exclusión del hogar y prohibición de acercamiento", created_by: owner },
]);

await insert("events", [
  { matter_id: m3, title: "Ofrecer prueba", kind: "vencimiento", priority: "critica", starts_at: at(2, 9), deadline_from: dateOnly(-3), deadline_business_days: 5, created_by: owner, organization_id: org },
  { matter_id: m1, title: "Audiencia de alimentos", kind: "audiencia", priority: "alta", starts_at: at(3, 10, 30), ends_at: at(3, 11, 30), location: "Juzgado de Familia N.º 2", created_by: owner, organization_id: org },
  { matter_id: m2, title: "Inscribir declaratoria en el Registro", kind: "tramite", starts_at: at(5, 11), created_by: owner, organization_id: org },
  { title: "Primera consulta: reclamo de alquiler", kind: "reunion", starts_at: at(1, 17), ends_at: at(1, 18), location: "Videollamada", created_by: owner, organization_id: org },
  { matter_id: m4, title: "Contestar traslado de excepciones", kind: "vencimiento", priority: "alta", starts_at: at(8, 9), created_by: owner, organization_id: org },
  { matter_id: m5, title: "Control de medidas de protección", kind: "audiencia", priority: "critica", starts_at: at(10, 9, 30), created_by: owner, organization_id: org },
  { matter_id: m1, title: "Presentar liquidación de cuota", kind: "vencimiento", starts_at: at(-1, 9), created_by: owner, organization_id: org },
  { title: "Renovar matrícula profesional", kind: "recordatorio", starts_at: at(20, 9), all_day: true, created_by: owner, organization_id: org },
]);

const year = new Date().getUTCFullYear();
await admin.from("non_working_days").upsert(
  [
    { organization_id: org, day: `${year}-12-08`, kind: "feriado", description: "Inmaculada Concepción de María" },
    { organization_id: org, day: `${year}-12-25`, kind: "feriado", description: "Navidad" },
    { organization_id: org, day: `${year + 1}-01-01`, kind: "feriado", description: "Año Nuevo" },
  ],
  { onConflict: "organization_id,day" },
);

console.log(`\nDatos de demostración cargados.\n  Usuario: ${DEMO.email}\n  Contraseña: ${DEMO.password}\n`);
