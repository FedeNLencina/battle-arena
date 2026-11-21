# CLAUDE.md

Guía para trabajar en **Arena de Batalla**: un juego de combates por turnos en el navegador,
hecho con TypeScript y Vite, sin frameworks. El README explica las reglas del juego y la
estructura del código; esta guía explica cómo trabajar en él.

## Idioma

- Todo en español rioplatense (voseo): textos del juego, comentarios, README, mensajes de
  commit, títulos y descripciones de pull requests, y las respuestas al dueño del proyecto.
- Los nombres de variables y funciones siguen en inglés corto, como el código existente.

## Forma de trabajo

En el repo suben código dos personas: el dueño desde su editor y Claude. Para no pisarse:

1. Antes de empezar, traer lo último de `main` (`git pull`).
2. Cada pedido va en su propia rama desde `main`, con un nombre descriptivo en minúsculas y
   guiones, por ejemplo `capturar-criaturas` o `fix-texto-combate`. Nunca subir directo a `main`.
3. Antes de programar algo grande o ambiguo, proponer el enfoque en pocas líneas y esperar
   el visto bueno. Los cambios chicos y claros se hacen directamente.
4. Antes de subir:
   - `pnpm typecheck` tiene que pasar sin errores.
   - `pnpm test` tiene que pasar.
   - `pnpm build` tiene que compilar sin errores.
   - `pnpm e2e` tiene que pasar (ver "Pruebas").
   - Jugar el cambio en un navegador (con `pnpm dev` o `pnpm preview`) y recorrer el
     camino afectado, por ejemplo un combate completo si se tocó la batalla. La skill `jugar`
     (`.claude/skills/jugar/`) lo hace en un Chrome headless y deja capturas para revisar.
5. Al terminar, subir la rama y abrir un pull request contra `main` con un resumen de qué
   cambió para el jugador y cómo probarlo. Vercel arma un enlace de prueba por cada pull
   request. El dueño revisa y mezcla; Claude no mezcla a `main`.
6. Después de abrir el pull request, publicar esa versión en la página de Claude del juego,
   para que el dueño la pruebe al instante desde cualquier dispositivo (ver más abajo).
7. Si la rama queda en conflicto con `main`, traer `main` a la rama, resolver el conflicto y
   contar qué se resolvió y cómo.

Al reportar, decir qué se probó y qué no. Si algo solo se pudo validar a medias, aclararlo.

## Página de Claude

Además del enlace de Vercel, cada pull request se publica en la página de Claude del juego:
https://claude.ai/artifact/FRYPvsELimmZmgx2m2ZLWc (artefacto `74cd23c8-4b44-4c54-937c-90d3ef2070b1`).

1. `pnpm build:claude` arma el juego con rutas relativas en `dist-claude/`.
2. Publicar todos los archivos de `dist-claude/` en ese artefacto en modo `replace`, con
   `index.html` en la raíz y el resto con su misma ruta (`assets/…`, `favicon.svg`), y la
   rama como etiqueta de la versión. El artefacto ya declara `db` y `user`: así funciona el
   guardado en la cuenta de Claude; no cambiar esa declaración.
3. En el reporte, decir qué rama quedó publicada: la página muestra siempre la última que se
   publicó, aunque todavía no esté mezclada.

Esto solo se puede hacer desde una sesión de Claude con las herramientas de artefactos.
Trabajando desde el editor no hace falta.

## Pruebas

Hay dos tipos, y cada cambio suma las que correspondan:

- **Unitarias** (`test/`, `node:test`): para las reglas de `src/core/` (daño, niveles,
  validación de partidas…). Son rápidas y cubren casos borde. Toda regla nueva lleva la suya.
- **De punta a punta** (`e2e/`, Playwright): juegan el juego en un navegador, en tamaño
  celular y escritorio. Toda función que el jugador toca lleva al menos un recorrido.

Cómo están armadas las de Playwright (`e2e/helpers.ts`):

- El azar del juego se fija con una semilla: el mismo recorrido da siempre el mismo resultado.
  No hay reintentos, así que una prueba que falla de a ratos es un problema a resolver, no a
  ignorar. Antes de subir pruebas nuevas, correr `pnpm e2e` al menos dos veces.
- Para llegar rápido a un escenario se carga una partida preparada con `continueSave()`,
  armando las criaturas con `mon()` (que usa las reglas del juego), en vez de jugar desde cero.
- `playBattle()` juega un combate hasta el final y devuelve todos los mensajes;
  `advance()` adelanta los textos; `saved()` lee la partida guardada ya validada.
- Para forzar un resultado puntual del azar (que la Cápsula atrape, que algo caiga) se usa
  `fixRandom()` justo antes de la acción.
- Una prueba falla si la página tira cualquier error de consola.
- Las fuentes de Google se reemplazan por una hoja vacía: no dependen de internet.

`pnpm e2e` baja solo el Chromium de Playwright la primera vez (`scripts/ensure-browser.ts`);
después solo revisa que esté. Con `CHROME_PATH` se usa un Chrome ya instalado y no baja nada.

GitHub Actions corre las pruebas en cada push y pull request, y si fallan guarda el reporte y
las capturas. Vercel no publica en producción hasta que pasan los jobs `test-and-build` y `e2e`
(Deployment Checks de Vercel), y los reconoce por su nombre: no renombrar esos jobs sin avisarle
al dueño, que tiene que actualizar la configuración en Vercel.

Hay un hook de Git (`.githooks/pre-push`) que corre `pnpm typecheck` y `pnpm test` antes de
cada push y lo frena si algo falla. Se activa solo con `pnpm install`.

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
pnpm test      # pruebas unitarias
pnpm e2e       # pruebas de Playwright (celular y escritorio)
pnpm e2e:ui    # las mismas, en la interfaz de Playwright para verlas paso a paso
pnpm build     # build en dist/
pnpm preview   # sirve el build
```
