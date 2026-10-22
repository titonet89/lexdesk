// Carga datos FICTICIOS de demostración (para capturas, pruebas manuales y la demo pública).
//
// Uso: npm run db:seed-demo                       (base LOCAL)
//      npm run db:seed-demo:nube                  (base de la DEMO en la nube, ver .env.demo.local)
// Crea la usuaria demo@lexdesk.demo (titular) y datos de ejemplo. Localmente, al
// primer ingreso se pide activar el 2FA; en la demo lo completa el botón "Entrar a la demo".

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
/** Proyecto del sistema REAL: el seed borra y recrea datos, así que nunca puede correr ahí. */
const PRODUCTION_REF = "auagltrcdwticvbiezvf";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
if (url.includes(PRODUCTION_REF)) throw new Error("El seed de demostración NUNCA se ejecuta contra la base real.");
if (!isLocal && process.env.LEXDESK_DEMO_SEED !== "1") {
  throw new Error("Fuera de la base local, el seed solo corre contra la DEMO (LEXDESK_DEMO_SEED=1).");
}

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const DEMO = {
  email: process.env.DEMO_USER_EMAIL ?? "demo@lexdesk.demo",
  password: process.env.DEMO_USER_PASSWORD ?? "Demo-LexDesk-2026",
  name: "Dra. Lucía Herrera",
};

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
  { client_id: gomez, title: "Gómez, Carolina c/ Ríos, Martín s/ alimentos", area: "familia", status: "activo", stage: "prueba", file_number: "F-1024/2026", forum: "Familia", court: "Juzgado de Familia N.º 2", secretariat: "Sec. N.º 3", counterpart: "Martín Ríos", counterpart_lawyer: "Dr. Pablo Sosa", opened_on: dateOnly(-60), created_by: owner, organization_id: org },
  { client_id: quispe, title: "Quispe, Néstor s/ sucesión ab intestato", area: "sucesiones", status: "activo", stage: "sentencia", file_number: "S-588/2026", forum: "Civil y Comercial", court: "Juzgado Civil y Comercial N.º 1", secretariat: "Sec. N.º 2", opened_on: dateOnly(-40), created_by: owner, organization_id: org },
  { client_id: vargas, title: "Vargas, Andrea c/ Transportes Andinos S.A. s/ despido", area: "laboral", status: "activo", stage: "tramite", file_number: "L-2210/2026", forum: "Laboral", court: "Tribunal del Trabajo, Sala II", counterpart: "Transportes Andinos S.A.", counterpart_lawyer: "Dra. Inés Paredes", opened_on: dateOnly(-25), created_by: owner, organization_id: org },
  { client_id: ruiz, title: "Distribuidora del Norte S.R.L. c/ Comercial Sur s/ cobro de pesos", area: "civil", status: "en_espera", stage: "recursos", file_number: "C-731/2026", forum: "Civil y Comercial", court: "Juzgado Civil y Comercial N.º 4", secretariat: "Sec. N.º 8", counterpart: "Comercial Sur S.A.", opened_on: dateOnly(-90), created_by: owner, organization_id: org },
  { client_id: mamani, title: "Mamani, Rosa s/ medidas de protección", area: "violencia_genero", status: "activo", stage: "iniciacion", is_sensitive: true, forum: "Violencia Familiar y de Género", court: "Juzgado de Violencia Familiar N.º 1", opened_on: dateOnly(-10), created_by: owner, organization_id: org },
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
  { matter_id: m3, title: "Ofrecer prueba", kind: "vencimiento", priority: "critica", is_peremptory: true, starts_at: at(2, 9), deadline_from: dateOnly(-3), deadline_business_days: 5, created_by: owner, organization_id: org },
  { matter_id: m1, title: "Audiencia de alimentos", kind: "audiencia", priority: "alta", starts_at: at(3, 10, 30), ends_at: at(3, 11, 30), location: "Juzgado de Familia N.º 2", created_by: owner, organization_id: org },
  { matter_id: m2, title: "Inscribir declaratoria en el Registro", kind: "tramite", starts_at: at(5, 11), created_by: owner, organization_id: org },
  { title: "Primera consulta: reclamo de alquiler", kind: "reunion", starts_at: at(1, 17), ends_at: at(1, 18), location: "Videollamada", created_by: owner, organization_id: org },
  { matter_id: m4, title: "Contestar traslado de excepciones", kind: "vencimiento", priority: "alta", starts_at: at(8, 9), created_by: owner, organization_id: org },
  { matter_id: m5, title: "Control de medidas de protección", kind: "audiencia", priority: "critica", starts_at: at(10, 9, 30), created_by: owner, organization_id: org },
  { matter_id: m1, title: "Presentar liquidación de cuota", kind: "vencimiento", starts_at: at(-1, 9), created_by: owner, organization_id: org },
  { matter_id: m4, title: "Presentar memorial de agravios", kind: "escrito", priority: "alta", is_peremptory: true, starts_at: at(4, 9), created_by: owner, organization_id: org },
  { matter_id: m1, title: "Diligenciar cédula al demandado", kind: "cedula", starts_at: at(6, 10), created_by: owner, organization_id: org },
  { title: "Renovar matrícula profesional", kind: "recordatorio", starts_at: at(20, 9), all_day: true, created_by: owner, organization_id: org },
]);

// Honorarios y gastos (UMA de referencia: $ 55.786).
const UMA = 55786;
const [feeAlimentos, , feeSucesion, feeConsulta, gastoCedulas] = await insert("matter_charges", [
  { matter_id: m1, kind: "honorario", concept: "Alimentos (15 UMA)", amount: 15 * UMA, uma_quantity: 15, uma_value: UMA, charged_on: dateOnly(-55), created_by: owner },
  { matter_id: m1, kind: "gasto", concept: "Tasa de justicia", amount: 45000, charged_on: dateOnly(-58), created_by: owner },
  { matter_id: m2, kind: "honorario", concept: "Honorarios 20% s/ inventario ($ 38.000.000)", amount: 7600000, charged_on: dateOnly(-20), due_on: dateOnly(-5), created_by: owner },
  { matter_id: m3, kind: "honorario", concept: "Consulta escrita (8 UMA)", amount: 8 * UMA, uma_quantity: 8, uma_value: UMA, charged_on: dateOnly(-30), created_by: owner },
  { matter_id: m4, kind: "gasto", concept: "Cédulas y copias certificadas", amount: 18500, charged_on: dateOnly(-12), created_by: owner },
]);
const charges = await admin.from("matter_charges").select("id, concept").in("matter_id", [m1]);
const tasa = charges.data.find((row) => row.concept === "Tasa de justicia").id;
await insert("charge_payments", [
  { charge_id: feeAlimentos, amount: 400000, paid_on: dateOnly(-40), method: "transferencia", created_by: owner },
  { charge_id: tasa, amount: 45000, paid_on: dateOnly(-58), method: "efectivo", created_by: owner },
  { charge_id: feeSucesion, amount: 1500000, paid_on: dateOnly(-18), method: "transferencia", created_by: owner },
  { charge_id: feeConsulta, amount: 8 * UMA, paid_on: dateOnly(-30), method: "transferencia", created_by: owner },
]);
void gastoCedulas;

const year = new Date().getUTCFullYear();
await admin.from("non_working_days").upsert(
  [
    { organization_id: org, day: `${year}-12-08`, kind: "feriado", description: "Inmaculada Concepción de María" },
    { organization_id: org, day: `${year}-12-25`, kind: "feriado", description: "Navidad" },
    { organization_id: org, day: `${year + 1}-01-01`, kind: "feriado", description: "Año Nuevo" },
  ],
  { onConflict: "organization_id,day" },
);

console.log(`\nDatos de demostración cargados.\n  Usuario: ${DEMO.email}${isLocal ? `\n  Contraseña: ${DEMO.password}` : ""}\n`);
