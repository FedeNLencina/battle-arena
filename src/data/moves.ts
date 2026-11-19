import type { Move } from '../core/types.ts';

/**
 * Movimientos. Los de daño tienen `power`; los de estado tienen `effect`:
 * 'atk' sube el ataque, 'def' sube la defensa, 'heal' recupera vida.
 */
const MOVE_DATA = {
  placaje:    { name: 'Embestida',         type: 'normal', power: 40,  acc: 100, pp: 20 },
  ascua:      { name: 'Chispazo',          type: 'fuego',  power: 50,  acc: 100, pp: 15 },
  hoguera:    { name: 'Gran Hoguera',      type: 'fuego',  power: 85,  acc: 75,  pp: 5 },
  avivar:     { name: 'Avivar',            type: 'fuego',  effect: 'atk',  acc: 100, pp: 10, desc: 'Sube el ataque' },
  chorro:     { name: 'Chorro',            type: 'agua',   power: 50,  acc: 100, pp: 15 },
  oleaje:     { name: 'Marejada',          type: 'agua',   power: 80,  acc: 80,  pp: 5 },
  coraza:     { name: 'Coraza',            type: 'agua',   effect: 'def',  acc: 100, pp: 10, desc: 'Sube la defensa' },
  latigo:     { name: 'Latigazo Verde',    type: 'planta', power: 50,  acc: 100, pp: 15 },
  vendaval:   { name: 'Vendaval de Hojas', type: 'planta', power: 85,  acc: 75,  pp: 5 },
  savia:      { name: 'Savia',             type: 'planta', effect: 'heal', acc: 100, pp: 5,  desc: 'Recupera vida' },
  descarga:   { name: 'Descarga',          type: 'rayo',   power: 50,  acc: 100, pp: 15 },
  tormenta:   { name: 'Tormenta Seca',     type: 'rayo',   power: 85,  acc: 75,  pp: 5 },
  carga:      { name: 'Carga',             type: 'rayo',   effect: 'atk',  acc: 100, pp: 10, desc: 'Sube el ataque' },
  pedrada:    { name: 'Pedrada',           type: 'roca',   power: 50,  acc: 100, pp: 15 },
  derrumbe:   { name: 'Derrumbe',          type: 'roca',   power: 80,  acc: 80,  pp: 5 },
  endurecer:  { name: 'Endurecer',         type: 'roca',   effect: 'def',  acc: 100, pp: 10, desc: 'Sube la defensa' },
  escarcha:   { name: 'Escarcha',          type: 'hielo',  power: 50,  acc: 100, pp: 15 },
  ventisca:   { name: 'Ventisca',          type: 'hielo',  power: 85,  acc: 75,  pp: 5 },
  cristal:    { name: 'Cristalizar',       type: 'hielo',  effect: 'def',  acc: 100, pp: 10, desc: 'Sube la defensa' },
  deshielo:   { name: 'Deshielo',          type: 'hielo',  effect: 'heal', acc: 100, pp: 5,  desc: 'Recupera vida' },
  infierno:   { name: 'Infierno',          type: 'fuego',  power: 100, acc: 85,  pp: 5 },
  hidrocanon: { name: 'Hidrocañón',        type: 'agua',   power: 100, acc: 85,  pp: 5 },
  raizazo:    { name: 'Raíz Ancestral',    type: 'planta', power: 100, acc: 85,  pp: 5 },
  tempestad:  { name: 'Tempestad',         type: 'rayo',   power: 100, acc: 85,  pp: 5 },
  cordillera: { name: 'Cordillera',        type: 'roca',   power: 100, acc: 85,  pp: 5 },
  eraglacial: { name: 'Era Glacial',       type: 'hielo',  power: 100, acc: 85,  pp: 5 },
  /** Se usa solo cuando a la criatura no le quedan PP. */
  forcejeo:   { name: 'Forcejeo',          type: 'normal', power: 30,  acc: 100, pp: 1 },
} satisfies Record<string, Move>;

export type MoveId = keyof typeof MOVE_DATA;
export const MOVES: Readonly<Record<MoveId, Move>> = MOVE_DATA;
