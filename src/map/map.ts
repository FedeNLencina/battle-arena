/** Mapa del valle: dibujo, movimiento, encuentros y nueva partida. */
import { S, ui, $, game } from '../core/state.ts';
import { save } from '../core/save.ts';
import { LV, MAXLV, maxHp, makeMon, healTeam } from '../core/mon.ts';
import { SPECIES, ROSTER } from '../data/species.ts';
import { SHAPES, PERSON } from '../data/shapes.ts';
import { MAP, TILE, MW, MH, TRAINERS, START, WILD_RATE, isWalkable } from '../data/world.ts';
import { paint } from '../render/sprites.ts';
import { show } from '../ui/screens.ts';
import { startBattle } from '../battle/battle.ts';
import type { SpeciesId } from '../core/types.ts';

const DEFAULT_NOTE = 'Movete con las flechas o tocando el mapa. El pasto alto esconde criaturas salvajes y el campamento cura a tu equipo.';

function drawTile(g: CanvasRenderingContext2D, ch: string, x: number, y: number): void {
  const X = x * TILE;
  const Y = y * TILE;
  const n = (x * 7 + y * 13) % 5;
  const r = (c: string, a: number, b: number, w: number, h: number) => { g.fillStyle = c; g.fillRect(X + a, Y + b, w, h); };
  if (ch === '=') { r('#b98f5e', 0, 0, 16, 16); r('#a37a4c', 3 + n, 4, 2, 1); r('#a37a4c', 9 - n, 11, 2, 1); r('#d1ab7a', 12 - n, 7, 1, 1); return; }
  if (ch === 'w') { r('#2a6fa0', 0, 0, 16, 16); r('#45c4d6', 2 + n, 4, 4, 1); r('#45c4d6', 9 - n, 11, 4, 1); return; }
  r('#23514a', 0, 0, 16, 16); r('#2d6358', 2 + n, 3, 1, 2); r('#2d6358', 11 - n, 10, 1, 2);
  if (ch === 'g') {
    r('#1c4640', 0, 0, 16, 16);
    for (let i = 0; i < 4; i++) { const bx = 1 + i * 4; r('#5fa33a', bx, 6, 1, 9); r('#93d14f', bx + 1, 3, 1, 12); r('#5fa33a', bx + 2, 8, 1, 7); }
  }
  if (ch === 'T') { r('#4a2f24', 6, 10, 4, 6); r('#12302e', 1, 2, 14, 9); r('#12302e', 3, 0, 10, 12); r('#1f4f44', 3, 2, 8, 6); r('#2d6358', 4, 3, 3, 2); }
  if (ch === 'H') {
    for (let i = 0; i < 10; i++) { const w = 2 + i; r(i < 2 ? '#ff6b4a' : '#f3ead7', 8 - Math.ceil(w / 2), 3 + i, w, 1); }
    r('#0a0918', 7, 9, 2, 4); r('#0a0918', 1, 13, 14, 1); r('#ffd166', 8, 0, 1, 3); r('#ff6b4a', 9, 0, 3, 2);
  }
}

function drawMap(): void {
  const g = $<HTMLCanvasElement>('#mapCv').getContext('2d');
  if (!g) return;
  const gm = game();
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) drawTile(g, MAP[y][x], x, y);
  TRAINERS.forEach((t) => {
    g.globalAlpha = gm.beaten.includes(t.id) ? 0.45 : 1;
    paint(g, PERSON, t.pal, t.x * TILE + 2, t.y * TILE + 2);
    g.globalAlpha = 1;
  });
  // Te representa la primera criatura del equipo que siga en pie.
  const lead = gm.team.find((m) => m.hp > 0) || gm.team[0];
  const sp = SPECIES[lead.id];
  g.fillStyle = 'rgba(10,9,24,.45)';
  g.fillRect(gm.pos.x * TILE + 3, gm.pos.y * TILE + 13, 10, 2);
  paint(g, SHAPES[sp.shape], sp.pal, gm.pos.x * TILE + 2, gm.pos.y * TILE + 2);
}

export function refreshMap(): void {
  const gm = S.game;
  if (!gm) return;
  drawMap();
  $('#mapMsg').textContent = ui.mapNote || DEFAULT_NOTE;
  $('#mapInfo').textContent = 'Entrenadores ' + gm.beaten.length + '/' + TRAINERS.length + ' · Pociones × ' + gm.potions;
  $('#party').innerHTML = gm.team.map((m) => {
    const sp = SPECIES[m.id];
    const pct = (Math.max(0, m.hp) / maxHp(m)) * 100;
    const cls = pct > 50 ? '' : pct > 20 ? 'mid' : 'low';
    return '<div class="pm' + (m.hp <= 0 ? ' out' : '') + '"><b>' + sp.name + ' <span class="lv">Nv. ' + LV(m) + '</span></b>'
      + '<div class="hp"><i class="' + cls + '" style="width:' + pct + '%"></i></div>'
      + (m.hp <= 0 ? 'Debilitado' : m.hp + ' / ' + maxHp(m) + ' PS') + '</div>';
  }).join('');
}

export function newGame(ids: readonly SpeciesId[]): void {
  S.game = { team: ids.map((id) => makeMon(id)), potions: 2, pos: { ...START }, beaten: [] };
  S.battle = null;
  save();
  ui.mapNote = 'Llegaste al Valle del Ocaso. Vencé a los ' + TRAINERS.length + ' entrenadores para ganar.';
  show('map');
}

/** Da un paso. Chocar con un entrenador lo desafía; el pasto alto puede tener criaturas salvajes. */
export function walk(dx: number, dy: number): void {
  if (S.screen !== 'map' || !S.game) return;
  const gm = S.game;
  const nx = gm.pos.x + dx;
  const ny = gm.pos.y + dy;
  if (!isWalkable(nx, ny)) return;
  const ch = MAP[ny][nx];

  const t = TRAINERS.find((tr) => tr.x === nx && tr.y === ny);
  if (t) {
    if (gm.beaten.includes(t.id)) {
      ui.mapNote = t.name + ': Buen combate. Ya me ganaste.';
      refreshMap();
      return;
    }
    startBattle('trainer', t.name, t.team, t.id, t.lvl);
    return;
  }

  gm.pos = { x: nx, y: ny };
  ui.mapNote = '';
  if (ch === 'H') {
    healTeam(gm.team);
    ui.mapNote = 'Descansaron en el campamento. Todo el equipo recuperó su vida y sus PP.';
  }
  save();

  if (ch === 'g' && Math.random() < WILD_RATE) {
    // Los salvajes aparecen cerca del nivel promedio del equipo, uno arriba o abajo.
    const avg = Math.round(gm.team.reduce((a, m) => a + LV(m), 0) / gm.team.length);
    const lvl = Math.max(2, Math.min(MAXLV, avg + [-1, 0, 0, 1][Math.floor(Math.random() * 4)]));
    startBattle('wild', '', [ROSTER[Math.floor(Math.random() * ROSTER.length)]], null, lvl);
    return;
  }
  refreshMap();
}
