import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeMon, maxHp } from '../src/core/mon.ts';
import {
  MAX_TEAM, START_CAPSULES, capsulesOf, boxOf, captureChance, tryCapture,
  addCaptured, moveToBox, moveToTeam, makeLead,
} from '../src/core/capture.ts';
import { validSave } from '../src/core/save.ts';
import type { Game } from '../src/core/types.ts';

const newGame = (ids: string[], lvl = 5): Game => ({
  team: ids.map((id) => makeMon(id, lvl)), potions: 2, pos: { x: 3, y: 5 }, beaten: [],
  capsules: START_CAPSULES, box: [],
});

test('con la vida llena y el mismo nivel la captura es del 25%', () => {
  const g = newGame(['brasalto', 'marejin', 'hojarin']);
  const wild = makeMon('zarzal', 5);
  assert.equal(captureChance(wild, g.team), 0.25);
});

test('cuanta menos vida le queda, más fácil es atraparla', () => {
  const g = newGame(['brasalto']);
  const wild = makeMon('zarzal', 5);
  const full = captureChance(wild, g.team);
  wild.hp = Math.round(maxHp(wild) / 2);
  const half = captureChance(wild, g.team);
  wild.hp = 1;
  const low = captureChance(wild, g.team);
  assert.ok(full < half && half < low, [full, half, low].join(' < '));
  assert.ok(low > 0.8);
});

test('una criatura de más nivel que el equipo cuesta más, sin bajar del 5% ni pasar del 95%', () => {
  const g = newGame(['brasalto'], 5);
  const same = captureChance(makeMon('zarzal', 5), g.team);
  const higher = captureChance(makeMon('zarzal', 9), g.team);
  const lower = captureChance(makeMon('zarzal', 2), g.team);
  assert.ok(higher < same && same < lower);
  const tough = makeMon('zarzal', 30);
  assert.ok(captureChance(tough, g.team) >= 0.05);
  const weak = makeMon('zarzal', 2);
  weak.hp = 1;
  assert.ok(captureChance(weak, g.team) <= 0.95);
});

test('la Cápsula atrapa si el azar sale por debajo de la probabilidad', () => {
  const g = newGame(['brasalto']);
  const wild = makeMon('zarzal', 5);
  assert.equal(tryCapture(wild, g.team, () => 0.24), true);
  assert.equal(tryCapture(wild, g.team, () => 0.26), false);
});

test('la criatura atrapada va al equipo hasta 6 y después a la Reserva, sin mejoras de combate', () => {
  const g = newGame(['brasalto', 'marejin', 'hojarin']);
  for (let i = g.team.length; i < MAX_TEAM; i++) assert.equal(addCaptured(g, makeMon('zarzal')), 'team');
  assert.equal(g.team.length, MAX_TEAM);
  const wild = makeMon('chispin', 6);
  wild.atkS = 2;
  wild.hp = 3;
  assert.equal(addCaptured(g, wild), 'box');
  const caught = boxOf(g)[0];
  assert.equal(caught.id, 'chispin');
  assert.equal(caught.atkS, 0);
  assert.equal(caught.hp, 3);
  assert.notEqual(caught, wild, 'tiene que guardarse una copia');
});

test('mover entre equipo y Reserva respeta los límites', () => {
  const g = newGame(['brasalto', 'marejin']);
  assert.equal(moveToBox(g, 1), true);
  assert.deepEqual(g.team.map((m) => m.id), ['brasalto']);
  assert.equal(moveToBox(g, 0), false, 'el equipo nunca queda vacío');
  assert.equal(moveToTeam(g, 0), true);
  assert.deepEqual(g.team.map((m) => m.id), ['brasalto', 'marejin']);
  assert.equal(moveToTeam(g, 0), false, 'la Reserva está vacía');

  while (g.team.length < MAX_TEAM) addCaptured(g, makeMon('zarzal'));
  addCaptured(g, makeMon('penon'));
  assert.equal(moveToTeam(g, 0), false, 'el equipo está lleno');
});

test('se puede elegir quién sale primero', () => {
  const g = newGame(['brasalto', 'marejin', 'hojarin']);
  assert.equal(makeLead(g, 2), true);
  assert.deepEqual(g.team.map((m) => m.id), ['hojarin', 'brasalto', 'marejin']);
  assert.equal(makeLead(g, 0), false);
  assert.equal(makeLead(g, 9), false);
});

test('las partidas viejas sin Cápsulas ni Reserva siguen funcionando', () => {
  const old: unknown = JSON.parse(JSON.stringify({
    game: { team: [{ id: 'tempano', hp: 70, atkS: 0, defS: 0, pp: [20, 15, 5, 5] }], potions: 1, pos: { x: 3, y: 5 }, beaten: ['lucio'] },
    battle: null,
  }));
  assert.ok(validSave(old));
  if (!validSave(old)) return;
  assert.equal(capsulesOf(old.game), START_CAPSULES);
  assert.deepEqual(boxOf(old.game), []);
  assert.equal(addCaptured(old.game, makeMon('zarzal')), 'team');
});

test('rechaza una Reserva o unas Cápsulas mal guardadas', () => {
  const g = newGame(['brasalto']);
  assert.ok(validSave({ game: g }));
  assert.equal(validSave({ game: { ...g, box: 'nada' } }), false);
  assert.equal(validSave({ game: { ...g, box: [{ id: 'noexiste', hp: 1 }] } }), false);
  assert.equal(validSave({ game: { ...g, capsules: '3' } }), false);
});
