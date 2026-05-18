/* =============================================================
   BAD ARPG — Runtime Bootstrapping
   Responsibilities (intentionally minimal in V1):
     1. Fit-to-window uniform scaling of the 1920x1080 canvas
     2. Button click handlers (placeholder log)
     3. Optional debug grid toggle via key "G"
   NOTHING here is gameplay logic. The canvas keeps a 1:1 internal
   coordinate system regardless of window size.
   ============================================================= */

(function () {
  'use strict';

  const CANVAS_W = 1920;
  const CANVAS_H = 1080;

  const canvas = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');

  // -------- 1. Fit-to-window scaling --------
  function fit() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
    canvas.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  // -------- 2. Button handlers --------
  const handlers = {
    'continue':  () => log('[CONTINUE] — no save game available (V1)'),
    'new-game':  () => log('[NEW GAME] — would start character select'),
    'character': () => log('[CHARACTER] — would open character panel'),
    'settings':  () => log('[SETTINGS] — would open settings panel'),
    'exit':      () => log('[EXIT] — would terminate runtime'),
  };

  document.querySelectorAll('.btn-main').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.classList.contains('is-disabled')) return;
      const action = btn.dataset.action;
      (handlers[action] || (() => log(`Unknown action: ${action}`)))();
    });
  });

  function log(msg) {
    // Forward to console for blueprint debugging
    // (replace with proper event bus in Phase 2)
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  // -------- 3. Debug grid toggle (G key) --------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') {
      canvas.classList.toggle('show-grid');
    }
  });
})();
