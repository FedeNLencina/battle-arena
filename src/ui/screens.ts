/** Pantallas fuera del combate: título, opciones y armado del equipo. */
import { S, ui, $ } from '../core/state.ts';
import { currentSave, validSave } from '../core/save.ts';
import { SPECIES, ROSTER, PARADE, EVO_LV } from '../data/species.ts';
import { STRONG, TYPES, TYPE_NAME } from '../data/types.ts';
import { TRAINERS } from '../data/world.ts';
import { spriteCanvas } from '../render/sprites.ts';
import { refreshMap } from '../map/map.ts';
import { refreshReserve } from './reserve.ts';
import type { ScreenName } from '../core/types.ts';

export function show(name: ScreenName): void {
  S.screen = name;
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('on', el.id === name));
  if (name === 'title') refreshTitle();
  if (name === 'options') refreshOpts();
  if (name === 'reserve') refreshReserve();
  if (name === 'map') {
    refreshMap();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return;
  }
  const first = document.querySelector<HTMLElement>('#' + name + ' .opt:not([disabled])');
  if (first) first.focus();
}

export function refreshTitle(): void {
  const sv = currentSave();
  const ok = validSave(sv);
  $<HTMLButtonElement>('#btnCont').disabled = !ok;
  $('#contInfo').textContent = ok
    ? 'Valle del Ocaso · ' + sv.game.beaten.length + ' de ' + TRAINERS.length + ' entrenadores vencidos' + (sv.battle ? ' · en combate' : '')
    : 'No hay partida guardada';
}

export function refreshOpts(): void {
  $('#valSpeed').textContent = ['Lenta', 'Normal', 'Rápida'][S.opts.speed];
  $('#valAnim').textContent = S.opts.anim ? 'Sí' : 'No';
  document.body.classList.toggle('no-anim', !S.opts.anim);
}

/** Arma lo que no cambia: el desfile del título, la tabla de tipos y las tarjetas para elegir. */
export function buildStatic(): void {
  PARADE.forEach((id) => $('#parade').appendChild(spriteCanvas(id)));
  $('#chart').innerHTML = TYPES
    .map((t) => '<li><span class="chip t-' + t + '">' + TYPE_NAME[t] + '</span> vence a ' + STRONG[t].map((x) => TYPE_NAME[x]).join(' y ') + '</li>')
    .join('');

  const bar = (label: string, v: number, max: number) =>
    '<div><span>' + label + '</span><i style="width:' + Math.round((v / max) * 100) + '%"></i></div>';
  ROSTER.forEach((id) => {
    const sp = SPECIES[id];
    const b = document.createElement('button');
    b.className = 'opt pick';
    b.dataset.id = id;
    b.setAttribute('aria-pressed', 'false');
    const ord = document.createElement('span');
    ord.className = 'ord';
    b.appendChild(ord);
    b.appendChild(spriteCanvas(id));
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = '<b>' + sp.name + '</b><br><span class="chip t-' + sp.type + '">' + TYPE_NAME[sp.type] + '</span>'
      + '<small style="display:block;margin-top:4px">Evoluciona en el Nv. ' + EVO_LV + '</small>'
      + '<div class="stats" style="margin-top:8px">' + bar('Vida', sp.hp, 78) + bar('Atq', sp.atk, 15) + bar('Def', sp.def, 14) + bar('Vel', sp.spd, 14) + '</div>';
    b.appendChild(info);
    b.onclick = () => {
      const i = ui.picked.indexOf(id);
      if (i >= 0) ui.picked.splice(i, 1);
      else if (ui.picked.length < 3) ui.picked.push(id);
      refreshPicks();
    };
    $('#picks').appendChild(b);
  });
  refreshPicks();
}

export function refreshPicks(): void {
  document.querySelectorAll<HTMLElement>('#picks .pick').forEach((b) => {
    const i = ui.picked.indexOf(b.dataset.id ?? '');
    b.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false');
    $('.ord', b).textContent = i >= 0 ? String(i + 1) : '';
  });
  $<HTMLButtonElement>('#btnStart').disabled = ui.picked.length !== 3;
  $('#startInfo').textContent = ui.picked.length === 3
    ? ui.picked.map((id) => SPECIES[id].name).join(', ')
    : 'Elegiste ' + ui.picked.length + ' de 3';
}

export function showEnd(title: string, text: string): void {
  $('#endTitle').textContent = title;
  $('#endText').textContent = text;
  show('end');
}
