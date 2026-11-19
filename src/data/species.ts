import type { MoveId, Palette, Species, SpeciesId, TypeName } from '../core/types.ts';
import type { BaseShape } from './shapes.ts';

/**
 * Criaturas. `moves` es [básico, de tipo, fuerte, de estado] y sirve para armar
 * lo que aprende por nivel. `shape` apunta a un dibujo de shapes.ts y `pal` a sus colores.
 */
type BaseSpecies = Omit<Species, 'shape' | 'learn' | 'evo' | 'base'> & { shape: BaseShape };

const BASE: Record<SpeciesId, BaseSpecies> = {
  brasalto:  { name: 'Brasalto',  type: 'fuego',  shape: 'flame', hp: 62, atk: 14, def: 9,  spd: 12, moves: ['placaje', 'ascua', 'hoguera', 'avivar'],      pal: { o: '#3b1020', a: '#ff6b4a', b: '#c73e3a', c: '#ffd166' } },
  marejin:   { name: 'Marejín',   type: 'agua',   shape: 'drop',  hp: 70, atk: 11, def: 12, spd: 9,  moves: ['placaje', 'chorro', 'oleaje', 'coraza'],      pal: { o: '#0e2340', a: '#45c4d6', b: '#2a8fb0', c: '#e6fbff' } },
  hojarin:   { name: 'Hojarín',   type: 'planta', shape: 'leaf',  hp: 66, atk: 12, def: 11, spd: 10, moves: ['placaje', 'latigo', 'vendaval', 'savia'],     pal: { o: '#12301a', a: '#93d14f', b: '#5fa33a', c: '#f3ead7' } },
  tizon:     { name: 'Tizón',     type: 'fuego',  shape: 'flame', hp: 58, atk: 13, def: 10, spd: 11, moves: ['placaje', 'ascua', 'hoguera', 'avivar'],      pal: { o: '#1d1024', a: '#b0415f', b: '#7a2a4a', c: '#ffb37a' } },
  charquin:  { name: 'Charquín',  type: 'agua',   shape: 'drop',  hp: 66, atk: 11, def: 11, spd: 10, moves: ['placaje', 'chorro', 'oleaje', 'coraza'],      pal: { o: '#151033', a: '#6b78e8', b: '#4a52b8', c: '#d6dcff' } },
  zarzal:    { name: 'Zarzal',    type: 'planta', shape: 'leaf',  hp: 62, atk: 13, def: 10, spd: 9,  moves: ['placaje', 'latigo', 'vendaval', 'savia'],     pal: { o: '#1c2410', a: '#b9b84a', b: '#8a8a30', c: '#f6f0c0' } },
  chispin:   { name: 'Chispín',   type: 'rayo',   shape: 'bolt',  hp: 54, atk: 13, def: 8,  spd: 14, moves: ['placaje', 'descarga', 'tormenta', 'carga'],   pal: { o: '#33240a', a: '#ffd166', b: '#e0a030', c: '#fff6c9' } },
  voltejo:   { name: 'Voltejo',   type: 'rayo',   shape: 'bolt',  hp: 60, atk: 14, def: 9,  spd: 12, moves: ['placaje', 'descarga', 'tormenta', 'carga'],   pal: { o: '#1f1238', a: '#a77bf3', b: '#7a52c7', c: '#f1e4ff' } },
  pedrusco:  { name: 'Pedrusco',  type: 'roca',   shape: 'rock',  hp: 76, atk: 12, def: 14, spd: 6,  moves: ['placaje', 'pedrada', 'derrumbe', 'endurecer'], pal: { o: '#2a1d14', a: '#b08a6a', b: '#86654a', c: '#e6d2b8' } },
  penon:     { name: 'Peñón',     type: 'roca',   shape: 'rock',  hp: 72, atk: 13, def: 13, spd: 7,  moves: ['placaje', 'pedrada', 'derrumbe', 'endurecer'], pal: { o: '#1c2026', a: '#8793a3', b: '#5f6b7a', c: '#d7dee6' } },
  escarchin: { name: 'Escarchín', type: 'hielo',  shape: 'ice',   hp: 60, atk: 12, def: 10, spd: 13, moves: ['placaje', 'escarcha', 'ventisca', 'cristal'],  pal: { o: '#12304a', a: '#bfe9ff', b: '#7cc3ea', c: '#ffffff' } },
  tempano:   { name: 'Témpano',   type: 'hielo',  shape: 'ice',   hp: 70, atk: 11, def: 13, spd: 8,  moves: ['placaje', 'escarcha', 'ventisca', 'deshielo'], pal: { o: '#1a2340', a: '#8fb2ff', b: '#5f80d6', c: '#eef3ff' } },
};

/** Las que se pueden elegir al armar el equipo y aparecer en el pasto alto. */
export const ROSTER: readonly SpeciesId[] = ['brasalto', 'tizon', 'marejin', 'charquin', 'hojarin', 'zarzal', 'chispin', 'voltejo', 'pedrusco', 'penon', 'escarchin', 'tempano'];
/** Las que desfilan en la pantalla de título. */
export const PARADE: readonly SpeciesId[] = ['brasalto', 'marejin', 'hojarin', 'chispin', 'pedrusco', 'escarchin'];

/** Cada criatura evoluciona a este nivel y mejora un 30% sus estadísticas base. */
export const EVO_LV = 10;
/** [especie, id de la evolución, nombre, colores]. */
const EVOS: readonly [SpeciesId, SpeciesId, string, Palette][] = [
  ['brasalto',  'pirodon',   'Pirodón',   { o: '#3b1020', a: '#ff4a2e', b: '#a8262e', c: '#ffe08a' }],
  ['tizon',     'brasero',   'Brasero',   { o: '#1d1024', a: '#d0405a', b: '#6e1f3e', c: '#ffc98f' }],
  ['marejin',   'marejadon', 'Marejadón', { o: '#0e2340', a: '#2fb0d0', b: '#1d6f99', c: '#f0fdff' }],
  ['charquin',  'lagunon',   'Lagunón',   { o: '#151033', a: '#5866e0', b: '#343c9a', c: '#e2e6ff' }],
  ['hojarin',   'frondon',   'Frondón',   { o: '#12301a', a: '#7cc23a', b: '#3f7f28', c: '#ffe9a8' }],
  ['zarzal',    'espinardo', 'Espinardo', { o: '#1c2410', a: '#a7a83a', b: '#6b6c22', c: '#fff7c0' }],
  ['chispin',   'relampo',   'Relampo',   { o: '#33240a', a: '#ffc53d', b: '#c7841c', c: '#fffbe0' }],
  ['voltejo',   'voltaico',  'Voltaico',  { o: '#1f1238', a: '#9566f0', b: '#5e3aa8', c: '#f6edff' }],
  ['pedrusco',  'penascon',  'Peñascón',  { o: '#2a1d14', a: '#a07a58', b: '#6e5038', c: '#f0e0c8' }],
  ['penon',     'montarron', 'Montarrón', { o: '#1c2026', a: '#78869a', b: '#4c5666', c: '#e6ecf2' }],
  ['escarchin', 'nevadon',   'Nevadón',   { o: '#12304a', a: '#aee0ff', b: '#5aaee0', c: '#ffffff' }],
  ['tempano',   'icebergo',  'Icebergo',  { o: '#1a2340', a: '#7aa0ff', b: '#4a68c4', c: '#f4f7ff' }],
];

/** Movimiento más potente de cada tipo (nivel 12) y uno de otro tipo para cubrir debilidades (nivel 15). */
const ULT: Record<TypeName, MoveId> = { fuego: 'infierno', agua: 'hidrocanon', planta: 'raizazo', rayo: 'tempestad', roca: 'cordillera', hielo: 'eraglacial' };
const COVER: Record<TypeName, MoveId> = { fuego: 'descarga', agua: 'escarcha', planta: 'pedrada', rayo: 'latigo', roca: 'ascua', hielo: 'pedrada' };

/** Lista de [nivel, movimiento] que aprende una criatura. */
function learnList(type: TypeName, m: readonly MoveId[]): Species['learn'] {
  return [[1, m[0]], [1, m[1]], [5, m[3]], [7, m[2]], [12, ULT[type]], [15, COVER[type]]];
}

export const SPECIES: Record<SpeciesId, Species> = {};
for (const [id, b] of Object.entries(BASE)) SPECIES[id] = { ...b, learn: learnList(b.type, b.moves) };
for (const [from, id, name, pal] of EVOS) {
  const b = BASE[from];
  const up = (v: number) => Math.round(v * 1.3);
  SPECIES[from].evo = { lvl: EVO_LV, to: id };
  SPECIES[id] = {
    name, type: b.type, shape: `${b.shape}2`,
    hp: up(b.hp), atk: up(b.atk), def: up(b.def), spd: up(b.spd),
    moves: b.moves, pal, base: from, learn: learnList(b.type, b.moves),
  };
}
