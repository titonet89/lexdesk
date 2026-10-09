import { expect, test } from "@playwright/test";
import { primaryOffice, siteConfig } from "../lib/site-config";

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR;

test.beforeEach(async ({ page }) => {
  // Registra las URLs abiertas con window.open en lugar de abrir pestañas reales.
  await page.addInitScript(() => {
    const opened: string[] = [];
    (window as unknown as { __opened: string[] }).__opened = opened;
    window.open = ((url?: string | URL) => {
      opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
  await page.goto("/");
});

test("renderiza el hero con el CTA de WhatsApp", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Te acompaño a resolver");
  const cta = page.getByTestId("hero-whatsapp-cta");
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", new RegExp(`^https://wa\\.me/${siteConfig.whatsappNumber}\\?text=`));
  await expect(page.getByRole("link", { name: "Conocer Especialidades" })).toHaveAttribute("href", "#especialidades");
});

test("no hay scroll horizontal", async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("muestra las áreas de práctica con su micro-botón", async ({ page }) => {
  const cards = page.getByTestId("practice-card");
  await expect(cards).toHaveCount(siteConfig.practiceAreas.length);
  for (const area of siteConfig.practiceAreas) {
    const link = page.getByRole("link", { name: `Consultar por WhatsApp sobre ${area.title}` });
    await expect(link).toHaveAttribute("href", /wa\.me/);
    const href = await link.getAttribute("href");
    expect(decodeURIComponent(href?.split("text=")[1] ?? "")).toContain(area.title);
  }
});

test("el menú móvil abre, navega y cierra", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Solo aplica en móvil");
  await page.getByTestId("mobile-menu-trigger").click();
  const drawer = page.getByTestId("mobile-menu");
  await expect(drawer).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-menu.png` });
  await drawer.getByRole("link", { name: "Consulta", exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/#consulta$/);
});

test("el formulario valida los campos obligatorios", async ({ page }) => {
  await page.getByTestId("form-submit").click();
  const form = page.getByTestId("consultation-form");
  await expect(form.getByText("Ingresá tu nombre")).toBeVisible();
  await expect(form.getByText("Ingresá tu número de WhatsApp.")).toBeVisible();
  await expect(form.getByText("Elegí el área de tu consulta.")).toBeVisible();
  await expect(form.getByText("Contanos brevemente tu caso")).toBeVisible();
  await expect(form.getByText("Necesitamos tu autorización")).toBeVisible();
  await expect(form.getByLabel("Nombre y apellido")).toHaveAttribute("aria-invalid", "true");
});

test("un envío válido genera el enlace de WhatsApp con el mensaje pre-cargado", async ({ page }) => {
  const form = page.getByTestId("consultation-form");
  await form.getByLabel("Nombre y apellido").fill("María González");
  await form.getByLabel("WhatsApp").fill("388 412 3456");
  await form.getByLabel("Área de consulta").selectOption("sucesiones");
  await form.getByLabel("Tu consulta").fill("Falleció mi padre y necesito iniciar la sucesión de su casa.");
  await form.getByRole("checkbox").check();
  await page.getByTestId("form-submit").click();

  await expect(page.getByTestId("form-success")).toBeVisible();
  const href = await page.getByTestId("form-whatsapp-link").getAttribute("href");
  expect(href).toMatch(new RegExp(`^https://wa\\.me/${siteConfig.whatsappNumber}\\?text=`));
  const text = decodeURIComponent(href?.split("text=")[1] ?? "");
  expect(text).toContain("mi nombre es María González");
  expect(text).toContain("*Sucesiones*");
  expect(text).toContain("iniciar la sucesión");
  expect(text).toContain("388 412 3456");

  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toEqual([href]);

  await page.getByRole("button", { name: "Enviar otra consulta" }).click();
  await expect(page.getByTestId("consultation-form")).toBeVisible();
});

test("el botón flotante de WhatsApp aparece al hacer scroll", async ({ page }) => {
  const fab = page.getByTestId("floating-whatsapp");
  await expect(fab).toHaveCount(0);
  await page.mouse.wheel(0, 1600);
  await expect(fab).toBeVisible();
  await expect(fab).toHaveAttribute("href", /wa\.me/);
});

test("incluye JSON-LD LegalService válido y metadata", async ({ page }) => {
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? "{}") as Record<string, unknown>;
  expect(data["@type"]).toBe("LegalService");
  expect(data.name).toBe(siteConfig.lawyer.name);
  expect(data.telephone).toBe(`+${siteConfig.whatsappNumber}`);
  if (!siteConfig.reviews) expect(data).not.toHaveProperty("aggregateRating");

  await expect(page).toHaveTitle(new RegExp(siteConfig.lawyer.name));
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
});

test("oculta las secciones sin datos confirmados", async ({ page }) => {
  await expect(page.getByTestId("professional-profile")).toContainText(siteConfig.lawyer.registration);
  await expect(page.getByTestId("google-reviews-badge")).toHaveCount(siteConfig.reviews ? 1 : 0);
  await expect(page.getByTestId("office-map")).toHaveCount(primaryOffice.mapQuery ? 1 : 0);
  await expect(page.locator("blockquote")).toHaveCount(siteConfig.testimonials.length);
});

test("captura de página completa", async ({ page }, testInfo) => {
  test.skip(!SCREENSHOT_DIR, "Solo cuando se piden capturas");
  // Recorre la página para disparar las animaciones de aparición.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${testInfo.project.name}-full.png`, fullPage: true });
});

test("la política de privacidad está enlazada y accesible", async ({ page }) => {
  await page.getByRole("navigation", { name: "Legal" }).getByRole("link", { name: "Política de privacidad" }).click();
  await expect(page).toHaveURL(/\/privacidad$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de privacidad");
  await expect(page.getByText("Ley N° 25.326").first()).toBeVisible();
});
