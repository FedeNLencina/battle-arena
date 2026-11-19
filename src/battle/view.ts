/** Lo que se ve en el combate: tarjetas, sprites, menú de acciones y la caja de texto. */
import { S, ui, $, sleep, game, battle } from '../core/state.ts';
import { LV, maxHp, xpPct, nameOf, movesOf } from '../core/mon.ts';
import { SPECIES } from '../data/species.ts';
import { MOVES } from '../data/moves.ts';
import { TYPE_NAME } from '../data/types.ts';
import { capsulesOf, captureChance } from '../core/capture.ts';
import { drawSprite } from '../render/sprites.ts';
import type { MenuKind, Mon, Move, MoveType } from '../core/types.ts';

export const me = (): Mon => game().team[battle().pi];
export const foe = (): Mon => battle().foe[battle().fi];
export const foeLabel = () => 'El ' + nameOf(foe()) + (battle().kind === 'wild' ? ' salvaje' : ' rival');

const hpClass = (pct: number) => (pct > 50 ? '' : pct > 20 ? 'mid' : 'low');
const pips = (team: readonly Mon[]) => team.map((t) => (t.hp > 0 ? '●' : '○')).join('');
const chip = (type: MoveType) => '<span class="chip t-' + type + '">' + TYPE_NAME[type] + '</span>';

function cardHTML(m: Mon, team: readonly Mon[], isPlayer: boolean): string {
  const sp = SPECIES[m.id];
  const pct = (Math.max(0, m.hp) / maxHp(m)) * 100;
  return '<div class="row"><b>' + sp.name + ' <span class="lv">Nv. ' + LV(m) + '</span></b>' + chip(sp.type) + '</div>'
    + '<div class="hp" role="img" aria-label="Vida ' + Math.round(pct) + ' por ciento"><i class="' + hpClass(pct) + '" style="width:' + pct + '%"></i></div>'
    + '<div class="num"><span class="pips" aria-label="Equipo">' + pips(team) + '</span><span>' + (isPlayer ? Math.max(0, m.hp) + ' / ' + maxHp(m) + ' PS' : '') + '</span></div>'
    + (isPlayer ? '<div class="xp" role="img" aria-label="Experiencia"><i style="width:' + xpPct(m) + '%"></i></div>' : '');
}

/** Actualiza solo las barras si la criatura no cambió, así la vida baja con transición. */
function patchCard(el: HTMLElement, m: Mon, team: readonly Mon[], isPlayer: boolean): void {
  const pct = (Math.max(0, m.hp) / maxHp(m)) * 100;
  const bar = $('.hp i', el);
  bar.style.width = pct + '%';
  bar.className = hpClass(pct);
  $('.pips', el).textContent = pips(team);
  $('.lv', el).textContent = 'Nv. ' + LV(m);
  if (isPlayer) {
    $('.num span:last-child', el).textContent = Math.max(0, m.hp) + ' / ' + maxHp(m) + ' PS';
    $('.xp i', el).style.width = xpPct(m) + '%';
  }
}

export function renderBattle(): void {
  const b = S.battle;
  if (!b) return;
  const team = game().team;
  if (ui.shown.p !== me().id) {
    $('#pCard').innerHTML = cardHTML(me(), team, true);
    drawSprite($<HTMLCanvasElement>('#pSprite'), me().id);
    ui.shown.p = me().id;
  } else patchCard($('#pCard'), me(), team, true);
  if (ui.shown.f !== foe().id) {
    $('#fCard').innerHTML = cardHTML(foe(), b.foe, false);
    drawSprite($<HTMLCanvasElement>('#fSprite'), foe().id);
    ui.shown.f = foe().id;
  } else patchCard($('#fCard'), foe(), b.foe, false);
  $('#pSprite').classList.toggle('down', me().hp <= 0);
  $('#fSprite').classList.toggle('down', foe().hp <= 0);
}

const moveInfo = (mv: Move) => chip(mv.type) + ' ' + (mv.power ? 'Pot. ' + mv.power : mv.desc);
const back = (label: string, act = 'menu', v = 'actions') =>
  '<button class="opt back wide" data-act="' + act + '" data-v="' + v + '" data-back>' + label + '</button>';

/** Arma el menú de abajo. `busy` lo vacía mientras corre un texto o una animación. */
export function setMenu(kind: MenuKind): void {
  ui.menuKind = kind;
  ui.busy = kind === 'busy';
  const el = $('#menu');
  let h = '';

  if (kind === 'actions') {
    ui.forced = false;
    $('#msg').textContent = '¿Qué hará ' + nameOf(me()) + '?';
    h = '<button class="opt" data-act="menu" data-v="moves">Luchar</button>'
      + '<button class="opt" data-act="menu" data-v="team">Equipo</button>'
      + '<button class="opt" data-act="menu" data-v="bag">Mochila</button>'
      + '<button class="opt" data-act="run">Huir</button>';
  } else if (kind === 'moves') {
    $('#msg').textContent = 'Elegí un movimiento.';
    const m = me();
    if (m.pp.every((p) => p <= 0)) {
      h = '<button class="opt wide" data-act="move" data-v="-1">Forcejeo<small>Sin PP en los demás movimientos</small></button>';
    } else {
      movesOf(m).forEach((id, i) => {
        const mv = MOVES[id];
        h += '<button class="opt" data-act="move" data-v="' + i + '"' + (m.pp[i] <= 0 ? ' disabled' : '') + '>' + mv.name
          + '<small>' + moveInfo(mv) + ' · PP ' + m.pp[i] + '/' + mv.pp + '</small></button>';
      });
    }
    h += back('Volver');
  } else if (kind === 'team') {
    $('#msg').textContent = ui.forced ? '¿Quién sigue?' : '¿A quién querés enviar?';
    const { pi } = battle();
    game().team.forEach((m, i) => {
      const sp = SPECIES[m.id];
      const off = i === pi || m.hp <= 0;
      h += '<button class="opt wide" data-act="switch" data-v="' + i + '"' + (off ? ' disabled' : '') + '>' + sp.name
        + '<small>' + chip(sp.type) + ' Nv. ' + LV(m) + ' · ' + (m.hp <= 0 ? 'Debilitado' : m.hp + ' / ' + maxHp(m) + ' PS')
        + (i === pi && m.hp > 0 ? ' · en combate' : '') + '</small></button>';
    });
    if (!ui.forced) h += back('Volver');
  } else if (kind === 'learn' && ui.learnCtx) {
    const { m, mv } = ui.learnCtx;
    const nw = MOVES[mv];
    $('#msg').textContent = '¿Qué movimiento olvida ' + nameOf(m) + ' para aprender ' + nw.name + '?';
    movesOf(m).forEach((id, i) => {
      h += '<button class="opt" data-act="forget" data-v="' + i + '">Olvidar ' + MOVES[id].name + '<small>' + moveInfo(MOVES[id]) + '</small></button>';
    });
    h += '<button class="opt back wide" data-act="forget" data-v="-1" data-back>No aprender ' + nw.name
      + '<small>' + chip(nw.type) + ' ' + (nw.power ? 'Pot. ' + nw.power + ' · Prec. ' + nw.acc + '%' : nw.desc) + '</small></button>';
  } else if (kind === 'bag') {
    $('#msg').textContent = 'Mochila.';
    const full = me().hp >= maxHp(me());
    const gm = game();
    const { potions } = gm;
    const capsules = capsulesOf(gm);
    const wild = battle().kind === 'wild';
    const capsuleNote = !wild
      ? 'Solo sirve con criaturas salvajes'
      : capsules <= 0
        ? 'No te quedan Cápsulas'
        : 'Probabilidad de atrapar a ' + nameOf(foe()) + ': ' + Math.round(captureChance(foe(), gm.team) * 100) + '%';
    h = '<button class="opt wide" data-act="item"' + (potions <= 0 || full ? ' disabled' : '') + '>Poción × ' + potions
      + '<small>' + (full ? nameOf(me()) + ' ya tiene toda la vida' : 'Cura 30 PS a ' + nameOf(me())) + '</small></button>'
      + '<button class="opt wide" data-act="capsule"' + (!wild || capsules <= 0 ? ' disabled' : '') + '>Cápsula × ' + capsules
      + '<small>' + capsuleNote + '</small></button>'
      + back('Volver');
  }

  el.innerHTML = h;
  const first = el.querySelector<HTMLElement>('.opt:not([disabled])');
  if (first) first.focus();
}

/** Escribe un mensaje letra por letra. Un clic, Enter o Espacio lo adelanta. */
export async function say(text: string): Promise<void> {
  const el = $('#msg');
  el.textContent = '';
  ui.skip = false;
  const delay = [38, 20, 6][S.opts.speed];
  for (const ch of text) {
    el.textContent += ch;
    if (!ui.skip) await sleep(delay);
  }
  ui.skip = false;
  for (let t = 0; t < 750 && !ui.skip; t += 40) await sleep(40);
  ui.skip = false;
}

/** Aplica una animación CSS un rato, si las animaciones están activadas. */
export async function fx(el: Element, cls: string, ms: number): Promise<void> {
  if (!S.opts.anim) return;
  el.classList.add(cls);
  await sleep(ms);
  el.classList.remove(cls);
}
