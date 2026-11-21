import { test, expect, mon, game, continueSave, expectScreen, saved } from './helpers.ts';

/**
 * Coordenadas del Valle del Ocaso (ver src/data/world.ts):
 * inicio (3,5), campamento (1,5), árboles en (2,7) y (3,7), agua en (9,5),
 * pasto alto en (3,3) y (4,3), Lucio en (5,8).
 */
const team = () => [mon('brasalto', 6), mon('marejin', 6)];

async function pos(page: Parameters<typeof saved>[0]) {
  return (await saved(page)).game.pos;
}

test.describe('mapa', () => {
  test('se mueve con flechas y WASD, sin atravesar árboles ni agua', async ({ page }) => {
    await continueSave(page, { game: game(team()), battle: null });
    await expectScreen(page, 'map');

    await page.keyboard.press('ArrowDown');
    expect(await pos(page)).toEqual({ x: 3, y: 6 });
    await page.keyboard.press('ArrowDown'); // árbol en (3,7)
    expect(await pos(page)).toEqual({ x: 3, y: 6 });
    await page.keyboard.press('w');
    expect(await pos(page)).toEqual({ x: 3, y: 5 });

    for (let i = 0; i < 7; i++) await page.keyboard.press('d'); // el agua frena en (8,5)
    expect(await pos(page)).toEqual({ x: 8, y: 5 });
  });

  test('se mueve con la cruceta y tocando el mapa', async ({ page }, info) => {
    await continueSave(page, { game: game(team()), battle: null });
    const press = (sel: string) => (info.project.use.hasTouch ? page.locator(sel).tap() : page.locator(sel).click());

    await press('.dpad .r');
    expect(await pos(page)).toEqual({ x: 4, y: 5 });
    await press('.dpad .u');
    expect(await pos(page)).toEqual({ x: 4, y: 4 });

    // Tocar a la derecha del personaje lo mueve un paso hacia ese lado.
    const box = await page.locator('#mapCv').boundingBox();
    if (!box) throw new Error('No se ve el mapa');
    await page.mouse.click(box.x + box.width * (10.5 / 15), box.y + box.height * (4.5 / 11));
    expect(await pos(page)).toEqual({ x: 5, y: 4 });
  });

  test('el campamento cura al equipo', async ({ page }) => {
    const hurt = [mon('brasalto', 6, { hp: 3, pp: [0, 0, 0] }), mon('marejin', 6, { hp: 0 })];
    await continueSave(page, { game: game(hurt, { pos: { x: 2, y: 5 } }), battle: null });
    await page.keyboard.press('ArrowLeft');

    await expect(page.locator('#mapMsg')).toContainText('Descansaron en el campamento');
    const sv = await saved(page);
    expect(sv.game.pos).toEqual({ x: 1, y: 5 });
    for (const m of sv.game.team) {
      expect(m.hp).toBe(mon(m.id, 6).hp);
      expect(m.pp).toEqual(mon(m.id, 6).pp);
    }
    await expect(page.locator('#party .pm.out')).toHaveCount(0);
  });

  test('guardar y salir deja la partida lista para Continuar', async ({ page }) => {
    await continueSave(page, { game: game(team(), { beaten: ['lucio'] }), battle: null });
    await page.keyboard.press('ArrowUp');
    await page.click('#mapMenu');
    await expectScreen(page, 'title');
    await expect(page.locator('#btnCont')).toBeEnabled();
    await expect(page.locator('#contInfo')).toHaveText('Valle del Ocaso · 1 de 3 entrenadores vencidos');

    await page.reload();
    await page.click('#btnCont');
    await expectScreen(page, 'map');
    expect(await pos(page)).toEqual({ x: 3, y: 4 });
  });

  test('un entrenador ya vencido solo saluda', async ({ page }) => {
    await continueSave(page, { game: game(team(), { pos: { x: 5, y: 7 }, beaten: ['lucio'] }), battle: null });
    await page.keyboard.press('ArrowDown');
    await expectScreen(page, 'map');
    await expect(page.locator('#mapMsg')).toHaveText('Lucio: Buen combate. Ya me ganaste.');
  });
});
