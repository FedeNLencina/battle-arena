/**
 * Se asegura de que esté el Chromium de Playwright antes de correr `pnpm e2e`.
 * La primera vez lo baja (más de 100 MB); después solo revisa y tarda un segundo.
 * Si CHROME_PATH apunta a un Chrome ya instalado, no hace nada.
 */
import { spawnSync } from 'node:child_process';

if (process.env.CHROME_PATH) {
  console.log('e2e: uso el Chrome de CHROME_PATH (' + process.env.CHROME_PATH + ')');
} else {
  // Dentro de un script de pnpm, node_modules/.bin está en el PATH.
  const r = spawnSync('playwright', ['install', 'chromium'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error('e2e: no se pudo instalar Chromium. Probá con `pnpm exec playwright install chromium`,');
    console.error('o indicá un Chrome ya instalado con la variable CHROME_PATH.');
    process.exit(r.status ?? 1);
  }
}
