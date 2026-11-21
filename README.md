# Arena de Batalla

Juego de combates por turnos en el navegador. Armás un equipo de tres criaturas, explorás el
Valle del Ocaso, peleás con criaturas salvajes en el pasto alto y vencés a los tres entrenadores
del valle. Las criaturas suben de nivel, aprenden movimientos nuevos y evolucionan.

Hecho con JavaScript y Vite, sin frameworks ni dependencias en producción. Los dibujos se
generan en código (pixel art de 12×12 en `<canvas>`), así que no hay imágenes que cargar.

## Cómo jugar

- **Menú principal:** Nueva partida, Continuar y Opciones (velocidad del texto y animaciones).
- **Armar equipo:** elegís 3 de las 12 criaturas. La primera que marcás sale a pelear primero.
- **Mapa:** flechas o WASD, tocando el mapa o con la cruceta. Chocás con un entrenador para
  desafiarlo. El pasto alto tiene criaturas salvajes y la carpa del campamento cura al equipo.
  Parado en el campamento, el botón Reserva (o la tecla R) te deja ordenar el equipo.
- **Combate:** Luchar, Equipo, Mochila (Pociones y Cápsulas) y Huir (no se puede huir de un
  entrenador).
- **Teclado en menús:** flechas para moverte, Enter para elegir, Esc para volver. Enter o un clic
  en la caja de texto adelantan los mensajes.

### Reglas

| | |
|---|---|
| Tipos | Fuego, Agua, Planta, Rayo, Roca y Hielo. Cada uno vence a dos y esos dos lo resisten (×2 / ×0,5). |
| Niveles | Cada nivel suma un 7% a vida, ataque, defensa y velocidad. Máximo: nivel 30. |
| Experiencia | La criatura que vence gana toda; las demás que sigan en pie, la mitad. Los entrenadores dan un 50% más. |
| Movimientos | Nivel 7: su ataque fuerte. Nivel 12: el más potente de su tipo. Nivel 15: uno de otro tipo. Con cuatro movimientos, elegís cuál olvidar. |
| Evolución | Todas evolucionan en el nivel 10, con un 30% más de estadísticas base. |
| Captura | Con una Cápsula atrapás criaturas salvajes (no las de los entrenadores). Con la vida llena la chance es del 25% y sube hasta el 85% cuanto menos vida le queda; baja si tiene más nivel que tu equipo. La Mochila muestra la probabilidad antes de tirar. Si falla, el salvaje ataca. |
| Cápsulas | Arrancás con 5. Cada entrenador vencido da 3 y los salvajes a veces dejan caer una. |
| Equipo y Reserva | El equipo lleva hasta 6 criaturas; las atrapadas con el equipo lleno van a la Reserva. En el campamento las movés entre equipo y Reserva y elegís quién sale primero. |
| Derrota | Si todo el equipo se debilita, volvés al campamento curado y sin perder progreso. |

## Desarrollo

Está escrito en TypeScript. Requiere Node.js 22.18 o superior, que corre las pruebas en
`.ts` directamente; Vite se encarga del juego, así que no hay un paso de compilación aparte.

```bash
pnpm install
pnpm dev       # servidor de desarrollo en http://localhost:5173
pnpm typecheck # revisa los tipos (tsc, sin generar archivos)
pnpm test      # pruebas de las reglas (node:test)
pnpm e2e       # pruebas de Playwright: juegan el juego en celular y escritorio
pnpm build     # build de producción en dist/
pnpm preview   # sirve dist/ para probar el build
```

Antes de correr `pnpm e2e` por primera vez: `pnpm exec playwright install chromium`.
`pnpm install` además activa un hook que revisa tipos y pruebas antes de cada push.

### Estructura

```
index.html            Marcado de todas las pantallas
src/
  main.ts             Arranque
  input.ts            Teclado, mouse y toques
  styles.css          Estilos
  data/               Datos del juego, sin lógica de pantalla
    types.ts          Tipos de criatura y tabla de efectividad
    moves.ts          Movimientos
    species.ts        Criaturas, evoluciones y qué aprende cada una
    shapes.ts         Dibujos de 12×12
    world.ts          Mapa, entrenadores y casillas especiales
  core/
    types.ts          Tipos de TypeScript compartidos (Mon, Species, Move, partida…)
    state.ts          Estado de la partida y de la interfaz
    mon.ts            Reglas: niveles, experiencia, daño, evolución (sin DOM, con pruebas)
    capture.ts        Reglas de captura, Cápsulas y Reserva (sin DOM, con pruebas)
    save.ts           Guardado de la partida
  render/sprites.ts   Dibuja criaturas y personajes en canvas
  ui/screens.ts       Título, opciones, armado del equipo y pantalla final
  ui/reserve.ts       Pantalla de Reserva del campamento
  map/map.ts          Mapa: dibujo, movimiento y encuentros
  battle/
    view.ts           Tarjetas, menú de acciones y caja de texto del combate
    battle.ts         Turnos, ataques, experiencia y fin del combate
test/rules.test.ts    Pruebas de las reglas y de los datos
test/capture.test.ts  Pruebas de la captura y la Reserva
e2e/                  Pruebas de Playwright: menú, mapa, combate, progreso, captura y partidas guardadas
  helpers.ts          Azar fijo, partidas preparadas y ayudantes para jugar combates
playwright.config.ts  Configuración de Playwright
.githooks/pre-push    Revisa tipos y pruebas antes de cada push
```

Para sumar contenido:

- **Una criatura nueva:** agregala en `src/data/species.ts` (y a `ROSTER` si se puede elegir),
  con su evolución en `EVOS`. Si usa una forma nueva, dibujala en `src/data/shapes.ts`.
- **Un movimiento nuevo:** en `src/data/moves.ts`, y sumalo al aprendizaje en `species.ts`.
- **Cambios en el mapa o entrenadores:** en `src/data/world.ts`. Las pruebas verifican que todos
  los entrenadores se puedan alcanzar desde el inicio.

## Guardado

La partida se guarda sola en el navegador (`localStorage`) en cada paso y cada turno, así que
cada jugador tiene su propio progreso en cada dispositivo.

`src/core/save.ts` además sabe guardar en la cuenta de Claude cuando el juego corre como
artefacto dentro de Claude. Fuera de Claude esa parte no se activa y no afecta nada. Para que
las partidas sigan al jugador entre dispositivos en el sitio publicado haría falta un backend
propio (por ejemplo Supabase o Firebase).

## Publicar en Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new) e importá este repositorio.
2. Vercel detecta Vite solo: comando de build `pnpm build`, carpeta de salida `dist`.
3. Deploy. Cada push a `main` publica una versión nueva y cada pull request tiene su propio
   enlace de prueba.

El plan gratuito (Hobby) es para uso personal y no comercial.
