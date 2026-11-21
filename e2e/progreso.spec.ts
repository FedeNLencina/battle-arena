import { test, expect, mon, game, wildBattle, continueSave, saved, playBattle } from './helpers.ts';
import { xpNeed } from '../src/core/mon.ts';

/** Un salvaje que cae de un golpe, para que el combate termine en el primer turno. */
const easyFoe = () => mon('zarzal', 2, { hp: 1 });

test.describe('niveles, evolución y movimientos', () => {
  test('sube de nivel y aprende un movimiento nuevo cuando tiene lugar', async ({ page }) => {
    const brasalto = mon('brasalto', 6, { xp: xpNeed(6) - 1 });
    expect(brasalto.moves).toHaveLength(3);
    await continueSave(page, { game: game([brasalto, mon('marejin', 6)]), battle: wildBattle(easyFoe()) });

    const { end, msgs } = await playBattle(page);
    expect(end).toBe('map');
    expect(msgs).toContain('¡Brasalto subió al nivel 7!');
    expect(msgs).toContain('¡Brasalto aprendió Gran Hoguera!');
    expect(msgs.some((m) => m.startsWith('El resto del equipo ganó'))).toBe(true);

    const [b, m] = (await saved(page)).game.team;
    expect(b.lvl).toBe(7);
    expect(b.moves).toContain('hoguera');
    expect(b.hp).toBe(mon('brasalto', 7).hp);
    expect(m.xp).toBeGreaterThan(0);
    await expect(page.locator('#party .pm').first()).toContainText('Nv. 7');
  });

  test('en el nivel 10 evoluciona y conserva los movimientos', async ({ page }) => {
    const chispin = mon('chispin', 9, { xp: xpNeed(9) - 1 });
    await continueSave(page, { game: game([chispin]), battle: wildBattle(easyFoe()) });

    const { msgs } = await playBattle(page);
    expect(msgs).toContain('¡Chispín subió al nivel 10!');
    expect(msgs).toContain('¿Eh? ¡Chispín está evolucionando!');
    expect(msgs).toContain('¡Chispín evolucionó en Relampo!');

    const [r] = (await saved(page)).game.team;
    expect(r.id).toBe('relampo');
    expect(r.moves).toEqual(chispin.moves);
    expect(r.hp).toBe(mon('relampo', 10).hp);
    await expect(page.locator('#party .pm').first()).toContainText('Relampo');
  });

  test('con cuatro movimientos elige cuál olvidar para aprender uno nuevo', async ({ page }) => {
    const brasalto = mon('brasalto', 11, { xp: xpNeed(11) - 1 });
    expect(brasalto.moves).toEqual(['placaje', 'ascua', 'avivar', 'hoguera']);
    await continueSave(page, { game: game([brasalto]), battle: wildBattle(easyFoe()) });

    const { end, msgs } = await playBattle(page, { forget: 0 });
    expect(end).toBe('map');
    // Ya tenía nivel para evolucionar: lo hace al subir, y después pide el movimiento del nivel 12.
    expect(msgs).toContain('¡Brasalto evolucionó en Pirodón!');
    expect(msgs).toContain('Pirodón quiere aprender Infierno, pero ya sabe cuatro movimientos.');
    expect(msgs).toContain('¿Qué movimiento olvida Pirodón para aprender Infierno?');
    expect(msgs).toContain('Pirodón olvidó Embestida y aprendió Infierno.');

    const [p] = (await saved(page)).game.team;
    expect(p.moves).toEqual(['infierno', 'ascua', 'avivar', 'hoguera']);
    expect(p.pp[0]).toBe(5);
  });

  test('puede decidir no aprender el movimiento nuevo', async ({ page }) => {
    const brasalto = mon('brasalto', 11, { xp: xpNeed(11) - 1 });
    await continueSave(page, { game: game([brasalto]), battle: wildBattle(easyFoe()) });

    const { msgs } = await playBattle(page, { forget: -1 });
    expect(msgs).toContain('Pirodón no aprendió Infierno.');
    expect((await saved(page)).game.team[0].moves).toEqual(['placaje', 'ascua', 'avivar', 'hoguera']);
  });
});
