/** Tipos compartidos del juego. Solo tipos: al correr no queda nada de este archivo. */
import type { MoveId } from '../data/moves.ts';
import type { ShapeId } from '../data/shapes.ts';

export type { MoveId, ShapeId };

export type TypeName = 'fuego' | 'agua' | 'planta' | 'rayo' | 'roca' | 'hielo';
/** Los movimientos pueden ser además de tipo normal, que no tiene ventajas ni desventajas. */
export type MoveType = TypeName | 'normal';
/** Las especies evolucionadas se agregan al cargar los datos, así que el id es un string libre. */
export type SpeciesId = string;
export type StatKey = 'hp' | 'atk' | 'def' | 'spd';

/** Colores de una criatura: o contorno, a/b/c colores del cuerpo. */
export type Palette = { o: string; a: string; b: string; c: string };

type MoveBase = { name: string; type: MoveType; acc: number; pp: number };
export type DamageMove = MoveBase & { power: number; effect?: undefined; desc?: undefined };
/** 'atk' sube el ataque, 'def' sube la defensa, 'heal' recupera vida. */
export type StatusMove = MoveBase & { effect: 'atk' | 'def' | 'heal'; desc: string; power?: undefined };
export type Move = DamageMove | StatusMove;

export type Species = {
  name: string;
  type: TypeName;
  shape: ShapeId;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  /** [básico, de tipo, fuerte, de estado]. */
  moves: readonly MoveId[];
  pal: Palette;
  /** Lista de [nivel, movimiento] que aprende. */
  learn: readonly (readonly [number, MoveId])[];
  evo?: { lvl: number; to: SpeciesId };
  /** En las evoluciones, la especie de la que vienen. */
  base?: SpeciesId;
};

/** Una criatura del equipo o del rival, tal como se guarda en la partida. */
export type Mon = {
  id: SpeciesId;
  /** Las partidas viejas no lo guardaban: leerlo con `LV()`. */
  lvl?: number;
  xp?: number;
  hp: number;
  /** Mejoras de ataque y defensa del combate actual (0 a 3). */
  atkS: number;
  defS: number;
  /** Las partidas viejas no lo guardaban: leerlo con `movesOf()`. */
  moves?: MoveId[];
  pp: number[];
};

export type Pos = { x: number; y: number };

export type Game = { team: Mon[]; potions: number; pos: Pos; beaten: string[] };

export type Battle = {
  kind: 'wild' | 'trainer';
  name: string;
  trainerId: string | null;
  foe: Mon[];
  /** Índice de la criatura rival en combate. */
  fi: number;
  /** Índice de tu criatura en combate. */
  pi: number;
  turn: number;
};

export type SaveData = { game: Game; battle?: Battle | null; at?: number };

export type Opts = { speed: number; anim: boolean };

export type ScreenName = 'title' | 'options' | 'choose' | 'map' | 'battle' | 'end';

export type MenuKind = 'actions' | 'moves' | 'team' | 'learn' | 'bag' | 'busy';

/** Lo que elige el jugador en su turno. */
export type Action =
  | { kind: 'move'; i: number }
  | { kind: 'switch'; i: number }
  | { kind: 'run' }
  | { kind: 'item' };
