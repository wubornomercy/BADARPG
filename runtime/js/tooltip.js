/* =============================================================
   BAD ARPG — Tooltip Prototype Runtime
   Responsibilities (V1):
     1. Fit-to-window scaling of the 1920x1080 canvas
     2. Hover-tooltip floater for showcase items (80ms delay, 120ms fade)
     3. Comparison swap: click any showcase item to copy its tooltip
        into a floating "compare against equipped" position
     4. Debug toggles: G grid overlay
   No gameplay logic — blueprint validation only.
   ============================================================= */
(function () {
  'use strict';

  const CANVAS_W = 1920;
  const CANVAS_H = 1080;
  const canvas   = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');
  const floater  = document.getElementById('floatingTooltip');

  /* ---------- 1. Fit-to-window scaling ---------- */
  function fit() {
    const scale = Math.min(viewport.clientWidth / CANVAS_W,
                           viewport.clientHeight / CANVAS_H);
    canvas.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  /* ---------- 2. Hover floating tooltip ----------
     Per spec:
       - Fade in:  120ms
       - Fade out: 120ms
       - Hover delay: 80ms
       - Auto offset (never block mouse center)
  */
  const HOVER_DELAY = 80;
  const OFFSET      = { x: 16, y: 16 };
  let hoverTimer = null;
  let activeSource = null;

  function showFloater(srcEl, mouseX, mouseY) {
    if (activeSource === srcEl && floater.classList.contains('is-visible')) return;
    activeSource = srcEl;
    // Clone tooltip content for the floater
    floater.innerHTML = '';
    const clone = srcEl.cloneNode(true);
    clone.style.pointerEvents = 'none';
    floater.appendChild(clone);
    positionFloater(mouseX, mouseY);
    floater.classList.add('is-visible');
  }

  function hideFloater() {
    floater.classList.remove('is-visible');
    activeSource = null;
  }

  function positionFloater(mouseX, mouseY) {
    // Convert mouse coords to canvas-internal coords by accounting for the
    // CSS scale transform applied on .canvas.
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    let x = (mouseX - rect.left) * scaleX + OFFSET.x;
    let y = (mouseY - rect.top)  * scaleY + OFFSET.y;
    // Clamp inside canvas, with margin for floater width
    const FLOAT_W = 440, FLOAT_H = 520;
    if (x + FLOAT_W > CANVAS_W - 20) x = mouseX * scaleX - FLOAT_W - OFFSET.x - rect.left * scaleX;
    if (y + FLOAT_H > CANVAS_H - 20) y = CANVAS_H - FLOAT_H - 20;
    floater.style.left = Math.max(20, x) + 'px';
    floater.style.top  = Math.max(20, y) + 'px';
  }

  // Bind hover handlers to all showcase tooltips (the pinned ones)
  document.querySelectorAll('.tooltip[data-item]').forEach((tip) => {
    tip.addEventListener('mouseenter', (e) => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        // Only show floating duplicate if the hovered tooltip is not
        // currently the comparison block (avoid self-clone)
        if (!tip.closest('.comparison')) {
          // We surface a subtle "DOUBLE" floater nearby just to
          // demonstrate the hover-delay + auto-offset spec.
          showFloater(tip, e.clientX, e.clientY);
        }
      }, HOVER_DELAY);
    });
    tip.addEventListener('mousemove', (e) => {
      if (floater.classList.contains('is-visible') && activeSource === tip) {
        positionFloater(e.clientX, e.clientY);
      }
    });
    tip.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      hideFloater();
    });
  });

  /* ---------- 3. Click-to-compare (stub) ----------
     Clicking on any showcase tooltip logs the intent to update the
     comparison "NEW" pane to that item. Real swap will be implemented
     when the inventory data model exists (Phase 1 next steps).
  */
  document.querySelectorAll('.tooltip[data-item]').forEach((tip) => {
    tip.addEventListener('click', () => {
      const id = tip.dataset.item;
      // eslint-disable-next-line no-console
      console.log(`[COMPARE] would replace NEW pane with item: ${id}`);
    });
  });

  /* ---------- 4. Debug toggles ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('show-grid');
  });
})();
