import { expect, test, type Page } from "@playwright/test";
import { clearMailbox, deleteUserIfExists, recreateUser, waitForAuthLink } from "./helpers/supabase-admin";
import { totp } from "./helpers/totp";

const TITULAR = { email: "titular.e2e@test.local", password: "Prueba-Segura-2026", name: "Dra. Prueba Titular" };

/** Secreto TOTP capturado al activar el 2FA (compartido entre pruebas en serie). */
let titularSecret = "";
let lastCode = "";

test.describe.configure({ mode: "serial", timeout: 120_000 });

/** Código TOTP vigente, esperando al siguiente período si ya se usó este. */
async function freshCode(page: Page, secret: string): Promise<string> {
  let code = totp(secret);
  while (code === lastCode) {
    await page.waitForTimeout(1000);
    code = totp(secret);
  }
  lastCode = code;
  return code;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/acceso");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

async function loginAsTitular(page: Page) {
  await login(page, TITULAR.email, TITULAR.password);
  await page.waitForURL(/\/acceso\/verificar/);
  await page.getByLabel("Código de verificación").fill(await freshCode(page, titularSecret));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL(/\/panel$/);
}

test.beforeAll(async () => {
  await recreateUser(TITULAR.email, TITULAR.password, "titular", TITULAR.name);
});

test("el panel exige iniciar sesión", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("una contraseña incorrecta muestra un error genérico", async ({ page }) => {
  await login(page, TITULAR.email, "Incorrecta-12345");
  await expect(page.getByTestId("login-form").getByRole("alert")).toHaveText("Email o contraseña incorrectos.");
  await expect(page).toHaveURL(/\/acceso$/);
});

test("el primer ingreso obliga a activar el 2FA", async ({ page }) => {
  await login(page, TITULAR.email, TITULAR.password);
  await page.waitForURL(/\/acceso\/activar-2fa/);

  // Sin 2FA no se puede entrar al panel.
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/acceso\/activar-2fa/);

  await expect(page.getByRole("img", { name: "Código QR para la app de autenticación" })).toBeVisible();
  await page.getByText("¿No podés escanear?").click();
  titularSecret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  expect(titularSecret.length).toBeGreaterThan(10);

  await page.getByLabel("Código de la app").fill("000000");
  await page.getByRole("button", { name: "Activar y continuar" }).click();
  await expect(page.getByTestId("enroll-form").getByRole("alert")).toContainText("El código no coincide");

  await page.getByLabel("Código de la app").fill(await freshCode(page, titularSecret));
  await page.getByRole("button", { name: "Activar y continuar" }).click();
  await page.waitForURL(/\/panel$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hola");
});

test("los ingresos siguientes piden el código de verificación", async ({ page }) => {
  await login(page, TITULAR.email, TITULAR.password);
  await page.waitForURL(/\/acceso\/verificar/);

  // Con contraseña pero sin el segundo paso, el panel sigue cerrado.
  await page.goto("/panel/clientes");
  await expect(page).toHaveURL(/\/acceso\/verificar/);

  await page.getByLabel("Código de verificación").fill(await freshCode(page, titularSecret));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL(/\/panel$/);
});

test("la titular da de alta y edita un cliente", async ({ page }) => {
  await loginAsTitular(page);
  await page.getByRole("link", { name: "Clientes" }).first().click();
  await page.getByRole("link", { name: "Nuevo cliente" }).first().click();

  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByText("Nombre: mínimo 2 caracteres.")).toBeVisible();

  await page.getByLabel(/Nombre y apellido/).fill("María Quispe");
  await page.getByLabel("Documento").selectOption("DNI");
  await page.getByLabel("Número").fill("30111222");
  await page.getByLabel("Teléfono / WhatsApp").fill("388 412 3456");
  await page.getByLabel("Localidad").fill("Humahuaca");
  await page.getByRole("button", { name: "Guardar cliente" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "María Quispe" })).toBeVisible();
  await expect(page.getByText("DNI 30111222")).toBeVisible();
  // "388 412 3456" se normaliza al formato internacional de WhatsApp.
  await expect(page.getByTestId("client-whatsapp")).toHaveAttribute("href", /^https:\/\/wa\.me\/5493884123456\?text=Hola%20Mar%C3%ADa/);

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Email").fill("maria@example.com");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByRole("link", { name: "maria@example.com" })).toBeVisible();
});

test("cerrar sesión impide volver al panel", async ({ page }) => {
  await loginAsTitular(page);
  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  await expect(page).toHaveURL(/\/acceso\?estado=sesion-cerrada/);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/acceso$/);
});

test.describe("gestión del estudio", () => {
  const RUN = Date.now().toString(36);
  const CLIENT = `Cliente ${RUN}`;
  const MATTER = `${CLIENT} c/ Pérez s/ sucesión`;
  const COLLEAGUE = { email: "colega.e2e@test.local", password: "Colega-Segura-2026", name: `Dr. Colega ${RUN}` };
  let titularPage: Page;
  let matterUrl = "";
  let colleagueSecret = "";
  let otherSecret = "";
  let otherTitularPage: Page;

  test.beforeAll(async ({ browser }) => {
    await deleteUserIfExists(COLLEAGUE.email);
    await clearMailbox();
    titularPage = await (await browser.newContext()).newPage();
    await loginAsTitular(titularPage);
  });

  test("crea un expediente y registra actuaciones", async () => {
    const page = titularPage;
    await page.goto("/panel/clientes/nuevo");
    await page.getByLabel(/Nombre y apellido/).fill(CLIENT);
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await page.getByRole("link", { name: "Nuevo expediente" }).click();

    await page.getByLabel("Carátula").fill(MATTER);
    await page.getByLabel("Área").selectOption("sucesiones");
    await page.getByLabel("Estado").selectOption("activo");
    await page.getByLabel("N.º de expediente").fill(`S-${RUN}`);
    await page.getByLabel("Año").fill("2026");
    await page.getByLabel("Fuero").fill("Civil y Comercial");
    await page.getByLabel("Juzgado / organismo").fill("Juzgado Civil y Comercial N.º 1");
    await page.getByLabel("Secretaría").fill("Sec. N.º 2");
    await page.getByLabel("Abogado/a de la contraparte").fill("Dr. Contrario");
    await page.getByRole("button", { name: "Guardar expediente" }).click();

    await expect(page.getByRole("heading", { level: 1, name: MATTER })).toBeVisible();
    matterUrl = new URL(page.url()).pathname;
    await expect(page.getByText("Etapa: Iniciación")).toBeVisible();
    await expect(page.getByText(`Expte. N.º S-${RUN}/2026`).first()).toBeVisible();
    await expect(page.getByText("Sec. N.º 2")).toBeVisible();
    await expect(page.getByText("Dr. Contrario")).toBeVisible();

    await page.getByRole("link", { name: "Actuaciones" }).click();
    await page.getByLabel("Resumen").fill("Se inició la sucesión");
    await page.getByRole("button", { name: "Registrar actuación" }).click();
    await expect(page.getByTestId("entries-list")).toContainText("Se inició la sucesión");
  });

  test("el tablero mueve expedientes de etapa y lo registra en el historial", async () => {
    const page = titularPage;
    await page.goto(`/panel/expedientes?vista=tablero&q=${RUN}`);
    const card = page.getByTestId("board-card").filter({ hasText: MATTER });
    await expect(page.getByTestId("board-column-iniciacion")).toContainText(MATTER);

    // 1) Con el menú "Mover a…" (alternativa accesible al arrastre).
    await card.getByTestId("board-move").selectOption("prueba");
    await expect(page.getByTestId("board-column-prueba")).toContainText(MATTER);
    // Se espera a que termine la actualización del servidor antes de arrastrar.
    await page.reload();
    await expect(page.getByTestId("board-column-prueba")).toContainText(MATTER);

    // 2) Arrastrando con el mouse hasta la columna "Sentencia".
    const handle = card.getByRole("button", { name: `Arrastrar ${MATTER}` });
    const target = page.getByTestId("board-column-sentencia");
    // Columna de origen al inicio del tablero: origen y destino quedan visibles a la vez.
    await page.getByTestId("board-column-prueba").evaluate((column) => column.scrollIntoView({ inline: "start", block: "nearest" }));
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 15 });
    await page.mouse.up();
    await expect(page.getByTestId("board-column-sentencia")).toContainText(MATTER);

    // Persistencia y registro automático en el historial.
    await page.reload();
    await expect(page.getByTestId("board-column-sentencia")).toContainText(MATTER);
    await page.goto(`${matterUrl}?seccion=actuaciones`);
    await expect(page.getByTestId("entries-list")).toContainText("Cambio de etapa: Iniciación → Prueba");
    await expect(page.getByTestId("entries-list")).toContainText("Cambio de etapa: Prueba → Sentencia");
  });

  test("la paleta de comandos busca y navega con el teclado", async () => {
    const page = titularPage;
    await page.goto("/panel");
    await page.keyboard.press("Control+K");
    const input = page.getByPlaceholder("Buscar expedientes, clientes o acciones…");
    await expect(input).toBeFocused();

    await input.fill(RUN);
    const list = page.getByTestId("command-list");
    await expect(list.getByRole("option", { name: new RegExp(MATTER.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")) })).toBeVisible();
    await expect(list.getByRole("option", { name: CLIENT, exact: true })).toBeVisible();

    // Enter abre el primer resultado (el expediente).
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === matterUrl);

    // Acciones rápidas: "nuevo cliente" en dos teclas.
    await page.keyboard.press("Control+K");
    await page.getByPlaceholder("Buscar expedientes, clientes o acciones…").fill("nuevo cliente");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/panel\/clientes\/nuevo$/);
  });

  test("el modo oscuro se aplica y se recuerda", async () => {
    const page = titularPage;
    await page.goto("/panel");
    await page.locator("aside").getByRole("button", { name: "Tema oscuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const darkCanvas = await page.locator("#panel-contenido").evaluate((el) => getComputedStyle(el.parentElement!).backgroundColor);
    expect(darkCanvas).toBe("rgb(11, 18, 32)");

    await page.reload();
    await expect(page.locator("[data-theme='dark']").first()).toBeVisible();
    await expect(page.locator("aside").getByRole("button", { name: "Tema oscuro" })).toHaveAttribute("aria-pressed", "true");

    await page.locator("aside").getByRole("button", { name: "Tema claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("sube un documento, lo descarga y queda auditado", async () => {
    const page = titularPage;
    await page.goto(`${matterUrl}?seccion=documentos`);
    await page.getByTestId("document-input").setInputFiles({
      name: "Partida de defunción.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% prueba E2E\n"),
    });
    await expect(page.getByTestId("documents-list")).toContainText("Partida de defunción.pdf");

    // Un tipo no permitido se rechaza antes de subir.
    await page.getByTestId("document-input").setInputFiles({
      name: "virus.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ"),
    });
    await expect(page.getByText("tipo de archivo no permitido")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar Partida de defunción.pdf" }).click();
    expect((await download).suggestedFilename()).toBe("Partida de defunción.pdf");

    await page.goto("/panel/ajustes/auditoria?tabla=documents");
    await expect(page.getByTestId("audit-table")).toContainText("Descarga");
  });

  test("agenda un vencimiento con la calculadora de días hábiles", async () => {
    const page = titularPage;
    await page.goto("/panel/ajustes/feriados");
    await page.getByLabel("Desde").fill("2026-11-18");
    await page.getByLabel("Descripción").fill(`Asueto de prueba ${RUN}`);
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByTestId("non-working-list")).toContainText(`Asueto de prueba ${RUN}`);

    await page.goto(`${matterUrl}?seccion=agenda`);
    await page.getByRole("link", { name: "Agendar" }).first().click();
    await page.getByLabel("Título").fill("Contestar vista");
    await page.getByLabel("Tipo").selectOption("vencimiento");
    await page.getByLabel("Notificado el").fill("2026-11-13");
    await page.getByLabel("Días hábiles").fill("5");
    await expect(page.getByTestId("deadline-result")).toHaveText("lunes 23 de noviembre de 2026");
    await expect(page.getByTestId("deadline-calculator")).toContainText(`Asueto de prueba ${RUN}`);
    await page.getByRole("button", { name: "Usar fecha" }).click();
    await expect(page.getByLabel(/^Fecha\s*\*?$/)).toHaveValue("2026-11-23");
    await page.getByRole("button", { name: "Guardar evento" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Contestar vista" })).toBeVisible();
    await expect(page.getByText("lunes 23 de noviembre de 2026")).toBeVisible();
    await expect(page.getByText("Plazo de 5 días hábiles")).toBeVisible();

    await page.goto("/panel/agenda?mes=2026-11");
    await expect(page.getByTestId("month-events")).toContainText("Contestar vista");
  });

  test("invita a un colega que entra con su propia contraseña y 2FA", async ({ browser }) => {
    const page = titularPage;
    await page.goto("/panel/colaboradores");
    await page.getByLabel("Nombre y apellido").fill(COLLEAGUE.name);
    await page.getByLabel("Email").fill(COLLEAGUE.email);
    await page.getByRole("button", { name: "Enviar invitación" }).click();
    await expect(page.getByTestId("invite-form").getByRole("status")).toContainText("Enviamos la invitación");

    const link = new URL(await waitForAuthLink(COLLEAGUE.email));
    const colleague = await (await browser.newContext()).newPage();
    await colleague.goto(`${link.pathname}${link.search}`);
    await colleague.waitForURL(/\/acceso\/nueva-clave/);
    await colleague.getByLabel("Contraseña nueva").fill(COLLEAGUE.password);
    await colleague.getByLabel("Repetir contraseña").fill(COLLEAGUE.password);
    await colleague.getByRole("button", { name: "Guardar contraseña" }).click();

    await colleague.waitForURL(/\/acceso\/activar-2fa/);
    await colleague.getByText("¿No podés escanear?").click();
    colleagueSecret = (await colleague.getByTestId("totp-secret").textContent())?.trim() ?? "";
    await colleague.getByLabel("Código de la app").fill(await freshCode(colleague, colleagueSecret));
    await colleague.getByRole("button", { name: "Activar y continuar" }).click();
    await colleague.waitForURL(/\/panel$/);
    await expect(colleague.getByText("No tenés expedientes compartidos")).toBeVisible();

    // Sin compartir, el expediente no existe para el colega.
    const response = await colleague.goto(matterUrl);
    expect(response?.status()).toBe(404);
    // Tampoco puede entrar a módulos de la titular.
    await colleague.goto("/panel/clientes");
    await expect(colleague).toHaveURL(/\/panel$/);
    await colleague.context().close();
  });

  test("comparte el expediente y el colega deja una observación", async ({ browser }) => {
    const page = titularPage;
    await page.goto(`${matterUrl}?seccion=colaboracion`);
    await page.getByLabel("Colaborador/a").selectOption({ label: COLLEAGUE.name });
    await page.getByLabel("Permiso").selectOption("comentario");
    await page.getByRole("button", { name: "Compartir expediente" }).click();
    await expect(page.getByTestId("shares-list")).toContainText(COLLEAGUE.name);

    const colleague = await (await browser.newContext()).newPage();
    await login(colleague, COLLEAGUE.email, COLLEAGUE.password);
    await colleague.waitForURL(/\/acceso\/verificar/);
    await colleague.getByLabel("Código de verificación").fill(await freshCode(colleague, colleagueSecret));
    await colleague.getByRole("button", { name: "Verificar" }).click();
    await colleague.waitForURL(/\/panel$/);

    await colleague.getByRole("link", { name: MATTER }).click();
    await expect(colleague.getByRole("heading", { level: 1, name: MATTER })).toBeVisible();
    // No ve la agenda ni los documentos (no se incluyeron), ni el vínculo al cliente.
    await expect(colleague.getByRole("link", { name: "Agenda", exact: true })).toHaveCount(0);
    await expect(colleague.getByRole("link", { name: "Documentos" })).toHaveCount(0);
    await expect(colleague.getByRole("link", { name: CLIENT })).toHaveCount(0);

    await colleague.getByRole("link", { name: "Observaciones" }).click();
    await colleague.getByLabel("Observación").fill("Sugiero pedir informe al Registro de la Propiedad.");
    await colleague.getByRole("button", { name: "Publicar observación" }).click();
    await expect(colleague.getByTestId("comments-list")).toContainText("Registro de la Propiedad");
    await colleague.context().close();

    await page.reload();
    await expect(page.getByTestId("comments-list")).toContainText("Registro de la Propiedad");
  });

  test("la titular de otro estudio no puede ver estos datos", async ({ browser }) => {
    const other = { email: "titular.b.e2e@test.local", password: "Otro-Estudio-2026", name: `Dra. Otra ${RUN}` };
    await recreateUser(other.email, other.password, "titular", other.name);

    const page = await (await browser.newContext()).newPage();
    await login(page, other.email, other.password);
    await page.waitForURL(/activar-2fa/);
    await page.getByText("¿No podés escanear?").click();
    otherSecret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
    await page.getByLabel("Código de la app").fill(await freshCode(page, otherSecret));
    await page.getByRole("button", { name: "Activar y continuar" }).click();
    await page.waitForURL(/\/panel$/);
    await expect(page.getByTestId("active-organization").first()).toHaveText(`Estudio ${other.name}`);

    // El expediente del primer estudio no existe para ella, ni por URL directa.
    const response = await page.goto(matterUrl);
    expect(response?.status()).toBe(404);
    await page.goto(`/panel/clientes?q=${encodeURIComponent(CLIENT)}`);
    await expect(page.getByText("Sin resultados")).toBeVisible();
    otherTitularPage = page;
  });

  test("el mismo colega puede colaborar con dos estudios", async ({ browser }) => {
    // El segundo estudio invita al colega que ya tiene cuenta: se lo suma sin crear otra.
    await otherTitularPage.goto("/panel/colaboradores");
    await otherTitularPage.getByLabel("Nombre y apellido").fill(COLLEAGUE.name);
    await otherTitularPage.getByLabel("Email").fill(COLLEAGUE.email);
    await otherTitularPage.getByRole("button", { name: "Enviar invitación" }).click();
    await expect(otherTitularPage.getByTestId("invite-form").getByRole("status")).toContainText("ya tenía cuenta");
    await otherTitularPage.context().close();

    const colleague = await (await browser.newContext()).newPage();
    await login(colleague, COLLEAGUE.email, COLLEAGUE.password);
    await colleague.waitForURL(/\/acceso\/verificar/);
    await colleague.getByLabel("Código de verificación").fill(await freshCode(colleague, colleagueSecret));
    await colleague.getByRole("button", { name: "Verificar" }).click();
    await colleague.waitForURL(/\/panel$/);

    // Ve el selector con los dos estudios y puede cambiar entre ellos.
    const switcher = colleague.locator("aside").getByTestId("active-organization");
    for (const target of [`Estudio ${TITULAR.name}`, "Estudio Dra. Otra"]) {
      await colleague.locator("aside summary").click();
      await colleague.locator("aside").getByRole("button", { name: new RegExp(target.replace(/\./g, "\\.")) }).click();
      await expect(switcher).toContainText(target);
    }
    await colleague.context().close();
  });

  test("marcar el expediente como sensible revoca el acceso del colega", async () => {
    const page = titularPage;
    await page.goto(`${matterUrl}/editar`);
    await page.getByLabel(/Expediente sensible/).check();
    await page.getByRole("button", { name: "Guardar expediente" }).click();
    await page.waitForURL((url) => url.pathname === matterUrl);
    await expect(page.getByText("Sensible", { exact: true })).toBeVisible();
    await page.goto(`${matterUrl}?seccion=colaboracion`);
    await expect(page.getByText("no puede compartirse")).toBeVisible();
    await expect(page.getByTestId("shares-list")).toHaveCount(0);
  });
});
