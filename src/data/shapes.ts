/**
 * Dibujos de 12×12 píxeles. Cada fila es la mitad izquierda (6 caracteres);
 * la derecha es su espejo. Letras: o contorno, a/b/c colores de la paleta,
 * k ojo (se pinta con el color del contorno), . transparente.
 * Las formas terminadas en 2 son las evoluciones.
 */
/** Las formas base; cada una tiene su versión evolucionada terminada en 2. */
export type BaseShape = 'flame' | 'drop' | 'bolt' | 'rock' | 'ice' | 'leaf';
export type ShapeId = BaseShape | `${BaseShape}2`;

export const SHAPES: Readonly<Record<ShapeId, readonly string[]>> = {
  flame:  ['.....o', '....oa', '...oaa', '..oaaa', '.oaaaa', '.oakaa', 'oaaaaa', 'oabccc', 'oabccc', '.oabcc', '..oaoo', '..oo..'],
  drop:   ['......', '...ooo', '..oaaa', '.oaaaa', 'ooakaa', 'oaaaaa', 'oaaaac', 'ooaccc', '.oaccc', '.oaaaa', '..oooo', '......'],
  bolt:   ['.o...o', '.oo.oa', '..oaaa', 'o.oaaa', 'ooaaaa', '.oakaa', 'ooaaaa', 'o.oacc', '..oacc', '.ooaaa', '.o.ooo', '......'],
  rock:   ['......', '..oooo', '.oaaab', 'oaaaaa', 'oabaaa', 'oaakaa', 'oaaaaa', 'obaacc', 'oaaacc', 'oaabaa', '.ooooo', '......'],
  ice:    ['.....o', '....oc', 'o..oca', 'oo.oaa', '.ooaaa', '.oakaa', 'ooaaaa', 'oacaab', '.oaabb', '..oabb', '...oab', '....oo'],
  leaf:   ['..oo.o', '.oaao.', '.oaaoo', '..oaaa', '.oaaaa', '.oakaa', 'oaaaaa', 'oabccc', '.oaccc', '.oaaaa', '.oaooa', '.oo.oo'],
  flame2: ['o...oo', 'ao.oaa', 'aaoaaa', 'oaaaaa', 'oaakaa', 'oaaaaa', 'obaccc', 'obaccc', 'obbacc', 'oobaaa', '.oaoo.', '.oo...'],
  drop2:  ['....oo', '...oaa', '..oaaa', '.oaaaa', 'oaaaaa', 'oakaaa', 'oaaaaa', 'oaaccc', 'oaaccc', 'ooaccc', '.oaaaa', '.ooooo'],
  leaf2:  ['.oo.oo', 'oaaoaa', 'oaaaaa', '.oaaaa', 'oaaaaa', 'oakaaa', 'oaaaaa', '.oaccc', '..oacc', '..obbb', '.obbbb', '.ooooo'],
  bolt2:  ['o....o', 'oo..oa', '.oo.oa', '..oaaa', '.oaaaa', 'ooakaa', '.oaaaa', 'ooaccc', '.oaccc', '..oaaa', '.oo.oo', 'oo....'],
  rock2:  ['..oooo', '.obaaa', 'obaaaa', 'oaaaaa', 'oakaaa', 'oaaaaa', 'obaaab', 'oaaccc', 'obaccc', 'oaaaab', 'oaaaaa', '.ooooo'],
  ice2:   ['o....o', 'co..oc', 'aco.oa', '.oaoaa', '.oaaaa', 'oakaaa', 'oaaaaa', 'oacaab', 'oaabbb', '.oabbb', '..oabb', '...ooo'],
};

/** Dibujo de los entrenadores en el mapa. h pelo, s piel, a ropa, b pantalón. */
export const PERSON: readonly string[] = ['....oo', '...ohh', '..oohh', '...oks', '...oss', '..oaaa', '.osaaa', '.osaaa', '..oaaa', '..obbo', '..obbo', '..ooo.'];
