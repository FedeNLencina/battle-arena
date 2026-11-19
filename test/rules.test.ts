import { test } from 'node:test';
import assert from 'node:assert/strict';

import { effectiveness, STRONG, TYPES } from '../src/data/types.ts';
import { SPECIES, ROSTER, EVO_LV } from '../src/data/species.ts';
import { MOVES } from '../src/data/moves.ts';
import { SHAPES, PERSON } from '../src/data/shapes.ts';
import { MAP, MW, MH, TRAINERS, START, CAMP, isWalkable } from '../src/data/world.ts';
import {
  makeMon, maxHp, addXp, xpNeed, evolveIfReady, movesToLearn, movesOf,
  rollAttack, formAt, healTeam, MAXLV,
} from '../src/core/mon.ts';
import { validSave } from '../src/core/save.ts';

test('cada tipo vence a dos y esos dos lo resisten', () => {
  for (const t of TYPES) {
    const wins = STRONG[t];
    assert.equal(wins.length, 2);
    for (const w of wins) {
      assert.equal(effectiveness(t, w), 2);
      assert.equal(effectiveness(w, t), 0.5);
    }
  }
  assert.equal(effectiveness('normal', 'roca'), 1);
  assert.equal(effectiveness('fuego', 'fuego'), 0.5);
});

test('todas las criaturas tienen dibujo, movimientos y aprendizaje válidos', () => {
  for (const [id, sp] of Object.entries(SPECIES)) {
    assert.ok(SHAPES[sp.shape], id + ' sin dibujo');
    for (const mv of sp.moves) assert.ok(MOVES[mv], id + ': falta ' + mv);
    for (const [, mv] of sp.learn) assert.ok(MOVES[mv], id + ': aprende ' + mv + ' que no existe');
  }
  for (const id of ROSTER) assert.ok(SPECIES[id].evo, id + ' no evoluciona');
});

test('los dibujos son de 12×12', () => {
  for (const [name, rows] of Object.entries({ ...SHAPES, PERSON })) {
    assert.equal(rows.length, 12, name);
    for (const r of rows) assert.equal(r.length, 6, name);
  }
});

test('el mapa tiene el tamaño correcto y todos los entrenadores son alcanzables', () => {
  assert.equal(MAP.length, MH);
  for (const row of MAP) assert.equal(row.length, MW);
  assert.ok(START && CAMP);
  const seen = new Set([START.x + ',' + START.y]);
  const stack = [START];
  const reached = new Set();
  for (let p = stack.pop(); p; p = stack.pop()) {
    const { x, y } = p;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const t = TRAINERS.find((tr) => tr.x === nx && tr.y === ny);
      if (t) { reached.add(t.id); continue; }
      const k = nx + ',' + ny;
      if (isWalkable(nx, ny) && !seen.has(k)) { seen.add(k); stack.push({ x: nx, y: ny }); }
    }
  }
  assert.deepEqual([...reached].sort(), TRAINERS.map((t) => t.id).sort());
});

test('una criatura nueva de nivel 5 sabe 3 movimientos y tiene la vida llena', () => {
  const m = makeMon('brasalto');
  assert.equal(m.lvl, 5);
  assert.equal(m.moves.length, 3);
  assert.equal(m.pp.length, 3);
  assert.equal(m.hp, maxHp(m));
});

test('a niveles altos se queda con los últimos cuatro movimientos aprendidos', () => {
  const m = makeMon('marejin', 15);
  assert.equal(m.moves.length, 4);
  assert.ok(m.moves.includes('hidrocanon'));
  assert.ok(!m.moves.includes('placaje'));
});

test('subir de nivel suma la vida ganada y respeta el máximo', () => {
  const m = makeMon('pedrusco');
  m.hp = 10;
  const before = maxHp(m);
  const reached = addXp(m, xpNeed(5));
  assert.deepEqual(reached, [6]);
  assert.equal(m.hp, 10 + (maxHp(m) - before));

  const top = makeMon('pedrusco', MAXLV);
  assert.deepEqual(addXp(top, 9999), []);
});

test('evoluciona en el nivel indicado y conserva los movimientos', () => {
  const m = makeMon('chispin', EVO_LV - 1);
  const moves = movesOf(m).slice();
  assert.equal(evolveIfReady(m), false);
  addXp(m, xpNeed(EVO_LV - 1));
  assert.equal(evolveIfReady(m), true);
  assert.equal(m.id, 'relampo');
  assert.deepEqual(m.moves, moves);
  assert.equal(formAt('chispin', EVO_LV), 'relampo');
  assert.equal(formAt('chispin', EVO_LV - 1), 'chispin');
});

test('en el nivel 12 quiere aprender su movimiento más fuerte', () => {
  const m = makeMon('hojarin', 11);
  assert.deepEqual(movesToLearn(m, 12), ['raizazo']);
});

test('las partidas viejas sin movimientos guardados siguen funcionando', () => {
  const old = { id: 'tempano', hp: 70, atkS: 0, defS: 0, pp: [20, 15, 5, 5] };
  assert.equal(movesOf(old).length, 4);
  healTeam([old]);
  assert.equal(old.hp, maxHp(old));
});

test('el daño es más alto con ventaja de tipo y un golpe que falla no hace daño', () => {
  const fire = makeMon('brasalto');
  const leaf = makeMon('hojarin');
  const water = makeMon('marejin');
  const fixed = () => 0.5; // sin crítico, variación fija
  const strong = rollAttack(fire, leaf, MOVES.ascua, fixed);
  const weak = rollAttack(fire, water, MOVES.ascua, fixed);
  assert.equal(strong.e, 2);
  assert.equal(weak.e, 0.5);
  assert.ok(strong.dmg > weak.dmg);
  const miss = rollAttack(fire, leaf, MOVES.hoguera, () => 0.99);
  assert.equal(miss.hit, false);
  assert.equal(miss.dmg, 0);
});

test('acepta las partidas guardadas con el formato actual, con y sin combate', () => {
  const team = [makeMon('brasalto'), makeMon('marejin', 7)];
  const game = { team, potions: 2, pos: { ...START }, beaten: ['lucio'] };
  assert.ok(validSave({ game, battle: null, at: 1 }));
  const battle = { kind: 'wild', name: '', trainerId: null, foe: [makeMon('zarzal')], fi: 0, pi: 1, turn: 3 };
  // Pasa por JSON igual que al guardarse en el navegador.
  assert.ok(validSave(JSON.parse(JSON.stringify({ game, battle, at: 2 }))));
});

test('acepta las partidas viejas sin nivel ni movimientos guardados', () => {
  const old = {
    game: {
      team: [{ id: 'tempano', hp: 70, atkS: 0, defS: 0, pp: [20, 15, 5, 5] }],
      potions: 1, pos: { x: 3, y: 5 }, beaten: [],
    },
    battle: null,
  };
  assert.ok(validSave(old));
  const m = old.game.team[0];
  assert.equal(movesOf(m).length, 4);
  assert.equal(addXp(m, xpNeed(5)).length, 1);
});

test('rechaza las partidas guardadas incompletas o con criaturas que no existen', () => {
  const team = [makeMon('brasalto')];
  const game = { team, potions: 2, pos: { x: 3, y: 5 }, beaten: [] };
  const foe = [makeMon('zarzal')];
  for (const sv of [
    null, 'partida', 42, {}, { game: null },
    { game: { ...game, team: [] } },
    { game: { ...game, team: [{ ...team[0], id: 'noexiste' }] } },
    { game: { ...game, pos: undefined } },
    { game: { ...game, beaten: 'lucio' } },
    { game, battle: { foe, fi: 1, pi: 0 } },
    { game, battle: { foe, fi: 0, pi: 5 } },
    { game, battle: { foe: [{ ...foe[0], id: 'noexiste' }], fi: 0, pi: 0 } },
  ]) {
    assert.equal(validSave(sv), false, JSON.stringify(sv));
  }
});
