import {
  test, expect, mon, game, wildBattle, openWithSave, continueSave, expectScreen, saved,
  advance, choose, playBattle, fixRandom,
} from './helpers.ts';
import { captureChance, MAX_TEAM } from '../src/core/capture.ts';
import type { Mon } from '../src/core/types.ts';

/** Un equipo de nivel 6 con `n` criaturas. */
const teamOf = (n: number): Mon[] =>
  ['brasalto', 'marejin', 'hojarin', 'chispin', 'pedrusco', 'escarchin'].slice(0, n).map((id) => mon(id, 6));

/** Abre la Mochila y tira una Cápsula. */
async function throwCapsule(page: Parameters<typeof advance>[0]): Promise<void> {
  await choose(page, 'Mochila');
  await page.locator('#menu [data-act="capsule"]').click();
}

test.describe('captura y Reserva', () => {
  test('la Mochila muestra las Cápsulas y la probabilidad de atrapar', async ({ page }) => {
    const team = teamOf(2);
    const wild = mon('zarzal', 4, { hp: 20 });
    await continueSave(page, { game: game(team), battle: wildBattle(wild) });
    await choose(page, 'Mochila');

    const chance = Math.round(captureChance(wild, team) * 100);
    const capsule = page.locator('#menu [data-act="capsule"]');
    await expect(capsule).toBeEnabled();
    await expect(capsule).toContainText('Cápsula × 5');
    await expect(capsule).toContainText('Probabilidad de atrapar a Zarzal: ' + chance + '%');
  });

  test('si la Cápsula atrapa, la criatura se suma al equipo y el combate termina', async ({ page }) => {
    await continueSave(page, { game: game(teamOf(2)), battle: wildBattle(mon('zarzal', 4, { hp: 3 })) });
    await fixRandom(page, 0);
    await throwCapsule(page);
    const msgs = await advance(page);

    expect(msgs).toContain('Lanzaste una Cápsula.');
    expect(msgs).toContain('¡Atrapaste a Zarzal!');
    await expectScreen(page, 'map');
    await expect(page.locator('#mapMsg')).toHaveText('¡Atrapaste a Zarzal! Se sumó a tu equipo.');
    await expect(page.locator('#party .pm')).toHaveCount(3);
    await expect(page.locator('#mapInfo')).toContainText('Cápsulas × 4');

    const sv = await saved(page);
    expect(sv.battle).toBeNull();
    expect(sv.game.capsules).toBe(4);
    const caught = sv.game.team[2];
    expect(caught.id).toBe('zarzal');
    expect(caught.lvl).toBe(4);
    expect(caught.hp).toBe(3);
  });

  test('si la Cápsula falla, el salvaje se escapa y ataca', async ({ page }) => {
    await continueSave(page, { game: game(teamOf(1)), battle: wildBattle(mon('zarzal', 4)) });
    await fixRandom(page, 0.99);
    await throwCapsule(page);
    const msgs = await advance(page);

    expect(msgs).toContain('¡Zarzal se escapó de la Cápsula!');
    expect(msgs.some((m) => m.startsWith('El Zarzal salvaje usó'))).toBe(true);
    await expectScreen(page, 'battle');
    const sv = await saved(page);
    expect(sv.game.capsules).toBe(4);
    expect(sv.game.team).toHaveLength(1);
    expect(sv.battle?.turn).toBe(2);
  });

  test('con el equipo lleno, la criatura atrapada va a la Reserva', async ({ page }) => {
    await continueSave(page, { game: game(teamOf(MAX_TEAM)), battle: wildBattle(mon('penon', 4, { hp: 2 })) });
    await fixRandom(page, 0);
    await throwCapsule(page);
    await advance(page);

    await expect(page.locator('#mapMsg')).toHaveText(
      '¡Atrapaste a Peñón! Tu equipo está lleno, así que fue a la Reserva. Podés cambiarlo en el campamento.');
    await expect(page.locator('#party .pm')).toHaveCount(MAX_TEAM);
    await expect(page.locator('#mapReserve')).toBeDisabled();
    await expect(page.locator('#reserveInfo')).toHaveText('Solo en el campamento · 1 criatura esperando');
    const sv = await saved(page);
    expect(sv.game.box?.map((m) => m.id)).toEqual(['penon']);
  });

  test('contra un entrenador o sin Cápsulas, la Cápsula está deshabilitada', async ({ page }) => {
    const trainer = wildBattle(mon('zarzal', 5), { kind: 'trainer', name: 'Lucio', trainerId: 'lucio' });
    await continueSave(page, { game: game(teamOf(2)), battle: trainer });
    await choose(page, 'Mochila');
    const capsule = page.locator('#menu [data-act="capsule"]');
    await expect(capsule).toBeDisabled();
    await expect(capsule).toContainText('Solo sirve con criaturas salvajes');

    await continueSave(page, { game: game(teamOf(2), { capsules: 0 }), battle: wildBattle(mon('zarzal', 5)) });
    await choose(page, 'Mochila');
    await expect(capsule).toBeDisabled();
    await expect(capsule).toContainText('No te quedan Cápsulas');
  });

  test('un salvaje vencido puede dejar caer una Cápsula', async ({ page }) => {
    await continueSave(page, { game: game(teamOf(1)), battle: wildBattle(mon('zarzal', 2, { hp: 1 })) });
    await fixRandom(page, 0);
    const { end } = await playBattle(page);
    expect(end).toBe('map');
    await expect(page.locator('#mapMsg')).toHaveText('Venciste al Zarzal salvaje. Dejó caer una Poción y una Cápsula.');
    const sv = await saved(page);
    expect(sv.game.capsules).toBe(6);
    expect(sv.game.potions).toBe(3);
  });

  test('una partida vieja sin Cápsulas ni Reserva arranca con 5 Cápsulas', async ({ page }) => {
    await openWithSave(page, {
      game: { team: [{ id: 'tempano', hp: 70, atkS: 0, defS: 0, pp: [20, 15, 5, 5] }], potions: 1, pos: { x: 3, y: 5 }, beaten: [] },
    });
    await page.click('#btnCont');
    await expectScreen(page, 'map');
    await expect(page.locator('#mapInfo')).toContainText('Cápsulas × 5');
    await expect(page.locator('#reserveInfo')).toHaveText('Solo en el campamento');
  });

  test('en el campamento se ordena el equipo con la Reserva', async ({ page }) => {
    const box = [mon('voltejo', 7, { hp: 1 })];
    await continueSave(page, { game: game(teamOf(MAX_TEAM), { pos: { x: 2, y: 5 }, box }), battle: null });
    await expect(page.locator('#mapReserve')).toBeDisabled();
    await page.keyboard.press('r'); // lejos del campamento la tecla R no hace nada
    await expectScreen(page, 'map');

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#mapReserve')).toBeEnabled();
    await expect(page.locator('#reserveInfo')).toHaveText('Ordená tu equipo · 1 criatura esperando');
    // El campamento también cura a las de la Reserva.
    expect((await saved(page)).game.box?.[0].hp).toBe(mon('voltejo', 7).hp);

    await page.click('#mapReserve');
    await expectScreen(page, 'reserve');
    await expect(page.locator('#rTeamTitle')).toHaveText('Equipo (6 de 6)');
    await expect(page.locator('#rBoxTitle')).toHaveText('Reserva (1)');
    const boxBtn = page.locator('#rBox .rrow').first().locator('button');
    await expect(boxBtn).toBeDisabled();
    await expect(boxBtn).toHaveText('Equipo lleno');
    // La primera no tiene "Primero": ya lo es.
    await expect(page.locator('#rTeam .rrow').first().locator('[data-r="lead"]')).toHaveCount(0);

    // Marejín a la Reserva, Voltejo al equipo, y Hojarín (ahora segunda) primera.
    await page.locator('#rTeam .rrow').nth(1).locator('[data-r="tobox"]').click();
    await page.locator('#rBox .rrow').first().locator('[data-r="toteam"]').click();
    await page.locator('#rTeam .rrow').nth(1).locator('[data-r="lead"]').click();

    await expect(page.locator('#rTeam .rrow').first()).toContainText('Hojarín');
    await expect(page.locator('#rBox .rrow')).toHaveCount(1);
    await expect(page.locator('#rBox .rrow').first()).toContainText('Marejín');
    const sv = await saved(page);
    expect(sv.game.team.map((m) => m.id)).toEqual(['hojarin', 'brasalto', 'chispin', 'pedrusco', 'escarchin', 'voltejo']);
    expect(sv.game.box?.map((m) => m.id)).toEqual(['marejin']);

    await page.keyboard.press('Escape');
    await expectScreen(page, 'map');
    await page.keyboard.press('r');
    await expectScreen(page, 'reserve');
    await page.click('#reserveBack');
    await expectScreen(page, 'map');
  });

  test('el equipo nunca queda vacío', async ({ page }) => {
    await continueSave(page, { game: game(teamOf(1), { pos: { x: 1, y: 5 } }), battle: null });
    await page.click('#mapReserve');
    await expect(page.locator('#rTeam [data-r="tobox"]')).toBeDisabled();
    await expect(page.locator('#rBox .rempty')).toBeVisible();
  });
});
