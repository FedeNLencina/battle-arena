/**
 * Ayudantes para las pruebas de Playwright.
 *
 * - El azar del juego (encuentros, daño, críticos, huir) se fija con una semilla, así cada
 *   prueba da siempre el mismo resultado.
 * - Las fuentes de Google se reemplazan por una hoja vacía: las pruebas no dependen de internet.
 * - El texto va en velocidad rápida y sin animaciones.
 * - Si la página tira un error de JavaScript o de consola, la prueba falla.
 */
import { test as base, expect, type Page } from '@playwright/test';
import { makeMon } from '../src/core/mon.ts';
import { validSave } from '../src/core/save.ts';
import type { Battle, Game, Mon, SaveData, ScreenName, SpeciesId } from '../src/core/types.ts';

export { expect };

type Fixtures = { seed: number };

export const test = base.extend<Fixtures>({
  seed: [1234, { option: true }],
  page: async ({ page, seed }, use) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    // Generador con semilla (mulberry32) en lugar de Math.random.
    await page.addInitScript((s: number) => {
      let a = s >>> 0;
      Math.random = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      try {
        if (!localStorage.getItem('arena-opts')) localStorage.setItem('arena-opts', JSON.stringify({ speed: 2, anim: false }));
      } catch { /* sin almacenamiento */ }
      // Registra cada mensaje completo de la caja de texto del combate, aunque pase rápido.
      const log: string[] = [];
      Object.defineProperty(window, '__arenaMsgs', { value: log });
      document.addEventListener('DOMContentLoaded', () => {
        const box = document.getElementById('msg');
        if (!box) return;
        let cur = '';
        new MutationObserver(() => {
          const now = box.textContent ?? '';
          if (cur && !now.startsWith(cur)) log.push(cur);
          cur = now;
        }).observe(box, { childList: true, characterData: true, subtree: true });
        Object.defineProperty(window, '__arenaMsgNow', { value: () => cur });
      });
    }, seed);
    await use(page);
    expect(consoleErrors, 'errores en la consola del juego').toEqual([]);
  },
});

/** Una criatura armada con las reglas del juego, con cambios opcionales. */
export function mon(id: SpeciesId, lvl: number, over: Partial<Mon> = {}): Mon {
  return { ...makeMon(id, lvl), ...over };
}

export function game(team: Mon[], over: Partial<Game> = {}): Game {
  return { team, potions: 2, pos: { x: 3, y: 5 }, beaten: [], ...over };
}

export function wildBattle(foe: Mon, over: Partial<Battle> = {}): Battle {
  return { kind: 'wild', name: '', trainerId: null, foe: [foe], fi: 0, pi: 0, turn: 1, ...over };
}

/** Abre el juego en la pantalla de título. */
export async function open(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#title')).toHaveClass(/\bon\b/);
}

/** Abre el juego con una partida guardada (en cualquier formato, válido o no). */
export async function openWithSave(page: Page, save: unknown): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('arena-save', s), JSON.stringify(save));
  await page.reload();
  await expect(page.locator('#title')).toHaveClass(/\bon\b/);
}

/** Abre una partida guardada y entra con "Continuar". */
export async function continueSave(page: Page, save: SaveData): Promise<void> {
  await openWithSave(page, save);
  await page.click('#btnCont');
}

export async function screen(page: Page): Promise<ScreenName | string> {
  return page.locator('.screen.on').getAttribute('id').then((id) => id ?? '');
}

export async function expectScreen(page: Page, name: ScreenName): Promise<void> {
  await expect(page.locator('#' + name)).toHaveClass(/\bon\b/);
}

/** La partida guardada en el navegador, validada con las mismas reglas del juego. */
export async function savedGame(page: Page): Promise<SaveData | null> {
  const raw: unknown = await page.evaluate(() => {
    const s = localStorage.getItem('arena-save');
    return s ? JSON.parse(s) : null;
  });
  return validSave(raw) ? raw : null;
}

export async function saved(page: Page): Promise<SaveData> {
  const sv = await savedGame(page);
  if (!sv) throw new Error('No hay una partida guardada válida');
  return sv;
}

/** Todos los mensajes que mostró la caja de texto del combate desde que se abrió la página. */
export async function messages(page: Page): Promise<string[]> {
  const raw: unknown = await page.evaluate(() => {
    const log: unknown = Reflect.get(window, '__arenaMsgs');
    const now: unknown = Reflect.get(window, '__arenaMsgNow');
    return Array.isArray(log) ? [...log, typeof now === 'function' ? now() : ''] : [];
  });
  return Array.isArray(raw) ? raw.filter((m): m is string => typeof m === 'string' && m !== '') : [];
}

/**
 * Adelanta los mensajes del combate hasta que haya botones en el menú o el combate termine.
 * Devuelve los mensajes que se mostraron mientras tanto.
 */
export async function advance(page: Page): Promise<string[]> {
  const before = (await messages(page)).length;
  for (let i = 0; i < 400; i++) {
    if ((await screen(page)) !== 'battle' || (await page.locator('#menu button').count())) {
      return (await messages(page)).slice(Math.max(0, before - 1));
    }
    // Se manda el clic directo a la caja de texto: un clic real en esa posición podría caer
    // en el mapa si el combate termina justo en ese momento.
    await page.locator('#msg').dispatchEvent('click');
  }
  throw new Error('El combate quedó trabado. Últimos mensajes: ' + (await messages(page)).slice(-5).join(' | '));
}

type PlayOptions = {
  /** Movimiento a usar en cada turno (índice entre los habilitados). Por defecto, el primero que hace daño. */
  move?: number;
  /** Qué movimiento olvidar si quiere aprender uno nuevo: índice, o -1 para no aprenderlo. */
  forget?: number;
};

/**
 * Juega el combate hasta el final: ataca, cambia de criatura si la tuya se debilita y
 * resuelve los movimientos nuevos. Devuelve la pantalla final y los mensajes vistos.
 */
export async function playBattle(page: Page, opts: PlayOptions = {}): Promise<{ end: string; msgs: string[] }> {
  const before = (await messages(page)).length;
  for (let turn = 0; turn < 200; turn++) {
    await advance(page);
    if ((await screen(page)) !== 'battle') {
      return { end: await screen(page), msgs: (await messages(page)).slice(Math.max(0, before - 1)) };
    }
    const menu = page.locator('#menu');
    if (await menu.locator('[data-act="forget"]').count()) {
      await menu.locator('[data-act="forget"][data-v="' + (opts.forget ?? 0) + '"]').click();
    } else if (await menu.locator('[data-act="switch"]:not([disabled])').count()) {
      await menu.locator('[data-act="switch"]:not([disabled])').first().click();
    } else if (await menu.locator('[data-v="moves"]').count()) {
      await menu.locator('[data-v="moves"]').click();
    } else {
      const moves = menu.locator('[data-act="move"]:not([disabled])');
      const damaging = moves.filter({ hasText: /Pot\. \d+/ });
      if (opts.move !== undefined) await moves.nth(Math.min(opts.move, (await moves.count()) - 1)).click();
      else if (await damaging.count()) await damaging.first().click();
      else await moves.first().click();
    }
  }
  throw new Error('El combate no terminó en 200 turnos');
}

/** Elige una acción del menú de combate (Luchar, Equipo, Mochila, Huir) después de los mensajes. */
export async function choose(page: Page, label: 'Luchar' | 'Equipo' | 'Mochila' | 'Huir'): Promise<void> {
  await advance(page);
  await page.locator('#menu button', { hasText: label }).click();
}

/** Camina de ida y vuelta en el pasto alto hasta que aparece una criatura salvaje. */
export async function walkUntilBattle(page: Page, keys: readonly [string, string] = ['ArrowLeft', 'ArrowRight']): Promise<void> {
  for (let i = 0; i < 300; i++) {
    if ((await screen(page)) === 'battle') return;
    await page.keyboard.press(keys[i % 2]);
  }
  throw new Error('No apareció ninguna criatura salvaje');
}
