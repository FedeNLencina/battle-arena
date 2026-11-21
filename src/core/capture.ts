/**
 * Captura de criaturas salvajes, Cápsulas y Reserva.
 * No toca el DOM, así que se puede probar con `pnpm test`.
 */
import { LV, maxHp, movesOf } from './mon.ts';
import type { Game, Mon } from './types.ts';

/** El equipo lleva hasta 6 criaturas; las demás capturadas van a la Reserva. */
export const MAX_TEAM = 6;
/** Cápsulas con las que arranca una partida (y las partidas viejas, que no las guardaban). */
export const START_CAPSULES = 5;
/** Cápsulas que da cada entrenador vencido. */
export const TRAINER_CAPSULES = 3;
/** Probabilidad de que un salvaje vencido deje caer una Cápsula. */
export const CAPSULE_DROP = 0.25;

/** Cápsulas que quedan. Las partidas viejas no las guardaban: valen como las iniciales. */
export const capsulesOf = (g: Game): number => g.capsules ?? START_CAPSULES;

/** La Reserva. Las partidas viejas no la guardaban: arranca vacía. */
export function boxOf(g: Game): Mon[] {
  if (!Array.isArray(g.box)) g.box = [];
  return g.box;
}

/**
 * Probabilidad de atrapar a `target`, entre 0,05 y 0,95.
 * Con la vida llena es del 25% y sube hasta el 85% cuanto menos vida le queda.
 * Cada nivel por encima del promedio del equipo la baja un 10% (hasta la mitad), y cada
 * nivel por debajo la sube un 10% (hasta un 20% más).
 */
export function captureChance(target: Mon, team: readonly Mon[]): number {
  const hpLeft = Math.max(0, target.hp) / maxHp(target);
  const base = 0.25 + 0.6 * (1 - hpLeft);
  const avg = team.length ? team.reduce((a, m) => a + LV(m), 0) / team.length : LV(target);
  const lvMult = Math.min(1.2, Math.max(0.5, 1 - 0.1 * (LV(target) - avg)));
  return Math.min(0.95, Math.max(0.05, base * lvMult));
}

/** Tira la Cápsula. `rng` devuelve números entre 0 y 1 (se puede fijar en las pruebas). */
export function tryCapture(target: Mon, team: readonly Mon[], rng: () => number = Math.random): boolean {
  return rng() < captureChance(target, team);
}

/**
 * Suma una criatura atrapada: al equipo si hay lugar, si no a la Reserva.
 * Se guarda una copia sin las mejoras del combate. Devuelve adónde fue.
 */
export function addCaptured(g: Game, m: Mon): 'team' | 'box' {
  const caught: Mon = { ...m, atkS: 0, defS: 0, xp: m.xp ?? 0, moves: movesOf(m).slice(), pp: m.pp.slice() };
  if (g.team.length < MAX_TEAM) {
    g.team.push(caught);
    return 'team';
  }
  boxOf(g).push(caught);
  return 'box';
}

/** Pasa la criatura `i` del equipo a la Reserva. El equipo nunca queda vacío. */
export function moveToBox(g: Game, i: number): boolean {
  if (g.team.length <= 1 || !g.team[i]) return false;
  boxOf(g).push(...g.team.splice(i, 1));
  return true;
}

/** Pasa la criatura `i` de la Reserva al final del equipo, si hay lugar. */
export function moveToTeam(g: Game, i: number): boolean {
  const box = boxOf(g);
  if (g.team.length >= MAX_TEAM || !box[i]) return false;
  g.team.push(...box.splice(i, 1));
  return true;
}

/** Pone la criatura `i` del equipo primera: es la que sale a combatir. */
export function makeLead(g: Game, i: number): boolean {
  if (i <= 0 || !g.team[i]) return false;
  g.team.unshift(...g.team.splice(i, 1));
  return true;
}
