import {
  test, expect, mon, game, wildBattle, openWithSave, continueSave, expectScreen, saved,
  advance, choose, playBattle, walkUntilBattle,
} from './helpers.ts';

test.describe('partidas guardadas', () => {
  test('una partida del formato viejo, sin nivel ni movimientos, se sigue jugando', async ({ page }) => {
    const old = {
      game: { team: [{ id: 'tempano', hp: 70, atkS: 0, defS: 0, pp: [20, 15, 5, 5] }], potions: 1, pos: { x: 4, y: 3 }, beaten: ['lucio'] },
      battle: null,
    };
    await openWithSave(page, old);
    await expect(page.locator('#btnCont')).toBeEnabled();
    await expect(page.locator('#contInfo')).toHaveText('Valle del Ocaso · 1 de 3 entrenadores vencidos');
    await page.click('#btnCont');
    await expectScreen(page, 'map');
    await expect(page.locator('#party .pm')).toContainText('Témpano Nv. 5');

    await walkUntilBattle(page);
    await choose(page, 'Luchar');
    await expect(page.locator('#menu [data-act="move"]')).toHaveCount(4);
    await playBattle(page);
    const [t] = (await saved(page)).game.team;
    expect(t.lvl).toBeGreaterThanOrEqual(5);
    expect(t.moves).toHaveLength(4);
  });

  test('recargar la página en medio de un combate lo retoma donde estaba', async ({ page }) => {
    const team = [mon('marejin', 8), mon('hojarin', 8)];
    await continueSave(page, { game: game(team), battle: wildBattle(mon('pedrusco', 8)) });
    await choose(page, 'Luchar');
    await page.locator('#menu [data-act="move"]').nth(1).click(); // Chorro
    await advance(page);
    const before = await saved(page);
    expect(before.battle?.turn).toBe(2);
    const foeHp = before.battle?.foe[0].hp;
    expect(foeHp).toBeLessThan(mon('pedrusco', 8).hp);

    await page.reload();
    await expect(page.locator('#contInfo')).toContainText('en combate');
    await page.click('#btnCont');
    await expectScreen(page, 'battle');
    await advance(page);
    await expect(page.locator('#fCard')).toContainText('Pedrusco');
    await expect(page.locator('#msg')).toHaveText('¿Qué hará Marejín?');
    const after = await saved(page);
    expect(after.battle?.foe[0].hp).toBe(foeHp);
    expect(after.game.team[0].pp[1]).toBe(before.game.team[0].pp[1]);

    const { end } = await playBattle(page);
    expect(end).toBe('map');
  });

  test('una partida rota o de otra versión no rompe el juego', async ({ page }) => {
    for (const broken of [
      'esto no es JSON',
      { game: { team: 'nadie' } },
      { game: game([{ id: 'criatura-que-no-existe', hp: 10, atkS: 0, defS: 0, pp: [] }]) },
      { game: game([mon('brasalto', 5)]), battle: { kind: 'wild', foe: [], fi: 0, pi: 0 } },
    ]) {
      await page.goto('/');
      await page.evaluate((s) => localStorage.setItem('arena-save', s), typeof broken === 'string' ? broken : JSON.stringify(broken));
      await page.reload();
      await expect(page.locator('#btnCont'), JSON.stringify(broken)).toBeDisabled();
      await expect(page.locator('#contInfo')).toHaveText('No hay partida guardada');
    }
    // Igual se puede empezar de cero.
    await page.click('#btnNew');
    await expectScreen(page, 'choose');
  });

  test('empezar una partida nueva reemplaza la guardada', async ({ page }) => {
    await continueSave(page, { game: game([mon('pedrusco', 12)], { beaten: ['lucio', 'maia'] }), battle: null });
    await page.click('#mapMenu');
    await page.click('#btnNew');
    for (const i of [0, 1, 2]) await page.locator('#picks .pick').nth(i).click();
    await page.click('#btnStart');
    const sv = await saved(page);
    expect(sv.game.beaten).toEqual([]);
    expect(sv.game.team.map((m) => m.id)).toEqual(['brasalto', 'tizon', 'marejin']);
  });
});
