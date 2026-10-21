import { expect, test, type Page } from "@playwright/test";
import { recreateUser } from "./helpers/supabase-admin";
import { totp } from "./helpers/totp";

const USER = { email: "passkey.e2e@test.local", password: "Prueba-Segura-2026", name: "Dra. Prueba Huella" };

test.describe.configure({ mode: "serial", timeout: 120_000 });

/**
 * Lector de huella simulado (WebAuthn virtual de Chrome): responde como el
 * sensor de un celular o Windows Hello, con verificación del usuario.
 */
async function addFingerprintReader(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}

let page: Page;
let secret = "";
let lastCode = "";

/** Código TOTP vigente; espera al siguiente período si este ya se usó (Supabase no acepta repetirlo). */
async function nextCode(page: Page): Promise<string> {
  let code = totp(secret);
  while (code === lastCode) {
    await page.waitForTimeout(1000);
    code = totp(secret);
  }
  lastCode = code;
  return code;
}

test.beforeAll(async ({ browser }) => {
  await recreateUser(USER.email, USER.password, "titular", USER.name);
  page = await browser.newPage();
  await addFingerprintReader(page);
});

test.afterAll(async () => {
  await page.close();
});

test("después de activar el 2FA se ofrece la huella y queda activada", async () => {
  await page.goto("/acceso");
  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL(/\/acceso\/activar-2fa/);

  await page.getByText("¿No podés escanear?").click();
  secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Código de la app").fill(await nextCode(page));
  await page.getByRole("button", { name: "Activar y continuar" }).click();

  await page.waitForURL(/\/acceso\/activar-huella/);
  await page.getByRole("button", { name: "Activar huella en este dispositivo" }).click();
  await page.waitForURL(/\/panel$/);
});

test("con la huella activada, se ingresa con un solo toque", async () => {
  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  await page.waitForURL(/\/acceso\?estado=sesion-cerrada/);

  // En este dispositivo ya se usa la huella: el formulario de contraseña queda oculto.
  await expect(page.getByLabel("Email")).toBeHidden();
  await page.getByRole("button", { name: "Ingresar con huella o rostro" }).click();
  await page.waitForURL(/\/panel$/);

  // La base de datos acepta la sesión con passkey (RLS): se puede cargar un cliente.
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel(/Nombre y apellido/).fill("Cliente Huella");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cliente Huella" })).toBeVisible();
});

test("Seguridad lista el dispositivo y permite quitarlo", async () => {
  await page.goto("/panel/ajustes/seguridad");
  const devices = page.getByRole("list", { name: "Dispositivos con huella activada" });
  await expect(devices.getByRole("listitem")).toHaveCount(1);
  await expect(devices).toContainText(/Windows|Linux|Mac/);

  // Con sesión de huella, agregar otro dispositivo pide confirmar con el código.
  await expect(page.getByRole("link", { name: "Confirmar con el código para agregar un dispositivo" })).toBeVisible();

  // Cambiar la contraseña también exige el código.
  await expect(page.getByTestId("new-password-form")).toBeHidden();
  await page.getByRole("link", { name: "Confirmar con el código para cambiar la contraseña" }).click();
  await page.waitForURL(/\/acceso\/verificar/);
  await page.getByLabel("Código de verificación").fill(await nextCode(page));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL(/\/panel\/ajustes\/seguridad$/);
  await expect(page.getByTestId("new-password-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar huella en este dispositivo" })).toBeVisible();

  await devices.getByRole("button", { name: /^Quitar / }).click();
  await page.getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(page.getByText("Todavía no activaste la huella en ningún dispositivo.")).toBeVisible();
});

test("sin passkey registrada, la huella no da acceso y se ofrece la contraseña", async () => {
  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  await page.waitForURL(/\/acceso\?estado=sesion-cerrada/);
  await page.getByRole("button", { name: "Ingresar con huella o rostro" }).click();
  await expect(page.getByTestId("login-form").getByRole("alert")).toContainText("No pudimos ingresar con la huella");
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/acceso$/);
});
