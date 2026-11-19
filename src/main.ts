import './styles.css';
import { S } from './core/state.ts';
import { loadOpts, initCloud } from './core/save.ts';
import { buildStatic, refreshOpts, show } from './ui/screens.ts';
import { wireInput } from './input.ts';

function start(): void {
  const o = loadOpts();
  if (o) S.opts = o;
  buildStatic();
  refreshOpts();
  wireInput();
  show('title');
  initCloud();
}

start();
