/**
 * Input system — keyboard + mouse polling.
 * Frame-coherent state. Read once per tick from any system.
 */

const keys = new Set<string>();
const justPressed = new Set<string>();
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
    const k = normKey(e);
    if (!keys.has(k)) justPressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(normKey(e));
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!mouseButtons.has(e.button)) justMouse.add(e.button);
    mouseButtons.add(e.button);
  });
  canvas.addEventListener('mouseup', (e) => {
    mouseButtons.delete(e.button);
  });
  canvas.addEventListener('mousemove', (e) => {
    updateMousePos(e.clientX, e.clientY);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => { keys.clear(); mouseButtons.clear(); });
}

function normKey(e: KeyboardEvent): string {
  // Normalize WASD + arrow keys + special keys to lowercase letter / Code form
  const c = e.code;
  if (c === 'KeyW' || c === 'ArrowUp')    return 'up';
  if (c === 'KeyS' || c === 'ArrowDown')  return 'down';
  if (c === 'KeyA' || c === 'ArrowLeft')  return 'left';
  if (c === 'KeyD' || c === 'ArrowRight') return 'right';
  if (c === 'Space')      return 'dodge';
  if (c === 'ShiftLeft' || c === 'ShiftRight') return 'dodge';
  return c.toLowerCase();
}

function updateMousePos(cx: number, cy: number) {
  if (!canvasEl) return;
  const rect = canvasEl.getBoundingClientRect();
  // Scale CSS coords to canvas internal coords
  const sx = canvasW / rect.width;
  const sy = canvasH / rect.height;
  mouse.x = (cx - rect.left) * sx;
  mouse.y = (cy - rect.top)  * sy;
  // World coords match for fixed camera
  mouse.world.x = mouse.x;
  mouse.world.y = mouse.y;
}

export function isDown(key: string): boolean { return keys.has(key); }
export function wasPressed(key: string): boolean { return justPressed.has(key); }
export function isMouseDown(btn = 0): boolean { return mouseButtons.has(btn); }
export function mouseJust(btn = 0): boolean { return justMouse.has(btn); }

/** Called once per frame AFTER all systems have read input. */
export function endFrameInput() {
  justPressed.clear();
  justMouse.clear();
}

/** Returns a normalized input direction vector based on WASD state. */
export function inputDir(): { x: number, y: number } {
  let x = 0, y = 0;
  if (isDown('left'))  x -= 1;
  if (isDown('right')) x += 1;
  if (isDown('up'))    y -= 1;
  if (isDown('down'))  y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv; y *= inv;
  }
  return { x, y };
}
