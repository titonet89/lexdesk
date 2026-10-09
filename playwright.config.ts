import { defineConfig, devices } from "@playwright/test";

// Las pruebas del panel usan Supabase local: cargamos las variables de .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local solo corren las pruebas del sitio público.
}

const PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // El panel se prueba en serie en un solo proyecto (comparte usuarios de prueba).
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: [/panel.*\.spec\.ts/, /unit[\\/]/] },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
