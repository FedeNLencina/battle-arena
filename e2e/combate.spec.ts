import {
  test, expect, mon, game, wildBattle, continueSave, expectScreen, saved,
  advance, choose, playBattle, walkUntilBattle,
} from './helpers.ts';

/** Un equipo que gana con comodidad contra los rivales del valle. */
const strong = () => [mon('brasalto', 14), mon('marejin', 14), mon('hojarin', 14)];

test.describe('combate', () => {
  test('caminar por el pasto alto lleva a un combate salvaje que se juega hasta el final', async ({ page }) => {
    await continueSave(page, { game: game(strong(), { pos: { x: 4, y: 3 } }), battle: null });
    await walkUntilBattle(page);
    await expectScreen(page, 'battle');
    await expect(page.locator('#msg')).toContainText(/salvaje de nivel \d+ apareció/);
    await expect(page.locator('#pCard')).toContainText('Brasalto');

    const { end, msgs } = await playBattle(page);
    expect(end).toBe('map');
    expect(msgs.some((m) => m.includes('ganó') && m.includes('puntos de experiencia'))).toBe(true);
    await expect(page.locator('#mapMsg')).toContainText(/Venciste al .+ salvaje/);
    expect((await saved(page)).battle).toBeNull();
  });

  test('el menú de combate: movimientos con PP, equipo, mochila y volver', async ({ page }) => {
    const team = [mon('brasalto', 8, { hp: 20 }), mon('marejin', 8)];
    await continueSave(page, { game: game(team), battle: wildBattle(mon('zarzal', 5)) });
    await expectScreen(page, 'battle');

    await choose(page, 'Luchar');
    const moves = page.locator('#menu [data-act="move"]');
    await expect(moves).toHaveCount(4);
    await expect(moves.first()).toContainText('PP 20/20');
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu button', { hasText: 'Luchar' })).toBeVisible();

    await choose(page, 'Equipo');
    await expect(page.locator('#menu [data-act="switch"]').first()).toBeDisabled(); // la que está peleando
    await expect(page.locator('#menu [data-act="switch"]').nth(1)).toBeEnabled();
    await page.locator('#menu [data-back]').click();

    await choose(page, 'Mochila');
    await expect(page.locator('#menu [data-act="item"]')).toContainText('Poción × 2');
    await page.locator('#menu [data-act="item"]').click();
    await advance(page);
    const sv = await saved(page);
    expect(sv.game.potions).toBe(1);
    expect(sv.game.team[0].hp).toBeGreaterThan(20);
  });

  test('cambiar de criatura en combate gasta el turno', async ({ page }) => {
    const team = [mon('brasalto', 8), mon('marejin', 8)];
    await continueSave(page, { game: game(team), battle: wildBattle(mon('zarzal', 5)) });
    await choose(page, 'Equipo');
    await page.locator('#menu [data-act="switch"]').nth(1).click();
    const msgs = await advance(page);
    expect(msgs).toContain('¡Volvé, Brasalto!');
    expect(msgs).toContain('¡Adelante, Marejín!');
    expect(msgs.some((m) => m.startsWith('El Zarzal salvaje usó'))).toBe(true);
    await expect(page.locator('#pCard')).toContainText('Marejín');
  });

  test('se puede huir de un salvaje', async ({ page }) => {
    await continueSave(page, { game: game(strong()), battle: wildBattle(mon('zarzal', 5)) });
    for (let i = 0; i < 20 && (await page.locator('#battle.on').count()); i++) {
      await choose(page, 'Huir');
      await advance(page);
    }
    await expectScreen(page, 'map');
    await expect(page.locator('#mapMsg')).toHaveText('Te alejaste del Zarzal salvaje.');
  });

  test('contra un entrenador no se puede huir, y al ganarle queda vencido', async ({ page }) => {
    // Lucio está en (5,8): desde (5,7) se lo desafía bajando.
    await continueSave(page, { game: game(strong(), { pos: { x: 5, y: 7 } }), battle: null });
    await page.keyboard.press('ArrowDown');
    await expectScreen(page, 'battle');
    await expect(page.locator('#msg')).toContainText('¡Lucio te desafía y envía a Zarzal!');

    await choose(page, 'Huir');
    await expect(page.locator('#msg')).toHaveText('No podés huir de un combate contra un entrenador.');

    const { end, msgs } = await playBattle(page);
    expect(end).toBe('map');
    expect(msgs).toContain('Lucio envía a Charquín.');
    await expect(page.locator('#mapMsg')).toHaveText('Venciste a Lucio y te dio una Poción y 3 Cápsulas. Te quedan 2 entrenadores.');
    const sv = await saved(page);
    expect(sv.game.beaten).toEqual(['lucio']);
    expect(sv.game.potions).toBe(3);
    expect(sv.game.capsules).toBe(8);
    await expect(page.locator('#mapInfo')).toContainText('Entrenadores 1/3');
  });

  test('si todo el equipo se debilita, vuelve al campamento curado', async ({ page }) => {
    const weak = [mon('hojarin', 3, { hp: 1 })];
    await continueSave(page, { game: game(weak, { pos: { x: 4, y: 3 } }), battle: wildBattle(mon('brasalto', 20)) });
    const { end, msgs } = await playBattle(page);
    expect(end).toBe('map');
    expect(msgs).toContain('Hojarín se debilitó.');
    await expect(page.locator('#mapMsg')).toHaveText('Tu equipo se debilitó. Volviste al campamento y todos descansaron.');
    const sv = await saved(page);
    expect(sv.game.pos).toEqual({ x: 1, y: 5 });
    expect(sv.game.team[0].hp).toBe(mon('hojarin', 3).hp);
  });

  test('cuando se debilita la que pelea, hay que elegir otra sin perder el turno', async ({ page }) => {
    const team = [mon('hojarin', 3, { hp: 1 }), mon('marejin', 14)];
    await continueSave(page, { game: game(team), battle: wildBattle(mon('brasalto', 8)) });
    await choose(page, 'Luchar');
    await page.locator('#menu [data-act="move"]').first().click();
    await advance(page);
    await expect(page.locator('#msg')).toHaveText('¿Quién sigue?');
    await expect(page.locator('#menu [data-back]')).toHaveCount(0);
    await page.locator('#menu [data-act="switch"]:not([disabled])').click();
    await advance(page);
    await expect(page.locator('#msg')).toHaveText('¿Qué hará Marejín?');
  });

  test('vencer al último entrenador gana el juego y borra la partida', async ({ page }) => {
    // Vera está en (13,1): desde (12,1) se la desafía yendo a la derecha.
    const champs = [mon('pirodon', 16), mon('marejadon', 16), mon('frondon', 16)];
    await continueSave(page, { game: game(champs, { pos: { x: 12, y: 1 }, beaten: ['lucio', 'maia'] }), battle: null });
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#msg')).toContainText('¡Vera te desafía');
    const { end } = await playBattle(page);
    expect(end).toBe('end');
    await expect(page.locator('#endTitle')).toHaveText('¡Victoria!');
    await expect(page.locator('#endText')).toHaveText('Venciste a los 3 entrenadores del Valle del Ocaso.');

    await page.click('#endMenu');
    await expectScreen(page, 'title');
    await expect(page.locator('#btnCont')).toBeDisabled();
  });
});
