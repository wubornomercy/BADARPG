/**
 * Input system — raw key + mouse state, plus action-aware helpers that
 * read the current keybinds registry (so user rebinds actually affect
 * gameplay).
 */
import { getBinding, type ActionId } from './keybinds.js';

const keyCodes = new Set<string>();
const justPressedCodes = new Set<string>();
const mouseButtons = new Set<number>();
const justMouse = new Set<number>();

export const mouse = { x: 0, y: 0, world: { x: 0, y: 0 } };

let canvasEl: HTMLCanvasElement | null = null;
let canvasW = 1920, canvasH = 1080;

export function initInput(canvas: HTMLCanvasElement, w: number, h: number) {
  canvasEl = canvas;
  canvasW = w;
  canvasH = h;

  window.addEventListener('keydown', (e) => {
    if (!keyCodes.has(e.code)) justPressedCodes.add(e.code);
    keyCodes.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keyCodes.delete(e.code);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!mouseButtons.has(e.button)) justMouse.add(e.button);
    mouseButtons.add(e.button);
  });
  canvas.addEventListener('mouseup', (e) => {
    mouseButtons.delete(e.button);
  });
  // Also catch mouseup outside canvas to avoid sticky buttons
  window.addEventListener('mouseup', (e) => {
    mouseButtons.delete(e.button);
  });
  canvas.addEventListener('mousemove', (e) => {
    updateMousePos(e.clientX, e.clientY);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    keyCodes.clear();
    mouseButtons.clear();
  });
}

function updateMousePos(cx: number, cy: number) {
  if (!canvasEl) return;
  const rect = canvasEl.getBoundingClientRect();
  const sx = canvasW / rect.width;
  const sy = canvasH / rect.height;
  mouse.x = (cx - rect.left) * sx;
  mouse.y = (cy - rect.top)  * sy;
  mouse.world.x = mouse.x;
  mouse.world.y = mouse.y;
}

// =========================================================================
// Raw queries (rarely used directly; prefer action helpers below)
// =========================================================================
export function isKeyHeld(code: string): boolean { return keyCodes.has(code); }
export function wasKeyPressed(code: string): boolean { return justPressedCodes.has(code); }
export function isMouseDown(btn = 0): boolean { return mouseButtons.has(btn); }
export function mouseJust(btn = 0): boolean { return justMouse.has(btn); }

// =========================================================================
// Action-aware queries — these are the ONES game systems should use.
// They consult keybinds.ts so user rebinds immediately take effect.
// =========================================================================
export function isActionHeld(action: ActionId): boolean {
  const k = getBinding(action);
  if (k === 'LMB') return mouseButtons.has(0);
  if (k === 'RMB') return mouseButtons.has(2);
  if (k === 'MMB') return mouseButtons.has(1);
  return keyCodes.has(k);
}

export function wasActionPressed(action: ActionId): boolean {
  const k = getBinding(action);
  if (k === 'LMB') return justMouse.has(0);
  if (k === 'RMB') return justMouse.has(2);
  if (k === 'MMB') return justMouse.has(1);
  return justPressedCodes.has(k);
}

/** Called once per frame AFTER all systems have read input. */
export function endFrameInput() {
  justPressedCodes.clear();
  justMouse.clear();
}
