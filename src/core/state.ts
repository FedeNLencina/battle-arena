import type { Battle, Game, MenuKind, Mon, MoveId, Opts, ScreenName, SpeciesId } from './types.ts';

type State = {
  screen: ScreenName;
  opts: Opts;
  game: Game | null;
  battle: Battle | null;
};

/** Estado del juego que se guarda: la partida en curso y el combate, si hay uno. */
export const S: State = {
  screen: 'title',
  opts: { speed: 1, anim: true },
  game: null,
  battle: null,
};

type UiState = {
  /** True mientras corre un texto o una animación: los menús no responden. */
  busy: boolean;
  /** Pide adelantar el texto que se está escribiendo. */
  skip: boolean;
  /** True cuando la criatura en combate se debilitó y hay que elegir otra sí o sí. */
  forced: boolean;
  menuKind: MenuKind;
  /** Criaturas marcadas al armar el equipo, en orden. */
  picked: SpeciesId[];
  /** Mensaje que se muestra debajo del mapa. */
  mapNote: string;
  /** Qué criatura está dibujada en cada lado del combate, para redibujar solo si cambia. */
  shown: { p: SpeciesId | null; f: SpeciesId | null };
  /** Elección pendiente al aprender un movimiento con los cuatro espacios ocupados. */
  learnResolve: ((i: number) => void) | null;
  learnCtx: { m: Mon; mv: MoveId } | null;
};

/** Estado de la interfaz que no se guarda. */
export const ui: UiState = {
  busy: false,
  skip: false,
  forced: false,
  menuKind: 'actions',
  picked: [],
  mapNote: '',
  shown: { p: null, f: null },
  learnResolve: null,
  learnCtx: null,
};

/** La partida en curso. Solo se usa en pantallas donde siempre hay una (mapa y combate). */
export function game(): Game {
  if (!S.game) throw new Error('No hay una partida en curso');
  return S.game;
}

/** El combate en curso. Solo se usa en la pantalla de combate. */
export function battle(): Battle {
  if (!S.battle) throw new Error('No hay un combate en curso');
  return S.battle;
}

/** Busca un elemento que tiene que existir en la página (o dentro de `root`). */
export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error('No existe ' + sel);
  return el;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
