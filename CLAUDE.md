# CLAUDE.md

Guía para trabajar en **Arena de Batalla**: un juego de combates por turnos en el navegador,
hecho con TypeScript y Vite, sin frameworks. El README explica las reglas del juego y la
estructura del código; esta guía explica cómo trabajar en él.

## Idioma

- Todo en español rioplatense (voseo): textos del juego, comentarios, README, mensajes de
  commit, títulos y descripciones de pull requests, y las respuestas al dueño del proyecto.
- Los nombres de variables y funciones siguen en inglés corto, como el código existente.

## Forma de trabajo

1. Antes de programar algo grande o ambiguo, proponer el enfoque en pocas líneas y esperar
   el visto bueno. Los cambios chicos y claros se hacen directamente.
2. Al terminar:
   - `pnpm typecheck` tiene que pasar sin errores.
   - `pnpm test` tiene que pasar.
   - `pnpm build` tiene que compilar sin errores.
   - Jugar el cambio en un navegador (con `pnpm dev` o `pnpm preview`) y recorrer el
     camino afectado, por ejemplo un combate completo si se tocó la batalla. La skill `jugar`
     (`.claude/skills/jugar/`) lo hace en un Chrome headless y deja capturas para revisar.

Al reportar, decir qué se probó y qué no. Si algo solo se pudo validar a medias, aclararlo.

## Reglas del código

- `src/data/` tiene solo datos. `src/core/mon.ts` tiene las reglas y no toca el DOM, para poder
  probarlas con `node:test`. La interfaz vive en `src/ui/`, `src/map/` y `src/battle/view.ts`.
- El estado que se guarda va en `S` (`src/core/state.ts`); el estado de la interfaz que no se
  guarda va en `ui`. No crear variables globales nuevas fuera de esos objetos.
- Cada regla nueva que se pueda probar sin pantalla va a `src/core/` con su prueba en `test/`.
- TypeScript en modo `strict`. Solo sintaxis que se pueda borrar sin más (`erasableSyntaxOnly`),
  porque Node corre las pruebas quitando los tipos: nada de `enum`, `namespace` ni propiedades
  en el constructor; usar uniones de strings y objetos. Los imports llevan la extensión `.ts`
  y los que traen solo tipos van con `import type`.
- Los tipos compartidos van en `src/core/types.ts`. Evitar `any` y `as`: lo que viene de afuera
  (partidas guardadas, `localStorage`, la nube) entra como `unknown` y se valida antes de usarlo.
- Sin dependencias de producción. Agregar una solo si hace un trabajo importante y después de
  consultarlo.
- Los dibujos son de 12×12 en código (`src/data/shapes.ts`): mitad izquierda de 6 caracteres
  y la derecha en espejo. No usar imágenes externas.
- El juego tiene que funcionar con teclado, mouse y pantalla táctil, y verse bien en celular.

## Partidas guardadas

Los jugadores tienen partidas guardadas en su navegador. Un cambio en los datos que se guardan
(criaturas, equipo, combate) no puede romper una partida existente:

- Los campos nuevos necesitan un valor por defecto al leerlos, como hacen `LV()` y `movesOf()`.
- Si se renombra o elimina una criatura o movimiento, `validSave()` tiene que seguir
  rechazando lo inválido sin romper el juego.
- Sumar una prueba en `test/` con una partida del formato anterior.

## Contenido original

Es un juego inspirado en el género, con criaturas, nombres y dibujos propios. No usar nombres,
diseños, logos ni textos de Pokémon u otras franquicias.

## Comandos

```bash
pnpm install
pnpm dev       # desarrollo en http://localhost:5173
pnpm typecheck # revisa los tipos
pnpm test      # pruebas
pnpm build     # build en dist/
pnpm preview   # sirve el build
```
