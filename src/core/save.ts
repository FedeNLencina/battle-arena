/**
 * Guardado de la partida.
 * Siempre se guarda en el navegador (localStorage). Si el juego corre dentro de Claude
 * como artefacto, además se guarda en la cuenta del jugador para seguirlo entre dispositivos;
 * fuera de Claude esa parte simplemente no se activa.
 */
import { S, $, sleep } from './state.ts';
import { SPECIES } from '../data/species.ts';
import { refreshTitle } from '../ui/screens.ts';
import type { Mon, Opts, SaveData } from './types.ts';

/** Lo que ofrece Claude cuando el juego corre como artefacto. */
type CloudDoc = {
  get(): Promise<{ exists: boolean; data(): unknown }>;
  set(value: unknown): Promise<void>;
};
type ClaudeRuntime = {
  use(name: 'db'): Promise<{ doc(path: string): CloudDoc } | null>;
  use(name: 'user'): Promise<{ id(): Promise<string | null> } | null>;
};
declare global {
  interface Window { claude?: ClaudeRuntime }
}

const SAVE_KEY = 'arena-save';
const OPTS_KEY = 'arena-opts';

/** Lo leído del almacenamiento es `unknown`: puede venir de una versión vieja o estar roto. */
export const store = {
  get(k: string): unknown { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isMonList = (v: unknown): v is Mon[] =>
  Array.isArray(v) && v.every((m) => isObj(m) && typeof m.id === 'string' && !!SPECIES[m.id]);
const savedAt = (v: unknown) => (isObj(v) && typeof v.at === 'number' ? v.at : 0);

export function loadOpts(): Opts | null {
  const o = store.get(OPTS_KEY);
  return isObj(o) && typeof o.speed === 'number' ? { speed: o.speed, anim: !!o.anim } : null;
}
export const saveOpts = () => store.set(OPTS_KEY, S.opts);

/** Revisa que una partida guardada tenga todo lo necesario y solo criaturas que existen. */
export function validSave(sv: unknown): sv is SaveData {
  if (!isObj(sv) || !isObj(sv.game)) return false;
  const g = sv.game;
  if (!isMonList(g.team) || !g.team.length || !g.pos || !Array.isArray(g.beaten)) return false;
  const b = sv.battle;
  if (!b) return true;
  return isObj(b) && isMonList(b.foe)
    && typeof b.fi === 'number' && !!b.foe[b.fi]
    && typeof b.pi === 'number' && !!g.team[b.pi];
}

export const currentSave = (): unknown => (S.game ? { game: S.game, battle: S.battle } : store.get(SAVE_KEY));

export function save(): void {
  if (!S.game) return;
  const sv = { game: S.game, battle: S.battle, at: Date.now() };
  store.set(SAVE_KEY, sv);
  pushCloud(sv);
}

export function clearSave(): void {
  store.del(SAVE_KEY);
  pushCloud({ game: null, battle: null, at: Date.now() });
}

/* ---------- Guardado en la cuenta de Claude (solo dentro de Claude) ---------- */

let cloudDoc: CloudDoc | null = null;
let cloudPending: unknown = null;
let cloudWriting = false;
let cloudTimer: ReturnType<typeof setTimeout> | undefined;

function setWhere(inCloud: boolean) {
  $('#saveWhere').textContent = inCloud
    ? 'La partida se guarda en tu cuenta de Claude y te sigue entre dispositivos.'
    : 'La partida se guarda solo en este navegador.';
}

function pushCloud(sv: unknown) {
  if (!cloudDoc) return;
  cloudPending = JSON.parse(JSON.stringify(sv));
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(flushCloud, 1500);
}

/** Escribe ya lo pendiente, de a una escritura por vez. */
export async function flushCloud(): Promise<void> {
  clearTimeout(cloudTimer);
  if (!cloudDoc || cloudWriting || !cloudPending) return;
  cloudWriting = true;
  while (cloudPending && cloudDoc) {
    const body = cloudPending;
    cloudPending = null;
    try {
      await cloudDoc.set(body);
    } catch (e) {
      if (isObj(e) && e.code === 'unavailable') {
        await sleep(1500 + Math.random() * 1500);
        try { await cloudDoc.set(cloudPending || body); cloudPending = null; } catch { /* se reintenta en el próximo guardado */ }
      } else {
        cloudDoc = null;
        setWhere(false);
      }
    }
  }
  cloudWriting = false;
}

/** Conecta con el guardado de la cuenta si existe y se queda con la partida más reciente. */
export async function initCloud(): Promise<void> {
  try {
    const claude = window.claude;
    if (!claude || !claude.use) return;
    const db = await claude.use('db');
    const user = await claude.use('user');
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    const doc = db.doc('data/users/' + id + '/save');
    const snap = await Promise.race([doc.get(), sleep(10000).then((): never => { throw new Error('timeout'); })]);
    cloudDoc = doc;
    setWhere(true);

    const local = store.get(SAVE_KEY);
    const lAt = savedAt(local);
    const remote: unknown = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null;
    const rAt = savedAt(remote);
    const playing = S.screen === 'map' || S.screen === 'battle';

    if (remote && rAt > lAt && !playing) {
      if (validSave(remote)) store.set(SAVE_KEY, remote);
      else store.del(SAVE_KEY);
      S.game = null;
      S.battle = null;
      if (S.screen === 'title') refreshTitle();
    } else if (playing) {
      save();
    } else if (validSave(local) && (!remote || lAt > rAt)) {
      pushCloud(local);
    }
  } catch {
    cloudDoc = null;
    setWhere(false);
  }
}
