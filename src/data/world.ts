import type { Pos, SpeciesId } from '../core/types.ts';

/**
 * Mapa del Valle del Ocaso.
 * T árbol · g pasto alto · w agua · = camino · H campamento · S inicio · 1-3 entrenadores
 */
export const MAP: readonly string[] = [
  'TTTTTTTTTTTTTTT',
  'T..gg....=...3T',
  'T.ggg..TT=....T',
  'T..gg..TT====.T',
  'T......=....=.T',
  'TH.S====.ww.=.T',
  'T......=.ww.=2T',
  'T.TT...=....ggT',
  'T.TT.1.=...gggT',
  'T......====gggT',
  'TTTTTTTTTTTTTTT',
];
export const TILE = 16;
export const MW = 15;
export const MH = 11;

/** Probabilidad de encontrar una criatura salvaje por cada paso en el pasto alto. */
export const WILD_RATE = 0.15;

export type Trainer = {
  id: string;
  /** Carácter que lo ubica en el mapa. */
  ch: string;
  name: string;
  lvl: number;
  team: readonly SpeciesId[];
  /** o contorno, h pelo, s piel, a ropa, b pantalón. */
  pal: { o: string; h: string; s: string; a: string; b: string };
};

const TRAINER_DATA: readonly Trainer[] = [
  { id: 'lucio', ch: '1', name: 'Lucio', lvl: 5, team: ['zarzal', 'charquin'],             pal: { o: '#0a0918', h: '#93d14f', s: '#f0c9a0', a: '#3fa06a', b: '#2b3a67' } },
  { id: 'maia',  ch: '2', name: 'Maia',  lvl: 7, team: ['voltejo', 'penon', 'tizon'],       pal: { o: '#0a0918', h: '#45c4d6', s: '#d9a77c', a: '#2a8fb0', b: '#3a2f6b' } },
  { id: 'vera',  ch: '3', name: 'Vera',  lvl: 9, team: ['tempano', 'pedrusco', 'brasalto'], pal: { o: '#0a0918', h: '#ff6b4a', s: '#f0c9a0', a: '#c73e3a', b: '#24204d' } },
];

export function findTile(ch: string): Pos | null {
  for (let y = 0; y < MH; y++) {
    const x = MAP[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  return null;
}

/** Como `findTile`, pero la casilla tiene que existir: si falta, el mapa está mal armado. */
function mustFind(ch: string): Pos {
  const p = findTile(ch);
  if (!p) throw new Error('Falta la casilla ' + ch + ' en el mapa');
  return p;
}

export const TRAINERS: readonly (Trainer & Pos)[] = TRAINER_DATA.map((t) => ({ ...t, ...mustFind(t.ch) }));
export const START = mustFind('S');
export const CAMP = mustFind('H');

/** True si se puede pisar la casilla (los entrenadores bloquean, pero se chocan para desafiarlos). */
export function isWalkable(x: number, y: number): boolean {
  const ch = (MAP[y] || '')[x];
  return !!ch && ch !== 'T' && ch !== 'w';
}
