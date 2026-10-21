import { expect, test } from "@playwright/test";

test("el manifiesto permite instalar el panel como app", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ short_name: "LexDesk", start_url: "/panel", display: "standalone" });
  const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
  expect(purposes).toEqual(expect.arrayContaining(["any", "maskable"]));
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
});

test("el service worker se sirve sin caché y no guarda datos del estudio", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-cache");
  const source = await response.text();
  // Solo se guarda la pantalla "Sin conexión".
  expect(source).toContain('const OFFLINE_URL = "/offline.html"');
  expect(source).not.toMatch(/\/panel|\/rest\/v1|supabase/);

  const offline = await request.get("/offline.html");
  expect(offline.ok()).toBe(true);
  expect(await offline.text()).toContain("Sin conexión");
});

test("la página enlaza el manifiesto y el ícono para iPhone", async ({ page }) => {
  await page.goto("/acceso");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png/);
});
