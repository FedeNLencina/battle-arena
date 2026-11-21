import { test, expect, open, expectScreen, saved } from './helpers.ts';

test.describe('menú principal y armado del equipo', () => {
  test('sin partida guardada, Continuar está deshabilitado', async ({ page }) => {
    await open(page);
    await expect(page.locator('#btnCont')).toBeDisabled();
    await expect(page.locator('#contInfo')).toHaveText('No hay partida guardada');
    await expect(page.locator('#parade canvas')).toHaveCount(6);
  });

  test('las opciones cambian y se recuerdan al recargar', async ({ page }) => {
    await open(page);
    await page.click('#btnOpts');
    await expectScreen(page, 'options');
    // Las pruebas arrancan en velocidad rápida y sin animaciones.
    await expect(page.locator('#valSpeed')).toHaveText('Rápida');
    await expect(page.locator('#valAnim')).toHaveText('No');

    await page.click('#optSpeed');
    await expect(page.locator('#valSpeed')).toHaveText('Lenta');
    await page.click('#optSpeed');
    await expect(page.locator('#valSpeed')).toHaveText('Normal');
    await page.click('#optAnim');
    await expect(page.locator('#valAnim')).toHaveText('Sí');

    await page.reload();
    await page.click('#btnOpts');
    await expect(page.locator('#valSpeed')).toHaveText('Normal');
    await expect(page.locator('#valAnim')).toHaveText('Sí');
    await page.click('#optBack');
    await expectScreen(page, 'title');
  });

  test('se maneja con el teclado: flechas, Enter y Esc', async ({ page }) => {
    await open(page);
    await expect(page.locator('#btnNew')).toBeFocused();
    // Continuar está deshabilitado: las flechas lo saltean y dan la vuelta.
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#btnOpts')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#btnNew')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#btnOpts')).toBeFocused();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'options');
    await page.keyboard.press('Escape');
    await expectScreen(page, 'title');
  });

  test('armar el equipo respeta el orden y pide exactamente tres', async ({ page }) => {
    await open(page);
    await page.click('#btnNew');
    await expectScreen(page, 'choose');
    const picks = page.locator('#picks .pick');
    await expect(picks).toHaveCount(12);
    await expect(page.locator('#chart li')).toHaveCount(6);
    await expect(page.locator('#btnStart')).toBeDisabled();

    // Brasalto, Marejín y Hojarín: quedan numerados en el orden en que se marcaron.
    await picks.nth(0).click();
    await picks.nth(2).click();
    await picks.nth(4).click();
    await expect(picks.nth(0).locator('.ord')).toHaveText('1');
    await expect(picks.nth(2).locator('.ord')).toHaveText('2');
    await expect(picks.nth(4).locator('.ord')).toHaveText('3');
    await expect(page.locator('#startInfo')).toHaveText('Brasalto, Marejín, Hojarín');

    // Con tres elegidas, una cuarta no entra.
    await picks.nth(6).click();
    await expect(picks.nth(6)).toHaveAttribute('aria-pressed', 'false');

    // Desmarcar la del medio corre el orden y vuelve a pedir una.
    await picks.nth(2).click();
    await expect(picks.nth(4).locator('.ord')).toHaveText('2');
    await expect(page.locator('#btnStart')).toBeDisabled();
    await expect(page.locator('#startInfo')).toHaveText('Elegiste 2 de 3');

    await picks.nth(6).click();
    await page.click('#btnStart');
    await expectScreen(page, 'map');

    const sv = await saved(page);
    expect(sv.game.team.map((m) => m.id)).toEqual(['brasalto', 'hojarin', 'chispin']);
    expect(sv.game.team.every((m) => m.lvl === 5)).toBe(true);
    await expect(page.locator('#party .pm')).toHaveCount(3);
    await expect(page.locator('#mapMsg')).toContainText('Llegaste al Valle del Ocaso');
  });

  test('Volver desde el armado del equipo regresa al título', async ({ page }) => {
    await open(page);
    await page.click('#btnNew');
    await page.click('#chooseBack');
    await expectScreen(page, 'title');
  });
});
