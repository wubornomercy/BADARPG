/* =============================================================
   BAD ARPG — HUD Prototype Runtime
   Responsibilities:
     1. Fit-to-window scaling of the 1920x1080 canvas
     2. Damage number spawner (random, around combat safe zone)
     3. Loot label spawner (caps at 8 simultaneous, fade lifecycle)
     4. Debug toggles:
          G  — 12-col / safe-area grid overlay
          S  — Combat Safe Zone rect
     5. Skill slot click logging (placeholder)
   No gameplay logic — this is blueprint validation only.
   ============================================================= */

(function () {
  'use strict';

  const CANVAS_W = 1920;
  const CANVAS_H = 1080;

  const canvas   = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');
  const world    = document.getElementById('worldSpace');

  /* ---------- 1. Fit-to-window scaling ---------- */
  function fit() {
    const scale = Math.min(viewport.clientWidth / CANVAS_W,
                           viewport.clientHeight / CANVAS_H);
    canvas.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  /* ---------- Helpers ---------- */
  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr)      { return arr[(Math.random() * arr.length) | 0]; }

  /* ---------- 2. Damage number spawner ---------- */
  // Combat Safe Zone bounds (per HUD spec)
  const SAFE = { xMin: 520, xMax: 1400, yMin: 240, yMax: 760 };
  // Keep numbers away from the very edges so the screenshot reads cleanly
  function spawnDamage() {
    const isCrit = Math.random() < 0.18;
    const el = document.createElement('div');
    el.className = isCrit ? 'dmg dmg-crit' : 'dmg';
    const value  = isCrit
      ? Math.floor(rand(120, 380)) + '!'
      : Math.floor(rand(10, 95));
    el.textContent = value;
    el.style.left = rand(SAFE.xMin, SAFE.xMax) + 'px';
    el.style.top  = rand(SAFE.yMin, SAFE.yMax) + 'px';
    world.appendChild(el);
    // Spec: damage duration 450ms; remove on animationend
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
  setInterval(spawnDamage, 280);  // tune for visible density

  /* ---------- 3. Loot label spawner ---------- */
  const LOOT_MAX = 8;
  const LOOT_FADE_OUT = 180;
  const LOOT_TABLE = [
    // weight, rarity class, label
    [60, 'loot-normal',    [
      'Cracked Shortbow', 'Splintered Buckler', 'Rusted Dagger',
      'Tattered Cloak',   'Faded Charm',         'Worn Boots',
    ]],
    [22, 'loot-magic',     [
      "Cunning Cap of Vigor", "Stalker's Bracers of Haste",
      "Mage's Sigil of the Mind", "Sworn Belt of Endurance",
    ]],
    [12, 'loot-rare',      [
      "Reaver's Gauntlet",     "Hexbound Crest",
      "Coldsteel Aegis",       "Witch-Pact Talisman",
    ]],
    [5,  'loot-legendary', [
      "Stormcaller's Talon",   "Heart of the Forgotten Reaver",
      "Crown of the Hollow King", "Worldsplitter",
    ]],
    [1,  'loot-heaven',    [
      "Untouched Ember", "Last Vow of Light", "The Final Star",
    ]],
  ];
  // Compute cumulative weights once
  const LOOT_TOTAL = LOOT_TABLE.reduce((s, r) => s + r[0], 0);
  function rollLoot() {
    let r = Math.random() * LOOT_TOTAL;
    for (const row of LOOT_TABLE) {
      r -= row[0];
      if (r <= 0) return { rarity: row[1], name: pick(row[2]) };
    }
    return { rarity: 'loot-normal', name: 'Old Item' };
  }
  function activeLoots() { return world.querySelectorAll('.loot:not(.is-fading)'); }
  function spawnLoot() {
    // Enforce max simultaneous: fade oldest if cap reached
    const active = activeLoots();
    if (active.length >= LOOT_MAX) {
      const oldest = active[0];
      oldest.classList.add('is-fading');
      setTimeout(() => oldest.remove(), LOOT_FADE_OUT);
    }
    const { rarity, name } = rollLoot();
    const el = document.createElement('div');
    el.className = 'loot ' + rarity;
    el.textContent = name;
    el.style.left = rand(620, 1180) + 'px';
    el.style.top  = rand(500, 740) + 'px';
    world.appendChild(el);
    // Lifespan ~ 3.5–5.5s, then fade out
    const life = rand(3500, 5500);
    setTimeout(() => {
      el.classList.add('is-fading');
      setTimeout(() => el.remove(), LOOT_FADE_OUT + 50);
    }, life);
  }
  setInterval(spawnLoot, 1100);

  /* ---------- 4. Debug toggles ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('show-grid');
    if (e.key === 's' || e.key === 'S') canvas.classList.toggle('show-safe-zone');
    if (e.key === 'd' || e.key === 'D') spawnDamage();   // manual spawn
    if (e.key === 'l' || e.key === 'L') spawnLoot();     // manual spawn
  });

  /* ---------- 5. Skill slot click stubs ---------- */
  document.querySelectorAll('.hud-skill-bar .slot').forEach((slot) => {
    slot.addEventListener('click', () => {
      const key = slot.dataset.key || '?';
      // eslint-disable-next-line no-console
      console.log(`[SKILL ${key}] activated (stub)`);
    });
  });
})();
