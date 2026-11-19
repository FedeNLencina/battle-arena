---
name: jugar
description: Levanta Arena de Batalla con Vite y lo juega en un Chrome headless (partida nueva, combate completo, partida guardada vieja, recarga en medio del combate y evolución), con capturas y errores de consola. Usar para el paso "jugar el cambio en un navegador" de CLAUDE.md o cuando pidan correr, probar o sacar capturas del juego.
---

# Jugar Arena de Batalla en el navegador

Prueba automática del recorrido principal. No reemplaza mirar las capturas: hay que abrirlas.

## 1. Levantar el juego

En segundo plano, desde la raíz del repo:

```bash
pnpm dev --port 5173 --strictPort
```

Esperar a que responda antes de seguir (no usar `sleep` fijo):

```bash
timeout 30 bash -c 'until curl -sf http://localhost:5173/ >/dev/null; do sleep 1; done'
```

## 2. Preparar Playwright (fuera del repo)

`playwright-core` **no** es dependencia del proyecto: se instala en una carpeta temporal
(el scratchpad de la sesión si hay uno) y maneja el Chrome o Edge que ya está instalado,
sin bajar navegadores.

```bash
PW="<scratchpad>/pw"            # carpeta temporal, fuera del repo
mkdir -p "$PW" && cd "$PW"
[ -d node_modules/playwright-core ] || { npm init -y >/dev/null && npm i playwright-core@1.56.1; }
cp "<repo>/.claude/skills/jugar/play.mjs" .
```

El script se copia a esa carpeta porque Node busca `playwright-core` al lado del script.

## 3. Jugar

```bash
node play.mjs "$PW/capturas"
```

Qué hace, en orden:

1. Pone velocidad rápida y sin animaciones (`arena-opts`) para que no tarde.
2. Partida nueva desde la interfaz: elige 3 criaturas, entra al mapa.
3. Camina en el pasto alto hasta un combate salvaje y lo juega hasta el final.
4. Carga una partida guardada con una criatura del **formato viejo** (sin nivel ni movimientos)
   y otra (Chispín) en el nivel 9 a un punto de subir.
5. Entra en otro combate, **recarga la página en medio** y lo retoma con "Continuar".
6. Termina el combate: Chispín tiene que subir al nivel 10 y evolucionar en Relampo.

Termina con código 0 si todo salió bien y 1 si hubo algún problema; los lista al final bajo
`--- resultado ---`, junto con los errores de consola. Variables opcionales: `GAME_URL` y
`CHROME_PATH` (si no encuentra el navegador solo).

## 4. Revisar

- Leer el resumen del script (`--- resultado ---` y `--- errores de consola ---`).
- **Abrir las capturas** de `capturas/` (1-titulo … 8-final) con Read y mirarlas: el script no
  detecta problemas visuales. La ventana es de 420×860, tamaño celular.
- Si el cambio toca algo que el recorrido no pasa (un entrenador, el campamento, la mochila,
  aprender un movimiento con los cuatro ocupados), copiar `play.mjs`, adaptarlo para ese camino
  y decirlo en el reporte. No hace falta guardar esa variante en el repo.

## 5. Frenar el servidor

Matar el proceso que escucha el puerto, no el wrapper de pnpm:

```powershell
$p = (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
if ($p) { Stop-Process -Id $p -Force -Confirm:$false }
```

En Linux o macOS: `lsof -ti:5173 -sTCP:LISTEN | xargs -r kill`.

## Qué no cubre

- Pantalla táctil (usa teclado y clics).
- Combates contra entrenadores y la pantalla de victoria final.
- El guardado en la cuenta de Claude (solo funciona dentro de Claude).
