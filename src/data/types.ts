import type { MoveType, TypeName } from '../core/types.ts';

export const TYPES: readonly TypeName[] = ['fuego', 'agua', 'planta', 'rayo', 'roca', 'hielo'];

/** Cada tipo vence a dos tipos y recibe menos daño de ellos. */
export const STRONG: Readonly<Record<TypeName, readonly TypeName[]>> = {
  fuego:  ['planta', 'hielo'],
  agua:   ['fuego', 'roca'],
  planta: ['agua', 'roca'],
  rayo:   ['agua', 'hielo'],
  roca:   ['fuego', 'rayo'],
  hielo:  ['planta', 'roca'],
};

export const TYPE_NAME: Readonly<Record<MoveType, string>> = {
  fuego: 'Fuego', agua: 'Agua', planta: 'Planta', rayo: 'Rayo',
  roca: 'Roca', hielo: 'Hielo', normal: 'Normal',
};

/** Multiplicador de daño de un movimiento de tipo `mt` contra una criatura de tipo `dt`. */
export function effectiveness(mt: MoveType, dt: TypeName): number {
  if (mt === 'normal') return 1;
  if (STRONG[mt].includes(dt)) return 2;
  if (STRONG[dt].includes(mt) || mt === dt) return 0.5;
  return 1;
}
