/**
 * Reglas de las criaturas: niveles, estadísticas, experiencia, movimientos y daño.
 * No toca el DOM, así que se puede probar con `pnpm test`.
 */
import { SPECIES } from '../data/species.ts';
import { MOVES } from '../data/moves.ts';
import { effectiveness } from '../data/types.ts';
import type { Mon, Move, MoveId, SpeciesId, StatKey } from './types.ts';

/** Una criatura recién creada: a diferencia de las guardadas, siempre tiene nivel y movimientos. */
export type NewMon = Mon & { lvl: number; xp: number; moves: MoveId[] };

export type AttackResult = { hit: boolean; dmg: number; e: number; crit: boolean };

export const MAXLV = 30;
/** Las partidas viejas no guardaban nivel: valen como nivel 5. */
export const LV = (m: Mon) => m.lvl || 5;
/** Cada nivel por encima del 5 suma un 7% a todas las estadísticas. */
export const scale = (m: Mon) => 1 + 0.07 * (LV(m) - 5);
export const maxHp = (m: Mon) => Math.round(SPECIES[m.id].hp * scale(m));
export const stat = (m: Mon, k: StatKey) => SPECIES[m.id][k] * scale(m);
export const xpNeed = (l: number) => 20 + l * 10;
export const xpPct = (m: Mon) => (LV(m) >= MAXLV ? 100 : Math.min(100, ((m.xp || 0) / xpNeed(LV(m))) * 100));
export const nameOf = (m: Mon) => SPECIES[m.id].name;
/** Cada mejora de ataque o defensa vale un 25% (hasta 3). */
export const mult = (s: number) => 1 + 0.25 * s;

/** La forma que corresponde a una criatura a cierto nivel (ya evolucionada o no). */
export function formAt(id: SpeciesId, lvl: number): SpeciesId {
  const e = SPECIES[id].evo;
  return e && lvl >= e.lvl ? e.to : id;
}

/** Movimientos que sabe. Las partidas viejas no los guardaban: se completan con los de su especie. */
export function movesOf(m: Mon): MoveId[] {
  if (!Array.isArray(m.moves)) m.moves = SPECIES[m.id].moves.slice();
  return m.moves;
}

/** Crea una criatura con los últimos cuatro movimientos que habría aprendido hasta su nivel. */
export function makeMon(id: SpeciesId, lvl = 5): NewMon {
  const known: MoveId[] = [];
  SPECIES[id].learn.forEach(([l, mv]) => {
    if (l <= lvl && !known.includes(mv)) known.push(mv);
  });
  const moves = known.slice(-4);
  const m: NewMon = { id, lvl, xp: 0, hp: 0, atkS: 0, defS: 0, moves, pp: moves.map((x) => MOVES[x].pp) };
  m.hp = maxHp(m);
  return m;
}

/** Recupera vida y PP de todo el equipo y borra las mejoras de combate. */
export function healTeam(team: Mon[]): void {
  team.forEach((m) => {
    m.hp = maxHp(m);
    m.pp = movesOf(m).map((x) => MOVES[x].pp);
    m.atkS = 0;
    m.defS = 0;
  });
}

/** Experiencia que da vencer a `foe`. Los entrenadores dan un 50% más que los salvajes. */
export function xpReward(foe: Mon, isTrainer: boolean): number {
  return Math.round((20 + LV(foe) * 8) * (isTrainer ? 1.5 : 1));
}

/**
 * Resuelve un ataque de daño. `rng` devuelve números entre 0 y 1 (se puede fijar en las pruebas).
 * Los movimientos de estado no pasan por acá.
 */
export function rollAttack(user: Mon, target: Mon, mv: Move, rng: () => number = Math.random): AttackResult {
  if (rng() * 100 >= mv.acc) return { hit: false, dmg: 0, e: 1, crit: false };
  const e = effectiveness(mv.type, SPECIES[target.id].type);
  const crit = rng() < 1 / 12;
  let dmg = ((mv.power ?? 0) * (stat(user, 'atk') * mult(user.atkS))) / (stat(target, 'def') * mult(target.defS));
  dmg *= 0.3 * e * (0.85 + rng() * 0.15);
  if (crit) dmg *= 1.5;
  return { hit: true, dmg: Math.max(1, Math.round(dmg) + 1), e, crit };
}

/** Suma experiencia sin subir de nivel todavía. Devuelve false si ya está en el nivel máximo. */
export function gainXp(m: Mon, amount: number): boolean {
  if (LV(m) >= MAXLV) return false;
  m.lvl = LV(m);
  m.xp = (m.xp || 0) + amount;
  return true;
}

/** Sube un nivel si le alcanza la experiencia. La vida ganada se suma a la actual. */
export function levelUpOnce(m: Mon): boolean {
  const xp = m.xp || 0;
  if (LV(m) >= MAXLV || xp < xpNeed(LV(m))) return false;
  m.xp = xp - xpNeed(LV(m));
  const before = maxHp(m);
  m.lvl = LV(m) + 1;
  m.hp += maxHp(m) - before;
  return true;
}

/** Suma experiencia y sube todos los niveles que correspondan. Devuelve los niveles alcanzados. */
export function addXp(m: Mon, amount: number): number[] {
  const reached: number[] = [];
  if (!gainXp(m, amount)) return reached;
  while (levelUpOnce(m)) reached.push(LV(m));
  return reached;
}

/** Evoluciona si ya le corresponde. Devuelve true si cambió de forma. */
export function evolveIfReady(m: Mon): boolean {
  movesOf(m);
  const e = SPECIES[m.id].evo;
  if (!e || LV(m) < e.lvl) return false;
  const before = maxHp(m);
  m.id = e.to;
  m.hp += maxHp(m) - before;
  return true;
}

/** Movimientos que aprende justo en este nivel y todavía no sabe. */
export function movesToLearn(m: Mon, lvl: number): MoveId[] {
  return SPECIES[m.id].learn.filter(([l, mv]) => l === lvl && !movesOf(m).includes(mv)).map(([, mv]) => mv);
}
