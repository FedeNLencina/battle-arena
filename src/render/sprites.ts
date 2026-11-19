import { SPECIES } from '../data/species.ts';
import { SHAPES } from '../data/shapes.ts';
import type { SpeciesId } from '../core/types.ts';

/** Pinta un dibujo de 12×12 (mitad izquierda + espejo) en el contexto `g`, desde (ox, oy). */
export function paint(
  g: CanvasRenderingContext2D,
  rows: readonly string[],
  pal: Readonly<Record<string, string>>,
  ox = 0,
  oy = 0,
): void {
  rows.forEach((half, y) => {
    const full = half + half.split('').reverse().join('');
    for (let x = 0; x < 12; x++) {
      const ch = full[x];
      if (ch === '.') continue;
      g.fillStyle = ch === 'k' ? pal.o : pal[ch];
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

/** Dibuja la criatura `id` en un canvas de 12×12. */
export function drawSprite(cv: HTMLCanvasElement, id: SpeciesId): void {
  const sp = SPECIES[id];
  const g = cv.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, 12, 12);
  paint(g, SHAPES[sp.shape], sp.pal);
}

export function spriteCanvas(id: SpeciesId): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  c.className = 'sprite';
  drawSprite(c, id);
  return c;
}
