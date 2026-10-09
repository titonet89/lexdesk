import { test } from "@playwright/test";
import { totp } from "./helpers/totp";

/**
 * Genera las capturas del README en docs/screenshots.
 * Solo corre a pedido:  npm run db:seed-demo && CAPTURAS=1 npx playwright test tests/capturas.spec.ts --project=desktop
 */
const DIR = "docs/screenshots";
test.skip(!process.env.CAPTURAS, "Solo se ejecuta con CAPTURAS=1");
test.setTimeout(180_000);

test("capturas del README", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.goto("/");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DIR}/sitio-publico.png` });

  await page.goto("/acceso");
  await page.getByLabel("Email").fill("demo@lexdesk.demo");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo-LexDesk-2026");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/activar-2fa/);
  await page.getByText("¿No podés escanear?").click();
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Código de la app").fill(totp(secret));
  await page.getByRole("button", { name: "Activar y continuar" }).click();
  await page.waitForURL(/\/panel$/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/panel-inicio.png` });

  await page.keyboard.press("Control+K");
  await page.getByPlaceholder("Buscar expedientes, clientes o acciones…").fill("gómez");
  await page.getByTestId("command-list").getByRole("option").first().waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/panel-paleta.png` });
  await page.keyboard.press("Escape");

  await page.locator("aside").getByRole("button", { name: "Tema oscuro" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/panel-oscuro.png` });
  await page.goto("/panel/agenda");
  await page.screenshot({ path: `${DIR}/panel-agenda-oscuro.png` });
  await page.locator("aside").getByRole("button", { name: "Tema claro" }).click();

  await page.goto("/panel/agenda");
  await page.screenshot({ path: `${DIR}/panel-agenda.png` });

  await page.goto("/panel/expedientes?vista=tablero");
  await page.getByTestId("stage-board").waitFor();
  await page.screenshot({ path: `${DIR}/panel-tablero.png` });

  await page.goto("/panel/expedientes");
  await page.getByRole("link", { name: /Gómez, Carolina/ }).click();
  await page.waitForURL(/expedientes\/[0-9a-f-]+$/);
  await page.goto(`${page.url()}?seccion=actuaciones`);
  await page.screenshot({ path: `${DIR}/panel-expediente.png` });

  await page.goto("/panel/agenda/nuevo");
  await page.getByLabel("Título").fill("Contestar demanda");
  await page.getByLabel("Notificado el").fill("2026-12-04");
  await page.getByLabel("Días hábiles").fill("5");
  await page.getByRole("button", { name: "Usar fecha" }).click();
  await page.screenshot({ path: `${DIR}/panel-plazos.png` });

  const cookies = await context.cookies();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.addCookies(cookies);
  const phone = await mobile.newPage();
  await phone.goto("/");
  await phone.waitForTimeout(1200);
  await phone.screenshot({ path: `${DIR}/sitio-movil.png` });
  await phone.goto("/panel");
  await phone.screenshot({ path: `${DIR}/panel-movil.png` });
});
