/** Lógica del combate: turnos, ataques, experiencia, evolución y fin del combate. */
import { S, ui, $, sleep, game, battle } from '../core/state.ts';
import { save, clearSave, flushCloud } from '../core/save.ts';
import {
  LV, maxHp, stat, nameOf, movesOf, makeMon, formAt, healTeam,
  rollAttack, xpReward, gainXp, levelUpOnce, evolveIfReady, movesToLearn,
} from '../core/mon.ts';
import { SPECIES } from '../data/species.ts';
import { MOVES } from '../data/moves.ts';
import { effectiveness } from '../data/types.ts';
import { TRAINERS, CAMP } from '../data/world.ts';
import { show, showEnd } from '../ui/screens.ts';
import { me, foe, foeLabel, renderBattle, setMenu, say, fx } from './view.ts';
import type { Action, Battle, Mon, MoveId, SpeciesId } from '../core/types.ts';

export function startBattle(
  kind: Battle['kind'], name: string, foeIds: readonly SpeciesId[], trainerId: string | null, lvl = 5,
): void {
  const pi = Math.max(0, game().team.findIndex((m) => m.hp > 0));
  S.battle = {
    kind, name, trainerId: trainerId || null,
    foe: foeIds.map((id) => makeMon(formAt(id, lvl), lvl)),
    fi: 0, pi, turn: 1,
  };
  enterBattle(true);
}

export async function enterBattle(intro: boolean): Promise<void> {
  ui.shown = { p: null, f: null };
  show('battle');
  renderBattle();
  setMenu('busy');
  if (intro) {
    await say(battle().kind === 'wild'
      ? '¡Un ' + nameOf(foe()) + ' salvaje de nivel ' + LV(foe()) + ' apareció!'
      : '¡' + battle().name + ' te desafía y envía a ' + nameOf(foe()) + '!');
    await say('¡Adelante, ' + nameOf(me()) + '!');
  }
  save();
  if (me().hp <= 0) { ui.forced = true; setMenu('team'); } else setMenu('actions');
}

function leaveBattle(note: string): void {
  game().team.forEach((m) => { m.atkS = 0; m.defS = 0; });
  S.battle = null;
  ui.busy = false;
  ui.mapNote = note;
  save();
  show('map');
}

/** El rival elige con pesos: prefiere ataques eficaces y se cura cuando le queda poca vida. */
function pickFoeMove(): number {
  const f = foe();
  const opts: [number, number][] = [];
  movesOf(f).forEach((id, i) => {
    if (f.pp[i] <= 0) return;
    const mv = MOVES[id];
    let w: number;
    if (mv.power) w = 2 * effectiveness(mv.type, SPECIES[me().id].type) + mv.power / 60;
    else if (mv.effect === 'heal') w = f.hp < maxHp(f) * 0.45 ? 5 : 0.2;
    else w = (mv.effect === 'atk' ? f.atkS : f.defS) < 2 ? 1 : 0.1;
    opts.push([i, w]);
  });
  if (!opts.length) return -1;
  let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
  for (const [i, w] of opts) { r -= w; if (r <= 0) return i; }
  return opts[0][0];
}

async function attack(side: 'me' | 'foe', idx: number): Promise<void> {
  const user = side === 'me' ? me() : foe();
  const target = side === 'me' ? foe() : me();
  const uEl = side === 'me' ? $('#pSprite') : $('#fSprite');
  const tEl = side === 'me' ? $('#fSprite') : $('#pSprite');
  const mv = idx < 0 ? MOVES.forcejeo : MOVES[movesOf(user)[idx]];
  if (idx >= 0) user.pp[idx]--;

  await say((side === 'me' ? nameOf(user) : foeLabel()) + ' usó ' + mv.name + '.');

  if (!mv.power) {
    if (Math.random() * 100 >= mv.acc) { await say('¡Pero falló!'); return; }
    if (mv.effect === 'heal') {
      const max = maxHp(user);
      const gain = Math.min(max - user.hp, Math.round(max * 0.35));
      user.hp += gain;
      renderBattle();
      await say(gain > 0 ? nameOf(user) + ' recuperó ' + gain + ' PS.' : 'No tuvo efecto: ya tiene toda la vida.');
      return;
    }
    const k = mv.effect === 'atk' ? 'atkS' : 'defS';
    if (user[k] >= 3) { await say('No puede subir más.'); return; }
    user[k]++;
    await say((mv.effect === 'atk' ? 'El ataque' : 'La defensa') + ' de ' + nameOf(user) + ' subió.');
    return;
  }

  const res = rollAttack(user, target, mv);
  if (!res.hit) { await say('¡Pero falló!'); return; }
  fx(uEl, 'lunge', 350);
  await sleep(S.opts.anim ? 180 : 0);
  target.hp = Math.max(0, target.hp - res.dmg);
  renderBattle();
  await fx(tEl, 'hit', 800);
  if (res.crit) await say('¡Golpe crítico!');
  if (res.e > 1) await say('¡Es muy eficaz!');
  if (res.e < 1) await say('No es muy eficaz…');
}

/** Un turno completo. `action` es { kind: 'move'|'run'|'switch'|'item', i? }. */
export async function turn(action: Action): Promise<void> {
  setMenu('busy');
  const fm = pickFoeMove();
  if (action.kind === 'run') {
    if (Math.random() < 0.75) {
      await say('Escapaste del combate.');
      leaveBattle('Te alejaste del ' + nameOf(foe()) + ' salvaje.');
      return;
    }
    await say('¡No pudiste escapar!');
    await attack('foe', fm);
  } else if (action.kind === 'switch') {
    await doSwitch(action.i);
    await attack('foe', fm);
  } else if (action.kind === 'item') {
    const gain = Math.min(30, maxHp(me()) - me().hp);
    game().potions--;
    me().hp += gain;
    renderBattle();
    await say('Usaste una Poción. ' + nameOf(me()) + ' recuperó ' + gain + ' PS.');
    await attack('foe', fm);
  } else {
    // Ataca primero la más rápida; si empatan, la tuya.
    if (stat(me(), 'spd') >= stat(foe(), 'spd')) {
      await attack('me', action.i);
      if (foe().hp > 0) await attack('foe', fm);
    } else {
      await attack('foe', fm);
      if (me().hp > 0) await attack('me', action.i);
    }
  }
  await afterTurn();
}

export async function doSwitch(i: number): Promise<void> {
  const out = me();
  if (out.hp > 0) await say('¡Volvé, ' + nameOf(out) + '!');
  out.atkS = 0;
  out.defS = 0;
  battle().pi = i;
  renderBattle();
  await say('¡Adelante, ' + nameOf(me()) + '!');
}

/** Después de subir un nivel: evoluciona si corresponde y aprende los movimientos de ese nivel. */
async function afterLevel(m: Mon, active: boolean): Promise<void> {
  const from = nameOf(m);
  const evo = SPECIES[m.id].evo;
  if (evo && LV(m) >= evo.lvl) {
    await say('¿Eh? ¡' + from + ' está evolucionando!');
    if (active) await fx($('#pSprite'), 'hit', 800);
    evolveIfReady(m);
    renderBattle();
    await say('¡' + from + ' evolucionó en ' + nameOf(m) + '!');
  }
  for (const mv of movesToLearn(m, LV(m))) await learnMove(m, mv);
}

async function learnMove(m: Mon, mv: MoveId): Promise<void> {
  const ms = movesOf(m);
  const nw = MOVES[mv];
  if (ms.length < 4) {
    ms.push(mv);
    m.pp.push(nw.pp);
    await say('¡' + nameOf(m) + ' aprendió ' + nw.name + '!');
    return;
  }
  await say(nameOf(m) + ' quiere aprender ' + nw.name + ', pero ya sabe cuatro movimientos.');
  const i = await new Promise<number>((resolve) => {
    ui.learnResolve = resolve;
    ui.learnCtx = { m, mv };
    setMenu('learn');
  });
  if (i < 0) { await say(nameOf(m) + ' no aprendió ' + nw.name + '.'); return; }
  const old = MOVES[ms[i]].name;
  ms[i] = mv;
  m.pp[i] = nw.pp;
  await say(nameOf(m) + ' olvidó ' + old + ' y aprendió ' + nw.name + '.');
}

/** La criatura en combate gana toda la experiencia; las demás que sigan en pie, la mitad. */
async function grantXp(): Promise<void> {
  const b = battle();
  const team = game().team;
  const base = xpReward(foe(), b.kind === 'trainer');
  const half = Math.round(base / 2);
  const order = team.map((_, i) => i).sort((x, y) => Number(y === b.pi) - Number(x === b.pi));
  let told = false;
  for (const i of order) {
    const m = team[i];
    if (m.hp <= 0) continue;
    const active = i === b.pi;
    if (!gainXp(m, active ? base : half)) continue;
    if (active) { renderBattle(); await say(nameOf(m) + ' ganó ' + base + ' puntos de experiencia.'); }
    else if (!told) { told = true; await say('El resto del equipo ganó ' + half + '.'); }
    while (levelUpOnce(m)) {
      renderBattle();
      await say('¡' + nameOf(m) + ' subió al nivel ' + m.lvl + '!');
      await afterLevel(m, active);
    }
  }
  renderBattle();
}

async function afterTurn(): Promise<void> {
  const b = battle();
  if (foe().hp <= 0) {
    await say(foeLabel() + ' se debilitó.');
    await grantXp();
    const next = b.foe.findIndex((m) => m.hp > 0);
    if (next < 0) { finish(true); return; }
    b.fi = next;
    renderBattle();
    await say(b.name + ' envía a ' + nameOf(foe()) + '.');
  }
  if (me().hp <= 0) {
    await say(nameOf(me()) + ' se debilitó.');
    if (!game().team.some((m) => m.hp > 0)) { finish(false); return; }
    ui.forced = true;
    save();
    setMenu('team');
    return;
  }
  b.turn++;
  save();
  setMenu('actions');
}

function finish(won: boolean): void {
  const b = battle();
  const gm = game();
  if (!won) {
    healTeam(gm.team);
    gm.pos = { ...CAMP };
    leaveBattle('Tu equipo se debilitó. Volviste al campamento y todos descansaron.');
    return;
  }
  if (b.kind === 'wild') {
    const drop = Math.random() < 0.3;
    if (drop) gm.potions++;
    leaveBattle('Venciste al ' + nameOf(foe()) + ' salvaje.' + (drop ? ' Dejó caer una Poción.' : ''));
    return;
  }
  if (b.trainerId) gm.beaten.push(b.trainerId);
  gm.potions++;
  if (gm.beaten.length >= TRAINERS.length) {
    S.battle = null;
    S.game = null;
    clearSave();
    flushCloud();
    ui.busy = false;
    showEnd('¡Victoria!', 'Venciste a los ' + TRAINERS.length + ' entrenadores del Valle del Ocaso.');
    return;
  }
  leaveBattle('Venciste a ' + b.name + ' y te dio una Poción. Te quedan ' + (TRAINERS.length - gm.beaten.length) + ' entrenadores.');
}
