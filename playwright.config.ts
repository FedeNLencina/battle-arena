import { defineConfig } from '@playwright/test';

/**
 * Pruebas de punta a punta: juegan el juego en un navegador como lo haría una persona.
 * Corren contra el build (`pnpm build` + `pnpm preview`), en tamaño celular y escritorio.
 *
 * Por defecto usan el Chromium de Playwright (`pnpm exec playwright install chromium`).
 * Con CHROME_PATH se puede usar otro Chrome ya instalado.
 */
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Las pruebas fijan el azar del juego: si fallan, no se reintentan para no esconder el problema.
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined },
  },
  projects: [
    { name: 'celular', use: { viewport: { width: 420, height: 860 }, hasTouch: true } },
    { name: 'escritorio', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
