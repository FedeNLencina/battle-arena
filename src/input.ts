/** Conecta botones, teclado y toques con el juego. */
import { S, ui, $ } from './core/state.ts';
import { save, flushCloud, currentSave, validSave, saveOpts } from './core/save.ts';
import { MW, MH } from './data/world.ts';
import { show, refreshOpts } from './ui/screens.ts';
import { newGame, walk } from './map/map.ts';
import { enterBattle, turn, doSwitch } from './battle/battle.ts';
import { setMenu, say } from './battle/view.ts';
import type { MenuKind } from './core/types.ts';

const DIRS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};

async function onMenuClick(ev: MouseEvent): Promise<void> {
  if (!(ev.target instanceof Element)) return;
  const btn = ev.target.closest('button');
  if (!btn || btn.disabled || ui.busy) return;
  const act = btn.dataset.act;
  const v = btn.dataset.v ?? '';

  if (act === 'forget') {
    const resolve = ui.learnResolve;
    ui.learnResolve = null;
    setMenu('busy');
    if (resolve) resolve(+v);
  } else if (act === 'menu') {
    // Los valores de `data-v` los arma setMenu, así que siempre son menús válidos.
    setMenu(v as MenuKind);
  } else if (act === 'move') {
    turn({ kind: 'move', i: +v });
  } else if (act === 'run') {
    if (S.battle?.kind === 'trainer') {
      setMenu('busy');
      await say('No podés huir de un combate contra un entrenador.');
      setMenu('actions');
    } else turn({ kind: 'run' });
  } else if (act === 'item') {
    turn({ kind: 'item' });
  } else if (act === 'switch') {
    if (ui.forced) {
      // Cambio obligado tras un debilitamiento: no gasta turno.
      setMenu('busy');
      await doSwitch(+v);
      save();
      setMenu('actions');
    } else turn({ kind: 'switch', i: +v });
  }
}

function onMapClick(ev: MouseEvent): void {
  if (!S.game || !(ev.currentTarget instanceof HTMLElement)) return;
  const rc = ev.currentTarget.getBoundingClientRect();
  const dx = Math.floor(((ev.clientX - rc.left) / rc.width) * MW) - S.game.pos.x;
  const dy = Math.floor(((ev.clientY - rc.top) / rc.height) * MH) - S.game.pos.y;
  if (!dx && !dy) return;
  if (Math.abs(dx) >= Math.abs(dy)) walk(Math.sign(dx), 0);
  else walk(0, Math.sign(dy));
}

function onKey(ev: KeyboardEvent): void {
  if (ui.busy) {
    if (ev.key === 'Enter' || ev.key === ' ') { ui.skip = true; ev.preventDefault(); }
    return;
  }
  if (S.screen === 'map') {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    const dir = DIRS[k];
    if (dir) { walk(...dir); ev.preventDefault(); }
    else if (ev.key === 'Escape') $('#mapMenu').click();
    return;
  }
  const scope = S.screen === 'battle' ? $('#menu') : $('#' + S.screen);
  if (ev.key === 'Escape' || ev.key === 'Backspace') {
    const back = scope.querySelector<HTMLElement>('[data-back]');
    if (back) { back.click(); ev.preventDefault(); }
    return;
  }
  // Flechas para moverse entre opciones; en el menú de acciones de 2×2, arriba/abajo saltan de fila.
  const steps: Record<string, number> = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
  if (!(ev.key in steps)) return;
  const list = [...scope.querySelectorAll<HTMLElement>('.opt:not([disabled])')];
  if (!list.length) return;
  let step = steps[ev.key];
  const grid = S.screen === 'battle' && ui.menuKind === 'actions'
    && getComputedStyle($('#menu')).gridTemplateColumns.split(' ').length > 1;
  if (grid && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) step *= 2;
  let i = list.findIndex((el) => el === document.activeElement);
  i = i < 0 ? 0 : i + step;
  if (i < 0 || i >= list.length) i = (i + list.length) % list.length;
  list[i].focus();
  ev.preventDefault();
}

export function wireInput(): void {
  $('#menu').addEventListener('click', onMenuClick);
  $('#msg').addEventListener('click', () => { if (ui.busy) ui.skip = true; });

  $('#btnNew').onclick = () => show('choose');
  $('#btnStart').onclick = () => { if (ui.picked.length === 3) newGame(ui.picked.slice()); };
  $('#btnCont').onclick = () => {
    const sv = currentSave();
    if (!validSave(sv)) return;
    S.game = sv.game;
    S.battle = sv.battle || null;
    if (S.battle) enterBattle(false);
    else { ui.mapNote = ''; show('map'); }
  };
  $('#btnOpts').onclick = () => show('options');
  $('#optSpeed').onclick = () => { S.opts.speed = (S.opts.speed + 1) % 3; saveOpts(); refreshOpts(); };
  $('#optAnim').onclick = () => { S.opts.anim = !S.opts.anim; saveOpts(); refreshOpts(); };
  $('#optBack').onclick = () => show('title');
  $('#chooseBack').onclick = () => show('title');
  $('#endMenu').onclick = () => show('title');
  $('#endAgain').onclick = () => show('choose');

  $('#mapMenu').onclick = () => { save(); flushCloud(); show('title'); };
  $('#mapCv').addEventListener('click', onMapClick);
  document.querySelectorAll<HTMLButtonElement>('.dpad button').forEach((b) => {
    const [dx, dy] = (b.dataset.d ?? '').split(',').map(Number);
    b.onclick = () => walk(dx, dy);
  });

  document.addEventListener('keydown', onKey);
}
