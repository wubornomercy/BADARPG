/* =============================================================
   BAD ARPG — Loot Presentation Runtime
   Responsibilities (V1):
     1. Fit-to-window scaling
     2. Item pool (mirrors inventory item ids for consistency)
     3. Spawn cycle: every 2.5-4.5s a random drop appears
     4. Density manager: max 8 active drops; oldest fades when over
     5. Drop FX: pixel dust burst (0.25-0.8s) + entry pulse
     6. Ambient FX: ash drift around legendary/heaven
     7. Build-enabling marker + primary tag pill
     8. Manual triggers:
          1-5 spawn specific rarity at random ground position
          B   spawn random build-enabling drop
          R   spawn random rarity
          C   clear all
          Click any ground point to spawn
     9. Debug:
          G   toggle 12-col grid
   ============================================================= */
(function () {
  'use strict';

  const CANVAS_W = 1920, CANVAS_H = 1080;
  const canvas = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('lootStage');
  const $count = document.getElementById('lootActiveCount');

  function fit() {
    const s = Math.min(viewport.clientWidth / CANVAS_W, viewport.clientHeight / CANVAS_H);
    canvas.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  /* =============================================================
     2. Item pool — abbreviated subset for loot drops
     Each item has: name, icon, rarity, buildEnabling, primaryTag
     ============================================================= */
  const TAG_DISPLAY = {
    poison:'毒素', crit:'暴击', ricochet:'弹射',
    trigger:'触发', corruption:'腐化', projectile:'投射物',
  };

  const POOL = {
    normal: [
      { name:'锈裂短弓',  icon:'弓' },
      { name:'残破斗篷',  icon:'袍' },
      { name:'锈蚀匕首',  icon:'匕' },
      { name:'褪色护符',  icon:'符' },
      { name:'木质护腕',  icon:'腕' },
      { name:'磨损战靴',  icon:'靴' },
    ],
    magic: [
      { name:'精巧·活力之冠', icon:'冠', primaryTag:'crit' },
      { name:'致毒匕首',      icon:'匕', primaryTag:'poison' },
      { name:'暴击之环',      icon:'环', primaryTag:'crit' },
      { name:'潜行护腕',      icon:'腕' },
      { name:'引焰之杖',      icon:'杖', primaryTag:'crit' },
    ],
    rare: [
      { name:'掠夺者之锁手', icon:'锁', primaryTag:'crit' },
      { name:'寒铁短剑',     icon:'剑' },
      { name:'灰烬战靴',     icon:'靴' },
      { name:'风行者皮甲',   icon:'甲' },
      { name:'血迹之环',     icon:'环', primaryTag:'crit' },
      { name:'巫约护符',     icon:'符', primaryTag:'poison' },
    ],
    legendary: [
      { name:'召雷者之爪',       icon:'弓', buildEnabling:true, primaryTag:'ricochet' },
      { name:'弹射使徒之弓',     icon:'弓', buildEnabling:true, primaryTag:'ricochet' },
      { name:'空王之冠',         icon:'冠', buildEnabling:true, primaryTag:'trigger' },
      { name:'裂世者',           icon:'锤', buildEnabling:true, primaryTag:'corruption' },
      { name:'遗忘掠夺者之心',   icon:'心', buildEnabling:true, primaryTag:'corruption' },
      { name:'月相戒指',         icon:'环' },
    ],
    heaven: [
      { name:'蛇毒之环',  icon:'环', buildEnabling:true, primaryTag:'poison' },
      { name:'不灭之烬',  icon:'烬', buildEnabling:true, primaryTag:'crit' },
      { name:'最末之星',  icon:'星', buildEnabling:true, primaryTag:'trigger' },
    ],
  };

  function pickFrom(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function rand(a, b)    { return a + Math.random() * (b - a); }

  /* =============================================================
     3. Drop creation
     ============================================================= */
  const RARITY_ORDER = ['normal','magic','rare','legendary','heaven'];
  /* Ground area for random placement — keeps drops on the floor and
     clear of the title/legend/instructions UI rows. */
  const GROUND = { xMin: 220, xMax: 1700, yMin: 640, yMax: 920 };

  /* Active drops list, oldest first */
  const active = [];

  function spawnAt(rarity, x, y, opts = {}) {
    const item = opts.item || pickFrom(POOL[rarity]);
    const drop = buildDrop({ item, rarity, x, y });
    stage.appendChild(drop);
    active.push(drop);

    /* Drop FX — pixel dust burst */
    fireDustBurst(drop, rarity);

    /* Ambient ash for legendary / heaven */
    if (rarity === 'legendary' || rarity === 'heaven') {
      seedAsh(drop);
    }

    enforceDensity();
    updateCount();
    return drop;
  }

  function buildDrop({ item, rarity, x, y }) {
    const el = document.createElement('div');
    el.className = `loot-drop is-rarity-${rarity} is-spawning`;
    if (item.buildEnabling) el.classList.add('is-build-enabling');
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    /* Heaven aura goes BEHIND everything else in the drop */
    if (rarity === 'heaven') {
      const aura = document.createElement('div');
      aura.className = 'loot-aura';
      el.appendChild(aura);
    }

    /* Beam (background, behind icon) */
    if (rarity !== 'normal') {
      const beam = document.createElement('div');
      beam.className = 'loot-beam';
      el.appendChild(beam);
    }

    /* Ambient ash for legendary/heaven (container; particles inserted later) */
    if (rarity === 'legendary' || rarity === 'heaven') {
      const ash = document.createElement('div');
      ash.className = 'loot-ash';
      el.appendChild(ash);
    }

    /* Pedestal + icon */
    const ped = document.createElement('div');
    ped.className = 'loot-pedestal';
    el.appendChild(ped);

    const icon = document.createElement('div');
    icon.className = 'loot-icon';
    icon.textContent = item.icon;
    el.appendChild(icon);

    /* Label */
    const label = document.createElement('div');
    label.className = 'loot-label';
    if (item.buildEnabling) {
      const be = document.createElement('div');
      be.className = 'loot-be-marker';
      be.textContent = '◆';
      label.appendChild(be);
    }
    const name = document.createElement('div');
    name.className = 'loot-label-name';
    name.textContent = item.name;
    label.appendChild(name);
    if (item.buildEnabling && item.primaryTag) {
      const tag = document.createElement('div');
      tag.className = 'loot-label-tag';
      tag.textContent = TAG_DISPLAY[item.primaryTag] || item.primaryTag;
      label.appendChild(tag);
    }
    el.appendChild(label);

    /* Spawn FX container */
    const fx = document.createElement('div');
    fx.className = 'loot-spawn-fx';
    el.appendChild(fx);

    /* Remove .is-spawning after entry animation */
    setTimeout(() => el.classList.remove('is-spawning'), 520);

    return el;
  }

  /* Pixel dust particles burst radially */
  function fireDustBurst(drop, rarity) {
    const fx = drop.querySelector('.loot-spawn-fx');
    const count = rarity === 'normal' ? 4
               : rarity === 'magic'   ? 5
               : rarity === 'rare'    ? 7
               : rarity === 'legendary'? 9 : 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'loot-dust-particle';
      const angle = rand(-Math.PI*0.85, -Math.PI*0.15); // upward arc
      const dist  = rand(28, 60);
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.animationDelay = (i * 18) + 'ms';
      fx.appendChild(p);
      setTimeout(() => p.remove(), 700 + i*18);
    }
  }

  /* Ambient ash particles drifting upward through beam */
  function seedAsh(drop) {
    const ash = drop.querySelector('.loot-ash');
    if (!ash) return;
    const count = drop.classList.contains('is-rarity-heaven') ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'loot-ash-particle';
      p.style.left = rand(-2, 12) + 'px';
      p.style.bottom = rand(0, 20) + 'px';
      p.style.animationDelay = (i * 700) + 'ms';
      p.style.setProperty('--dx', rand(-12, 12) + 'px');
      ash.appendChild(p);
    }
  }

  /* =============================================================
     4. Density manager
     ============================================================= */
  function enforceDensity() {
    while (active.length > 8) {
      const oldest = active.shift();
      oldest.classList.add('is-fading');
      setTimeout(() => oldest.remove(), 200);
    }
  }
  function updateCount() {
    $count.textContent = active.length;
  }
  function clearAll() {
    active.forEach(d => {
      d.classList.add('is-fading');
      setTimeout(() => d.remove(), 200);
    });
    active.length = 0;
    updateCount();
  }

  /* =============================================================
     5. Spawn helpers — random ground position
     ============================================================= */
  function randomGroundPos() {
    return { x: rand(GROUND.xMin, GROUND.xMax),
             y: rand(GROUND.yMin, GROUND.yMax) };
  }
  function spawnRandomRarity(rarity) {
    const { x, y } = randomGroundPos();
    spawnAt(rarity, x, y);
  }

  /* =============================================================
     6. Seed: one drop per rarity, hand-placed for screenshot
     ============================================================= */
  const SEED_PLACEMENTS = [
    { rarity:'normal',    x:  300, y:  720 },
    { rarity:'magic',     x:  640, y:  780 },
    { rarity:'rare',      x: 1080, y:  820 },
    { rarity:'legendary', x: 1320, y:  720, item:{ name:'召雷者之爪', icon:'弓', buildEnabling:true, primaryTag:'ricochet' } },
    { rarity:'heaven',    x: 1620, y:  760, item:{ name:'蛇毒之环',  icon:'环', buildEnabling:true, primaryTag:'poison' } },
  ];
  SEED_PLACEMENTS.forEach(p => spawnAt(p.rarity, p.x, p.y, { item: p.item }));

  /* =============================================================
     7. Auto-spawn cycle (slow, atmospheric)
     ============================================================= */
  function autoSpawn() {
    // Weighted rarity — rare loot is rare
    const r = Math.random();
    const rarity = r < 0.45 ? 'normal'
                : r < 0.74 ? 'magic'
                : r < 0.90 ? 'rare'
                : r < 0.98 ? 'legendary' : 'heaven';
    spawnRandomRarity(rarity);
    setTimeout(autoSpawn, rand(2500, 4500));
  }
  setTimeout(autoSpawn, 3500);

  /* =============================================================
     8. Interaction
     ============================================================= */
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === '1') spawnRandomRarity('normal');
    if (k === '2') spawnRandomRarity('magic');
    if (k === '3') spawnRandomRarity('rare');
    if (k === '4') spawnRandomRarity('legendary');
    if (k === '5') spawnRandomRarity('heaven');
    if (k === 'b') {
      // Build-enabling: pick from legendary or heaven build-enabling items
      const tier = Math.random() < 0.4 ? 'heaven' : 'legendary';
      const beItems = POOL[tier].filter(i => i.buildEnabling);
      const item = pickFrom(beItems);
      const { x, y } = randomGroundPos();
      spawnAt(tier, x, y, { item });
    }
    if (k === 'r') {
      const tier = pickFrom(RARITY_ORDER);
      spawnRandomRarity(tier);
    }
    if (k === 'c') clearAll();
    if (k === 'g') canvas.classList.toggle('show-grid');
  });

  /* Click anywhere on the ground area to spawn */
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top)  * sy;
    // Only spawn on the "ground" area (lower half)
    if (y < 540 || y > 1000) return;
    // Default to weighted random rarity (slightly more dramatic for click)
    const r = Math.random();
    const rarity = r < 0.30 ? 'normal'
                : r < 0.55 ? 'magic'
                : r < 0.80 ? 'rare'
                : r < 0.95 ? 'legendary' : 'heaven';
    spawnAt(rarity, x, y);
  });
})();
