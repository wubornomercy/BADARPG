/**
 * BAD ARPG — First Playable Vertical Slice (Phase 2A)
 * Entry point. Scene-aware: main menu (HTML) → arena (Pixi) → panels (HTML).
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import { CANVAS_W, CANVAS_H, WORLD_W, WORLD_H, ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_HALF, COLOR, TUNE, TIME } from './tokens.js';
import { initInput, endFrameInput, mouse, isMouseDown } from './input.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile } from './entities/projectile.js';
import { LootDrop } from './entities/loot.js';
import { DebugHud, sim, canSpawnProjectile, canSpawnEnemy } from './sim.js';
import { requestShake, computeShake, requestHitStop, isInHitStop } from './feel.js';
import { Scene, getScene, setScene, shouldGameTick, isPanelOpen, onSceneChange, getReturnScene } from './scene.js';
import { follow as cameraFollow, getCameraOffset, screenToWorld } from './camera.js';
import { buildWorld, spawnCorruptionZones, updateCorruptionZones } from './world.js';
import { populatePanels } from './panel-stubs.js';
import { initSettingsUI } from './settings-ui.js';
import { initTooltipHover, refreshTooltipTargets } from './tooltip-hover.js';

(async () => {
  // ---------------------------------------------------------------------
  // Pixi bootstrap — inserted into #pixiHost (not body)
  // ---------------------------------------------------------------------
  const app = new Application();
  await app.init({
    width: CANVAS_W,
    height: CANVAS_H,
    background: 0x050608,
    antialias: false,
    resolution: 1,
    autoDensity: false,
  });
  app.renderer.canvas.style.imageRendering = 'pixelated';

  const pixiHost = document.getElementById('pixiHost')!;
  pixiHost.appendChild(app.canvas);

  // Scale the entire .canvas wrapper (which includes Pixi + HTML overlays)
  // uniformly to fit the viewport.
  const canvasWrap = document.getElementById('canvas')!;
  function fit() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
    canvasWrap.style.width  = CANVAS_W + 'px';
    canvasWrap.style.height = CANVAS_H + 'px';
    canvasWrap.style.transform = `scale(${scale})`;
    canvasWrap.style.transformOrigin = 'center center';
    canvasWrap.style.position = 'absolute';
    canvasWrap.style.left = ((vw - CANVAS_W) / 2) + 'px';
    canvasWrap.style.top  = ((vh - CANVAS_H) / 2) + 'px';
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  initInput(app.canvas as HTMLCanvasElement, CANVAS_W, CANVAS_H);

  // ---------------------------------------------------------------------
  // Static panel population (one-time) + settings + tooltip hover
  // ---------------------------------------------------------------------
  populatePanels();
  initSettingsUI();
  initTooltipHover();
  refreshTooltipTargets();   // re-scan after panels populated

  // ---------------------------------------------------------------------
  // URL-param scene override — useful for headless screenshots + debugging
  //   ?scene=play    -> jump to PLAYING on load
  //   ?scene=inv     -> open inventory panel
  //   ?scene=char    -> open character panel
  //   ?scene=skill   -> open skill panel
  // ---------------------------------------------------------------------
  const sceneParam = new URL(location.href).searchParams.get('scene');
  if (sceneParam === 'play')     setScene('PLAYING');
  if (sceneParam === 'inv')      setScene('PANEL_INV');
  if (sceneParam === 'char')     setScene('PANEL_CHAR');
  if (sceneParam === 'skill')    setScene('PANEL_SKILL');
  if (sceneParam === 'settings') setScene('PANEL_SETTINGS');

  // ---------------------------------------------------------------------
  // World scene graph
  // ---------------------------------------------------------------------
  const worldRoot = new Container();
  worldRoot.label = 'worldRoot';
  app.stage.addChild(worldRoot);

  const world = buildWorld();
  worldRoot.addChild(world);

  const corruptionLayer = spawnCorruptionZones();
  worldRoot.addChild(corruptionLayer);

  const layerGroundFx    = new Container();
  const layerLoot        = new Container();
  const layerEnemies     = new Container();
  const layerProjectiles = new Container();
  const layerPlayer      = new Container();
  const layerImpactFx    = new Container();
  const layerFloatText   = new Container();
  worldRoot.addChild(
    layerGroundFx, layerLoot, layerEnemies, layerProjectiles,
    layerPlayer, layerImpactFx, layerFloatText,
  );

  // Player spawned at arena center
  const player = new Player();
  player.x = ARENA_CENTER_X;
  player.y = ARENA_CENTER_Y;
  layerPlayer.addChild(player.container);

  // ---------------------------------------------------------------------
  // Entity lists
  // ---------------------------------------------------------------------
  const enemies: Enemy[] = [];
  const projectiles: Projectile[] = [];
  const lootDrops: LootDrop[] = [];

  // Seed enemies around player
  for (let i = 0; i < TUNE.ENEMY_INITIAL_COUNT; i++) {
    spawnEnemyAtArenaEdge();
  }

  let nextSpawnAt = 0;
  function spawnEnemyAtArenaEdge() {
    if (!canSpawnEnemy()) return;
    // Spawn at the rim of the arena ring (not at world edge)
    const angle = Math.random() * Math.PI * 2;
    const r = ARENA_HALF - 40 + Math.random() * 80;
    const x = ARENA_CENTER_X + Math.cos(angle) * r;
    const y = ARENA_CENTER_Y + Math.sin(angle) * r;
    const e = new Enemy(x, y);
    enemies.push(e);
    layerEnemies.addChild(e.container);
    sim.enemyCount++;
  }

  // ---------------------------------------------------------------------
  // Debug HUD (Pixi overlay, top-right)
  // ---------------------------------------------------------------------
  const hud = new DebugHud();
  app.stage.addChild(hud.container);

  // ---------------------------------------------------------------------
  // HUD bridge — wire player state to HTML HUD overlay
  // ---------------------------------------------------------------------
  const $hudHp        = document.getElementById('hudHp')!;
  const $hpFluid      = document.getElementById('hpFluid')!;
  const $hudCorrupt   = document.getElementById('hudCorruption')!;
  let corruptionMeter = 0;  // 0-100, gained from standing in corruption zones

  function updateHtmlHud() {
    $hudHp.textContent = `${Math.max(0, Math.floor(player.hp))}`;
    const pct = Math.max(0, Math.min(100, player.hp / player.hpMax * 100));
    ($hpFluid as HTMLElement).style.height = pct + '%';
    $hudCorrupt.textContent = `${Math.floor(corruptionMeter)}%`;
  }
  updateHtmlHud();

  // ---------------------------------------------------------------------
  // Scene wiring: menu buttons + panel hotkeys + ESC
  // ---------------------------------------------------------------------
  document.getElementById('menuNewGame')?.addEventListener('click', () => {
    setScene('PLAYING');
  });
  // The other menu buttons are placeholders for V1
  document.getElementById('menuCharacter')?.addEventListener('click', () => {
    // Treat as "go to character panel directly" — useful demo of integration
    setScene('PANEL_CHAR');
  });
  document.getElementById('menuSettings')?.addEventListener('click', () => {
    setScene('PANEL_SETTINGS');
  });
  document.getElementById('menuExit')?.addEventListener('click', () => {
    console.log('[EXIT] would close runtime');
  });
  // Panel close buttons — return to wherever we came from (MENU or PLAYING)
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => setScene(getReturnScene()));
  });

  // Keyboard panel toggles + ESC
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    // ESC: panel → playing, playing → menu, menu → menu (no-op)
    if (k === 'escape') {
      if (isPanelOpen()) setScene(getReturnScene());
      else if (getScene() === 'PLAYING') setScene('MENU');
      return;
    }
    // Hotkeys only active during PLAYING / panels (NOT menu)
    if (getScene() === 'MENU') return;
    if (k === 'i') setScene(getScene() === 'PANEL_INV'  ? 'PLAYING' : 'PANEL_INV');
    if (k === 'c') setScene(getScene() === 'PANEL_CHAR' ? 'PLAYING' : 'PANEL_CHAR');
    if (k === 'k') setScene(getScene() === 'PANEL_SKILL'? 'PLAYING' : 'PANEL_SKILL');
  });

  // When entering PLAYING from MENU, reset player position
  onSceneChange((s) => {
    if (s === 'PLAYING' && player.hp <= 0) {
      // Soft "respawn" on returning from menu after death
      player.hp = player.hpMax;
      player.x = ARENA_CENTER_X;
      player.y = ARENA_CENTER_Y;
    }
  });

  // ---------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------
  let lastTime = performance.now();
  let fpsAccum = 0; let fpsFrames = 0; let fpsTimer = 0;

  app.ticker.add(() => {
    const now = performance.now();
    const rawDt = now - lastTime;
    lastTime = now;

    fpsAccum += rawDt; fpsFrames++; fpsTimer += rawDt;
    if (fpsTimer >= 250) {
      sim.fps = (fpsFrames / fpsAccum) * 1000;
      sim.frameMs = fpsAccum / fpsFrames;
      fpsAccum = 0; fpsFrames = 0; fpsTimer = 0;
    }

    // ===== Camera + render position =====
    // Always update camera so the view follows the player even when
    // panels are open (per spec — "combat 不暂停").
    cameraFollow(player.x, player.y);
    const cam = getCameraOffset();
    const shk = computeShake(now);
    worldRoot.position.set(cam.x + shk.x, cam.y + shk.y);

    // Visibility: hide game world entirely while in MENU (HTML menu is shown)
    worldRoot.visible = getScene() !== 'MENU';
    hud.container.visible = getScene() !== 'MENU';

    // Pause game tick during MENU
    if (!shouldGameTick()) {
      hud.update();
      endFrameInput();
      return;
    }

    // Global hit-stop freeze
    const dt = isInHitStop(now) ? 0 : Math.min(rawDt, 33);

    // ----- Corruption zone DOT -----
    const corruptionDot = updateCorruptionZones(now, player.x, player.y);
    if (corruptionDot > 0) {
      player.takeDamage(corruptionDot, now);
      corruptionMeter = Math.min(100, corruptionMeter + 0.5);
      requestShake(2, 60, now);
    } else {
      // Slow decay when out of corruption
      corruptionMeter = Math.max(0, corruptionMeter - 0.04);
    }

    // ----- Click-to-move (LMB held) -----
    // Always compute world mouse for both move + attack
    const worldMouse = screenToWorld(mouse.world.x, mouse.world.y);
    if (isMouseDown(0)) {
      player.setMoveTarget(worldMouse.x, worldMouse.y);
    } else {
      player.clearMoveTarget();
    }

    // ----- Player tick -----
    player.update(dt, now, spawnFootstepDust);

    // ----- Player attack (RMB hold) -----
    if (isMouseDown(2) && player.canAttack(now) && canSpawnProjectile()) {
      const px = player.x, py = player.y;
      const dx = worldMouse.x - px;
      const dy = worldMouse.y - py;
      const mag = Math.hypot(dx, dy) || 1;
      const dirX = dx / mag, dirY = dy / mag;
      const vx = dirX * TUNE.PROJ_SPEED;
      const vy = dirY * TUNE.PROJ_SPEED;
      const p = new Projectile(px + dirX * 18, py + dirY * 18, vx, vy, now, true);
      projectiles.push(p);
      layerProjectiles.addChild(p.container);
      sim.projectileCount++;
      player.consumeAttack(now);
      player.applyRecoil(dirX, dirY);
      spawnMuzzleFlash(px + dirX * 20, py + dirY * 20);
    }

    // ----- Enemy spawner (top up to 8 active) -----
    if (now >= nextSpawnAt && enemies.filter(e => e.alive).length < 8) {
      spawnEnemyAtArenaEdge();
      nextSpawnAt = now + TUNE.ENEMY_SPAWN_INTERVAL;
    }

    // ----- Enemies -----
    for (const e of enemies) {
      if (!e.alive) continue;
      e.update(dt, now, { x: player.x, y: player.y });
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < TUNE.PLAYER_RADIUS + TUNE.ENEMY_RADIUS && e.canContact(now)) {
        player.takeDamage(TUNE.ENEMY_DAMAGE, now);
        e.applyContactCooldown(now);
        requestShake(TUNE.SHAKE_HURT, 220, now);
        requestHitStop(TIME.HIT_STOP_HURT, now);
      }
    }

    // ----- Projectiles + collision -----
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.update(dt, now);
      if (p.x < -20 || p.x > WORLD_W + 20 || p.y < -20 || p.y > WORLD_H + 20) {
        p.alive = false;
      }
      if (p.alive && p.ownerIsPlayer) {
        for (const e of enemies) {
          if (!e.alive) continue;
          const dxh = e.x - p.x;
          const dyh = e.y - p.y;
          if (dxh * dxh + dyh * dyh <= (TUNE.ENEMY_RADIUS + TUNE.PROJ_RADIUS) ** 2) {
            const isCrit = Math.random() < TUNE.CRIT_CHANCE;
            const dmg = isCrit ? Math.round(TUNE.PROJ_DAMAGE * TUNE.CRIT_MULT) : TUNE.PROJ_DAMAGE;
            const killed = e.takeDamage(dmg, now, p.dirX, p.dirY, isCrit);
            requestHitStop(isCrit ? TIME.HIT_STOP_CRIT : TIME.HIT_STOP_NORMAL, now);
            requestShake(isCrit ? TUNE.SHAKE_CRIT : TUNE.SHAKE_HIT, isCrit ? 220 : 110, now);
            spawnImpactBurst(e.x, e.y, isCrit);
            spawnDamageNumber(e.x, e.y - 16, dmg, isCrit);
            p.alive = false;
            if (killed) {
              requestHitStop(TIME.HIT_STOP_DEATH, now);
              requestShake(TUNE.SHAKE_DEATH, 160, now);
              spawnDeathBurst(e.x, e.y, p.dirX, p.dirY, now, isCrit);
              sim.kills++;
              dropLoot(e.x, e.y, now);
            }
            break;
          }
        }
      }
    }

    for (const v of vfxList) v.update(dt, now);
    for (const d of dmgList) d.update(dt, now);
    for (const l of lootDrops) l.update(dt, now);

    // Cleanup
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (!projectiles[i].alive) {
        projectiles[i].container.destroy();
        projectiles.splice(i, 1);
        sim.projectileCount--;
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].alive) {
        enemies[i].container.destroy();
        enemies.splice(i, 1);
        sim.enemyCount--;
      }
    }
    for (let i = vfxList.length - 1; i >= 0; i--) {
      if (!vfxList[i].alive) {
        vfxList[i].container.destroy();
        vfxList.splice(i, 1);
        sim.vfxCount = Math.max(0, sim.vfxCount - 1);
      }
    }
    for (let i = dmgList.length - 1; i >= 0; i--) {
      if (!dmgList[i].alive) {
        dmgList[i].container.destroy();
        dmgList.splice(i, 1);
      }
    }

    // HUD updates
    updateHtmlHud();
    hud.update();
    endFrameInput();
  });

  // ---------------------------------------------------------------------
  // VFX systems (unchanged from V2)
  // ---------------------------------------------------------------------
  type Vfx = {
    container: Container, alive: boolean, spawnAt: number,
    update: (dt: number, now: number) => void,
  };
  const vfxList: Vfx[] = [];

  function spawnImpactBurst(x: number, y: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const c = isCrit ? 0xFFFFFF : 0xF4F2E8;
    const rim = isCrit ? COLOR.tier1 : 0xD2D6DC;
    const g = new Graphics();
    g.rect(-4, -1, 8, 2).fill(c);
    g.rect(-1, -4, 2, 8).fill(c);
    g.rect(-7, -2, 3, 4).fill(rim);
    g.rect(4, -2, 3, 4).fill(rim);
    g.rect(-2, -7, 4, 3).fill(rim);
    g.rect(-2, 4, 4, 3).fill(rim);
    cnt.addChild(g);
    const lifeMs = TIME.IMPACT_FRAME;
    const spawn = performance.now();
    vfxList.push({
      container: cnt, alive: true, spawnAt: spawn,
      update(_dt, n) {
        const t = (n - spawn) / lifeMs;
        if (t >= 1) { this.alive = false; return; }
        cnt.scale.set(1 + t * 0.8);
        cnt.alpha = 1 - t;
      },
    });
    sim.vfxCount++;
  }

  function spawnDeathBurst(x: number, y: number, dirX: number, dirY: number, now: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const count = isCrit ? TUNE.DEATH_PARTICLE_COUNT_CRIT : TUNE.DEATH_PARTICLE_COUNT;
    const particles: { g: Graphics, vx: number, vy: number }[] = [];
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 220 + Math.random() * 320;
      const g = new Graphics().rect(-2, -2, 4, 4).fill(isCrit ? COLOR.tier1 : COLOR.enemyHit);
      cnt.addChild(g);
      particles.push({ g, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
    }
    const ring = new Graphics();
    cnt.addChild(ring);
    vfxList.push({
      container: cnt, alive: true, spawnAt: now,
      update(dtMs, n) {
        const t = (n - now) / TIME.DEATH_BURST;
        if (t >= 1) { this.alive = false; return; }
        const dt = dtMs / 1000;
        for (const p of particles) {
          p.g.x += p.vx * dt;
          p.g.y += p.vy * dt;
          p.g.alpha = Math.max(0, 1 - t * 1.4);
          p.vx *= 0.90;
          p.vy *= 0.90;
        }
        ring.clear();
        const r = 8 + t * 56;
        const rcol = isCrit ? COLOR.tier1 : 0xD6DBE3;
        const a = Math.max(0, 1 - t * 1.6);
        for (let k = 0; k < 3; k++) {
          ring.circle(0, 0, r + k * 2).stroke({ color: rcol, width: 1, alpha: a * (1 - k * 0.25) });
        }
      },
    });
    sim.vfxCount++;
  }

  function spawnMuzzleFlash(x: number, y: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const g = new Graphics()
      .rect(-3, -1, 6, 2).fill(0xFFFFFF)
      .rect(-1, -3, 2, 6).fill(0xFFFFFF);
    cnt.addChild(g);
    const life = 70;
    const start = performance.now();
    vfxList.push({
      container: cnt, alive: true, spawnAt: start,
      update(_dt, n) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.alpha = 1 - t;
        cnt.scale.set(1 + t * 0.4);
      },
    });
  }

  function spawnFootstepDust(x: number, y: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerGroundFx.addChild(cnt);
    const g = new Graphics()
      .rect(-2, -1, 4, 2).fill({ color: 0xAAB0BA, alpha: 0.42 });
    cnt.addChild(g);
    const start = performance.now();
    const life = 280;
    vfxList.push({
      container: cnt, alive: true, spawnAt: start,
      update(_dt, n) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.alpha = (1 - t) * 0.5;
        cnt.scale.x = 1 + t * 0.6;
      },
    });
  }

  // ---------------------------------------------------------------------
  // Damage numbers (in-world floating text)
  // ---------------------------------------------------------------------
  type DmgNum = {
    container: Container, alive: boolean, spawnAt: number,
    update: (dt: number, now: number) => void,
  };
  const dmgList: DmgNum[] = [];

  function spawnDamageNumber(x: number, y: number, value: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerFloatText.addChild(cnt);
    const txt = new Text({
      text: isCrit ? `${value}!` : `${value}`,
      style: {
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: isCrit ? 24 : 18,
        fontWeight: '700',
        fill: isCrit ? COLOR.dmgCrit : COLOR.dmgNormal,
        align: 'center',
      },
    });
    txt.anchor.set(0.5, 1);
    cnt.addChild(txt);
    const start = performance.now();
    const life = TIME.DAMAGE_LIFESPAN;
    const drift = isCrit ? 56 : 38;
    const wob = (Math.random() - 0.5) * 18;
    dmgList.push({
      container: cnt, alive: true, spawnAt: start,
      update(_dt, n) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.y = Math.round(y - t * drift);
        cnt.x = Math.round(x + wob * t);
        cnt.alpha = t < 0.85 ? 1 : (1 - t) / 0.15;
      },
    });
  }

  function dropLoot(x: number, y: number, now: number) {
    const r = Math.random();
    const rarity = r < 0.65 ? 'normal' : r < 0.92 ? 'magic' : 'rare';
    const drop = new LootDrop(x, y, rarity, now);
    lootDrops.push(drop);
    layerLoot.addChild(drop.container);
    sim.lootDrops++;
  }
})();
