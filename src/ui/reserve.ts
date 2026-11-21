/** Pantalla de Reserva del campamento: mover criaturas entre el equipo y la Reserva. */
import { $, game } from '../core/state.ts';
import { save } from '../core/save.ts';
import { LV, maxHp, healTeam } from '../core/mon.ts';
import { MAX_TEAM, boxOf, moveToBox, moveToTeam, makeLead } from '../core/capture.ts';
import { SPECIES } from '../data/species.ts';
import { TYPE_NAME } from '../data/types.ts';
import { spriteCanvas } from '../render/sprites.ts';
import type { Mon } from '../core/types.ts';

type RowAction = { act: 'lead' | 'tobox' | 'toteam'; label: string; disabled: boolean };

function row(m: Mon, i: number, actions: readonly RowAction[]): HTMLElement {
  const sp = SPECIES[m.id];
  const el = document.createElement('div');
  el.className = 'rrow';
  el.appendChild(spriteCanvas(m.id));
  const info = document.createElement('div');
  info.innerHTML = '<b>' + sp.name + '</b> <span class="lv">Nv. ' + LV(m) + '</span><br>'
    + '<span class="meta"><span class="chip t-' + sp.type + '">' + TYPE_NAME[sp.type] + '</span> '
    + Math.max(0, m.hp) + ' / ' + maxHp(m) + ' PS</span>';
  el.appendChild(info);
  const acts = document.createElement('div');
  acts.className = 'racts';
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'opt mini';
    b.dataset.r = a.act;
    b.dataset.i = String(i);
    b.textContent = a.label;
    b.disabled = a.disabled;
    acts.appendChild(b);
  });
  el.appendChild(acts);
  return el;
}

export function refreshReserve(): void {
  const gm = game();
  const box = boxOf(gm);
  const full = gm.team.length >= MAX_TEAM;
  $('#rTeamTitle').textContent = 'Equipo (' + gm.team.length + ' de ' + MAX_TEAM + ')';
  $('#rBoxTitle').textContent = 'Reserva (' + box.length + ')';

  const teamEl = $('#rTeam');
  teamEl.replaceChildren(...gm.team.map((m, i) => row(m, i, [
    ...(i > 0 ? [{ act: 'lead' as const, label: 'Primero', disabled: false }] : []),
    { act: 'tobox', label: 'A la Reserva', disabled: gm.team.length <= 1 },
  ])));

  const boxEl = $('#rBox');
  if (!box.length) {
    const p = document.createElement('p');
    p.className = 'rempty';
    p.textContent = 'Todavía no hay criaturas en la Reserva. Cuando atrapes una con el equipo lleno, aparece acá.';
    boxEl.replaceChildren(p);
  } else {
    boxEl.replaceChildren(...box.map((m, i) => row(m, i, [
      { act: 'toteam', label: full ? 'Equipo lleno' : 'Al equipo', disabled: full },
    ])));
  }
}

/** Botones de la Reserva. Después de cada cambio guarda y deja el foco en el mismo lugar. */
export function onReserveClick(ev: MouseEvent): void {
  if (!(ev.target instanceof Element)) return;
  const btn = ev.target.closest<HTMLButtonElement>('button[data-r]');
  if (!btn || btn.disabled) return;
  const gm = game();
  const i = Number(btn.dataset.i);
  const all = [...document.querySelectorAll<HTMLElement>('#reserve .opt')];
  const at = all.indexOf(btn);

  let changed = false;
  if (btn.dataset.r === 'lead') changed = makeLead(gm, i);
  else if (btn.dataset.r === 'tobox') changed = moveToBox(gm, i);
  else if (btn.dataset.r === 'toteam') {
    changed = moveToTeam(gm, i);
    // Estás en el campamento: la que se suma al equipo llega descansada.
    if (changed) healTeam([gm.team[gm.team.length - 1]]);
  }
  if (!changed) return;
  save();
  refreshReserve();
  const now = [...document.querySelectorAll<HTMLElement>('#reserve .opt:not([disabled])')];
  const target = now[Math.min(at, now.length - 1)];
  if (target) target.focus();
}
