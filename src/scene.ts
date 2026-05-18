/**
 * Scene state machine — drives which HTML overlay is active and whether
 * Pixi game logic is running.
 *
 * States:
 *   MENU         — main menu HTML visible, Pixi paused
 *   PLAYING      — Pixi running, HUD visible, no panel
 *   PANEL_INV    — Pixi running (dimmed 15%), inventory HTML visible
 *   PANEL_CHAR   — Pixi running (dimmed 15%), character HTML visible
 *   PANEL_SKILL  — Pixi running (dimmed 15%), skill HTML visible
 */
export type Scene =
  | 'MENU'
  | 'PLAYING'
  | 'PAUSE'
  | 'PANEL_INV'
  | 'PANEL_CHAR'
  | 'PANEL_SKILL'
  | 'PANEL_SETTINGS';

let current: Scene = 'MENU';
let lastNonPanel: Scene = 'MENU';   // remember what to return to when closing a panel
const listeners: ((s: Scene) => void)[] = [];

export function getScene(): Scene { return current; }

/** Where a panel-close (× / ESC) should return to. */
export function getReturnScene(): Scene { return lastNonPanel; }

const NON_PANEL_SCENES: readonly Scene[] = ['MENU', 'PLAYING', 'PAUSE'];

export function setScene(next: Scene) {
  const prev = current;
  if (prev === next) return;
  // Track the last non-panel scene so close buttons know where to go
  if (NON_PANEL_SCENES.includes(prev)) lastNonPanel = prev;
  current = next;
  applyDom(next);
  for (const fn of listeners) fn(next);
}

export function onSceneChange(fn: (s: Scene) => void) { listeners.push(fn); }

/** True while inside ANY panel state */
export function isPanelOpen(): boolean {
  return current === 'PANEL_INV' || current === 'PANEL_CHAR'
      || current === 'PANEL_SKILL' || current === 'PANEL_SETTINGS';
}

/** True while Pixi runtime should tick (game world updates).
 *  Panels keep ticking (spec); MENU + PAUSE freeze the world. */
export function shouldGameTick(): boolean {
  return current !== 'MENU' && current !== 'PAUSE';
}

function applyDom(s: Scene) {
  const $ = (id: string) => document.getElementById(id);
  const setActive = (el: HTMLElement | null, on: boolean) => {
    if (!el) return;
    el.classList.toggle('is-active', on);
  };

  // Menu visible only in MENU
  setActive($('menuScreen'), s === 'MENU');
  // HUD visible everywhere except MENU
  setActive($('gameHud'), s !== 'MENU');
  // Scene hint shown during PLAYING only
  setActive($('sceneHint'), s === 'PLAYING');
  // Pause overlay only in PAUSE
  setActive($('pauseScreen'), s === 'PAUSE');
  // World dim active when a panel is up
  setActive($('worldDim'),
    s === 'PANEL_INV' || s === 'PANEL_CHAR' || s === 'PANEL_SKILL' || s === 'PANEL_SETTINGS');
  // Panels
  setActive($('invPanel'),       s === 'PANEL_INV');
  setActive($('charPanel'),      s === 'PANEL_CHAR');
  setActive($('skillPanel'),     s === 'PANEL_SKILL');
  setActive($('settingsPanel'),  s === 'PANEL_SETTINGS');
}
