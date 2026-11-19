// Juega Arena de Batalla en un Chrome/Edge headless: partida nueva, combate, guardado y evolución.
// Uso: node play.mjs <carpeta-de-capturas>   (con `pnpm dev` corriendo en el puerto 5173)
// Variables opcionales: GAME_URL (por defecto http://localhost:5173/) y CHROME_PATH.
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const URL = process.env.GAME_URL || 'http://localhost:5173/';
const OUT = process.argv[2] || 'capturas';
mkdirSync(OUT, { recursive: true });
const errors = [];
const msgs = [];
const problems = [];

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No encontré Chrome ni Edge. Indicá la ruta con CHROME_PATH.');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, headless: true });
const page = await (await browser.newContext({ viewport: { width: 420, height: 860 } })).newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const screen = () => page.$eval('.screen.on', (e) => e.id);
const shot = (n) => page.screenshot({ path: OUT + '/' + n + '.png' });
let lastMsg = '';

async function playBattle(label) {
  for (let step = 0; step < 1500; step++) {
    const scr = await screen();
    if (scr !== 'battle') return scr;
    const msg = await page.$eval('#msg', (e) => e.textContent);
    if (msg !== lastMsg && !msg.startsWith('¿Qué hará')) { lastMsg = msg; msgs.push(label + ' | ' + msg); }
    const acts = await page.$$eval('#menu button:not([disabled])', (bs) => bs.map((b) => b.dataset.act + ':' + b.dataset.v));
    if (!acts.length) { await page.click('#msg').catch(() => {}); await page.waitForTimeout(30); continue; }
    const pick = acts.find((a) => a === 'forget:0') || acts.find((a) => a === 'menu:moves')
      || acts.find((a) => a.startsWith('move:')) || acts.find((a) => a.startsWith('switch:'));
    const [act, v] = pick.split(':');
    await page.click(`#menu button[data-act="${act}"][data-v="${v}"]`);
    await page.waitForTimeout(30);
  }
  return 'timeout';
}

async function walkUntilBattle() {
  // Desde el inicio (3,5) sube al pasto alto (3,3) y va y viene hasta que aparezca algo.
  for (let i = 0; i < 300; i++) {
    if ((await screen()) === 'battle') return true;
    await page.keyboard.press(i % 2 ? 'ArrowDown' : 'ArrowUp');
    await page.waitForTimeout(20);
  }
  return false;
}

// 1. Opciones rápidas y sin animación para que el combate no tarde.
await page.goto(URL);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('arena-opts', JSON.stringify({ speed: 2, anim: false })); });
await page.reload();
await page.waitForSelector('#title.on');
await shot('1-titulo');

// 2. Partida nueva desde la interfaz.
await page.click('#btnNew');
const picks = await page.$$('#picks .pick');
for (const i of [0, 2, 4]) await picks[i].click();
await shot('2-equipo');
await page.click('#btnStart');
await page.waitForSelector('#map.on');
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');
await shot('3-mapa');

// 3. Combate salvaje hasta el final.
if (!(await walkUntilBattle())) problems.push('combate 1: no apareció ninguna criatura salvaje');
await page.waitForTimeout(300);
await shot('4-combate');
const end1 = await playBattle('c1');
if (end1 !== 'map') problems.push('combate 1 terminó en ' + end1 + ' en vez de volver al mapa');
await shot('5-despues-combate1');

// 4. Partida guardada del formato viejo (sin nivel ni movimientos) + una a punto de evolucionar.
await page.evaluate(() => {
  localStorage.setItem('arena-save', JSON.stringify({
    game: {
      team: [
        { id: 'chispin', lvl: 9, xp: 109, hp: 80, atkS: 0, defS: 0, moves: ['placaje', 'descarga', 'carga', 'tormenta'], pp: [20, 15, 10, 5] },
        { id: 'tempano', hp: 70, atkS: 0, defS: 0, pp: [20, 15, 5, 5] },
      ],
      potions: 2, pos: { x: 3, y: 5 }, beaten: ['lucio'],
    },
    battle: null, at: 1,
  }));
});
await page.reload();
await page.waitForSelector('#title.on');
if (await page.$eval('#btnCont', (e) => e.disabled)) problems.push('no acepta una partida guardada del formato viejo');
await shot('6-titulo-guardada');
await page.click('#btnCont');
await page.waitForSelector('#map.on');
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');

// 5. Combate: un turno, recargar en medio del combate y continuar, después terminarlo.
if (!(await walkUntilBattle())) problems.push('combate 2: no apareció ninguna criatura salvaje');
for (let i = 0; i < 200 && !(await page.$('#menu button[data-v="moves"]')); i++) { await page.click('#msg').catch(() => {}); await page.waitForTimeout(30); }
await page.reload();
await page.waitForSelector('#title.on');
if (!(await page.$eval('#contInfo', (e) => e.textContent)).includes('en combate')) problems.push('al recargar no se guardó el combate en curso');
await page.click('#btnCont');
await page.waitForSelector('#battle.on');
await shot('7-combate-recargado');
const end2 = await playBattle('c2');
if (end2 !== 'map') problems.push('combate 2 terminó en ' + end2 + ' en vez de volver al mapa');
await shot('8-final');
const sv = await page.evaluate(() => JSON.parse(localStorage.getItem('arena-save') ?? 'null'));
const team = sv?.game?.team ?? [];
console.log('equipo guardado:', JSON.stringify(team.map((m) => ({ id: m.id, lvl: m.lvl, moves: m.moves }))));
// Chispín arranca en el nivel 9 a 1 punto de subir: si ganó experiencia, tiene que haber evolucionado.
if (msgs.some((m) => m.includes('Chispín ganó')) && team[0]?.id !== 'relampo') problems.push('Chispín no evolucionó en Relampo al llegar al nivel 10');

console.log('--- mensajes ---\n' + msgs.filter((m) => /nivel|evolucion|aprendió|olvidó|debilitó|Venciste|ganó/.test(m)).join('\n'));
console.log('--- errores de consola ---\n' + (errors.join('\n') || '(ninguno)'));
problems.push(...errors.map((e) => 'consola: ' + e));
console.log('--- resultado ---\n' + (problems.length ? problems.map((p) => '✗ ' + p).join('\n') : '✓ todo bien'));
console.log('capturas en ' + OUT);
await browser.close();
process.exit(problems.length ? 1 : 0);
