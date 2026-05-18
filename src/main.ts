/**
 * BAD ARPG — Combat Sandbox V2 (Combat Feel Foundation)
 * Phase 2: Step 1 + Step 5 + Step 6 (combat feel) all in one runtime.
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import { CANVAS_W, CANVAS_H, COLOR, TUNE, TIME } from './tokens.js';
import { initInput, endFrameInput, mouse, isMouseDown } from './input.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile } from './entities/projectile.js';
import { LootDrop } from './entities/loot.js';
import { DebugHud, sim, canSpawnProjectile, canSpawnEnemy } from './sim.js';
import { requestShake, applyShake, requestHitStop, isInHitStop } from './feel.js';

(async () => {
  // ---------------------------------------------------------------------
  // Pixi app
  // ---------------------------------------------------------------------
  const app = new Application();
  await app.init({
    width: CANVAS_W,
    height: CANVAS_H,
    background: 0x07080B,
    antialias: false,
    resolution: 1,
    autoDensity: false,
  });
  app.renderer.canvas.style.imageRendering = 'pixelated';

  const stage = document.getElementById('stage')!;
  stage.appendChild(app.canvas);
  fitCanvas(app.canvas as HTMLCanvasElement);
  window.addEventListener('resize', () => fitCanvas(app.canvas as HTMLCanvasElement));

  initInput(app.canvas as HTMLCanvasElement, CANVAS_W, CANVAS_H);

  // ---------------------------------------------------------------------
  // Scene graph
  // ---------------------------------------------------------------------
  // worldRoot wraps everything that shakes; HUD stays on app.stage directly.
  const worldRoot = new Container();
  worldRoot.label = 'worldRoot';
  app.stage.addChild(worldRoot);

  const bg = makeArenaBackground();
  worldRoot.addChild(bg);

  const layerGroundFx   = new Container();  // footstep dust, blood
  const layerLoot       = new Container();
  const layerEnemies    = new Container();
  const layerProjectiles= new Container();
  const layerPlayer     = new Container();
  const layerImpactFx   = new Container();  // hit burst, death burst (above enemies)
  const layerFloatText  = new Container();  // damage numbers (top)
  worldRoot.addChild(
    layerGroundFx, layerLoot, layerEnemies, layerProjectiles,
    layerPlayer, layerImpactFx, layerFloatText,
  );

  const player = new Player();
  layerPlayer.addChild(player.container);

  const enemies: Enemy[] = [];
  const projectiles: Projectile[] = [];
  const lootDrops: LootDrop[] = [];

  for (let i = 0; i < TUNE.ENEMY_INITIAL_COUNT; i++) {
    spawnEnemyAtEdge();
  }

  let nextSpawnAt = 0;
  function spawnEnemyAtEdge() {
    if (!canSpawnEnemy()) return;
    const margin = 80;
    const side = (Math.random() * 4) | 0;
    let x = 0, y = 0;
    if (side === 0)      { x = margin + Math.random() * (CANVAS_W - 2 * margin); y = margin; }
    else if (side === 1) { x = CANVAS_W - margin; y = margin + Math.random() * (CANVAS_H - 2 * margin); }
    else if (side === 2) { x = margin + Math.random() * (CANVAS_W - 2 * margin); y = CANVAS_H - margin; }
    else                 { x = margin; y = margin + Math.random() * (CANVAS_H - 2 * margin); }
    const e = new Enemy(x, y);
    enemies.push(e);
    layerEnemies.addChild(e.container);
    sim.enemyCount++;
  }

  const hud = new DebugHud();
  app.stage.addChild(hud.container);

  const title = new Text({
    text: '战斗沙盒 V2 · COMBAT FEEL',
    style: {
      fontFamily: 'Pixelify Sans, monospace',
      fontSize: 13,
      fill: COLOR.hudText,
      letterSpacing: 4,
    },
  });
  title.x = 24; title.y = 22;
  app.stage.addChild(title);

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

    // Global hit-stop freeze
    const dt = isInHitStop(now) ? 0 : Math.min(rawDt, 33);

    // ----- Player + footstep callback -----
    player.update(dt, now, spawnFootstepDust);

    // ----- Player attack (with crit + recoil + spawn FX) -----
    if (isMouseDown(0) && player.canAttack(now) && canSpawnProjectile()) {
      const px = player.x;
      const py = player.y;
      const dx = mouse.world.x - px;
      const dy = mouse.world.y - py;
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
      spawnMuzzleFlash(px + dirX * 20, py + dirY * 20, dirX, dirY);
    }

    // ----- Enemy spawner -----
    if (now >= nextSpawnAt && enemies.filter(e => e.alive).length < 8) {
      spawnEnemyAtEdge();
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
        // Hurt feedback — big shake + brief hit stop
        requestShake(TUNE.SHAKE_HURT, 220, now);
        requestHitStop(TIME.HIT_STOP_HURT, now);
      }
    }

    // ----- Projectiles + collision -----
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.update(dt, now);
      if (p.x < -20 || p.x > CANVAS_W + 20 || p.y < -20 || p.y > CANVAS_H + 20) {
        p.alive = false;
      }
      if (p.alive && p.ownerIsPlayer) {
        for (const e of enemies) {
          if (!e.alive) continue;
          const dxh = e.x - p.x;
          const dyh = e.y - p.y;
          if (dxh * dxh + dyh * dyh <= (TUNE.ENEMY_RADIUS + TUNE.PROJ_RADIUS) ** 2) {
            // ===== CRIT ROLL =====
            const isCrit = Math.random() < TUNE.CRIT_CHANCE;
            const dmg = isCrit ? Math.round(TUNE.PROJ_DAMAGE * TUNE.CRIT_MULT) : TUNE.PROJ_DAMAGE;

            // ===== Damage + knockback =====
            const killed = e.takeDamage(dmg, now, p.dirX, p.dirY, isCrit);

            // ===== Hit-stop + screen shake =====
            requestHitStop(isCrit ? TIME.HIT_STOP_CRIT : TIME.HIT_STOP_NORMAL, now);
            requestShake(isCrit ? TUNE.SHAKE_CRIT : TUNE.SHAKE_HIT, isCrit ? 220 : 110, now);

            // ===== Impact frame + damage number =====
            spawnImpactBurst(e.x, e.y, isCrit);
            spawnDamageNumber(e.x, e.y - 16, dmg, isCrit);

            p.alive = false;

            // ===== Death =====
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

    // ----- VFX update -----
    for (const v of vfxList) v.update(dt, now);
    // ----- Damage numbers update -----
    for (const d of dmgList) d.update(dt, now);

    for (const l of lootDrops) l.update(dt, now);

    // ----- Cleanup dead entities -----
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

    // ----- Apply screen shake to world (HUD unaffected) -----
    applyShake(worldRoot, now);

    hud.update();
    endFrameInput();
  });

  // ---------------------------------------------------------------------
  // VFX systems
  // ---------------------------------------------------------------------
  type Vfx = {
    container: Container, alive: boolean, spawnAt: number,
    update: (dt: number, now: number) => void,
  };
  const vfxList: Vfx[] = [];

  /** Pixel impact burst — hard step frame at hit point. White, or gold on crit. */
  function spawnImpactBurst(x: number, y: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const c = isCrit ? 0xFFFFFF : 0xF4F2E8;
    const rim = isCrit ? COLOR.tier1 : 0xD2D6DC;
    const g = new Graphics();
    // chunky pixel cross + outer ring (single frame, scales out)
    g.rect(-4, -1, 8, 2).fill(c);
    g.rect(-1, -4, 2, 8).fill(c);
    g.rect(-7, -2, 3, 4).fill(rim);
    g.rect(4, -2, 3, 4).fill(rim);
    g.rect(-2, -7, 4, 3).fill(rim);
    g.rect(-2, 4, 4, 3).fill(rim);
    cnt.addChild(g);
    const lifeMs = TIME.IMPACT_FRAME;
    const vfx: Vfx = {
      container: cnt, alive: true, spawnAt: performance.now(),
      update(_dt: number, n: number) {
        const t = (n - this.spawnAt) / lifeMs;
        if (t >= 1) { this.alive = false; return; }
        cnt.scale.set(1 + t * 0.8);
        cnt.alpha = 1 - t;
      },
    };
    vfxList.push(vfx);
    sim.vfxCount++;
  }

  /** Death burst — bigger particle scatter + squash + expanding banded ring. */
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
    // Expanding banded ring on top
    const ring = new Graphics();
    cnt.addChild(ring);

    const vfx: Vfx = {
      container: cnt, alive: true, spawnAt: now,
      update(dtMs: number, n: number) {
        const t = (n - this.spawnAt) / TIME.DEATH_BURST;
        if (t >= 1) { this.alive = false; return; }
        const dt = dtMs / 1000;
        for (const p of particles) {
          p.g.x += p.vx * dt;
          p.g.y += p.vy * dt;
          p.g.alpha = Math.max(0, 1 - t * 1.4);
          p.vx *= 0.90;
          p.vy *= 0.90;
        }
        // Ring expands then fades — banded (3 hard concentric pixel circles)
        ring.clear();
        const r = 8 + t * 56;
        const rcol = isCrit ? COLOR.tier1 : 0xD6DBE3;
        const a = Math.max(0, 1 - t * 1.6);
        for (let k = 0; k < 3; k++) {
          ring.circle(0, 0, r + k * 2).stroke({ color: rcol, width: 1, alpha: a * (1 - k * 0.25) });
        }
      },
    };
    vfxList.push(vfx);
    sim.vfxCount++;
  }

  /** Muzzle flash — small white pixel cross at shot origin. */
  function spawnMuzzleFlash(x: number, y: number, _dirX: number, _dirY: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const g = new Graphics()
      .rect(-3, -1, 6, 2).fill(0xFFFFFF)
      .rect(-1, -3, 2, 6).fill(0xFFFFFF);
    cnt.addChild(g);
    const life = 70;
    const start = performance.now();
    const vfx: Vfx = {
      container: cnt, alive: true, spawnAt: start,
      update(_dt: number, n: number) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.alpha = 1 - t;
        cnt.scale.set(1 + t * 0.4);
      },
    };
    vfxList.push(vfx);
  }

  /** Footstep dust — small pixel beneath the player when moving. */
  function spawnFootstepDust(x: number, y: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerGroundFx.addChild(cnt);
    const g = new Graphics()
      .rect(-2, -1, 4, 2).fill({ color: 0xAAB0BA, alpha: 0.42 });
    cnt.addChild(g);
    const start = performance.now();
    const life = 280;
    const vfx: Vfx = {
      container: cnt, alive: true, spawnAt: start,
      update(_dt: number, n: number) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.alpha = (1 - t) * 0.5;
        cnt.scale.x = 1 + t * 0.6;
      },
    };
    vfxList.push(vfx);
  }

  // ---------------------------------------------------------------------
  // Damage numbers
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
    const dn: DmgNum = {
      container: cnt, alive: true, spawnAt: start,
      update(_dt: number, n: number) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.y = Math.round(y - t * drift);
        cnt.x = Math.round(x + wob * t);
        cnt.alpha = t < 0.85 ? 1 : (1 - t) / 0.15;
      },
    };
    dmgList.push(dn);
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

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function makeArenaBackground(): Container {
  const c = new Container();
  const bg = new Graphics();
  const rings = [
    { r: 0,    c: 0x14181E },
    { r: 320,  c: 0x0E1116 },
    { r: 640,  c: 0x0A0C10 },
    { r: 960,  c: 0x06080B },
  ];
  for (let i = 0; i < rings.length; i++) {
    bg.circle(CANVAS_W / 2, CANVAS_H / 2, rings[i].r + 320).fill(rings[i].c);
  }
  c.addChild(bg);

  const horizon = new Graphics();
  for (let x = 0; x < CANVAS_W; x += 32) {
    horizon.rect(x, 540, 16, 4).fill(0x16181D);
  }
  horizon.rect(0, 568, CANVAS_W, 2).fill({ color: 0x2A2E35, alpha: 0.55 });
  c.addChild(horizon);

  const ground = new Graphics();
  for (let yi = 572; yi < CANVAS_H; yi += 96) {
    ground.rect(0, yi + 60, CANVAS_W, 2).fill({ color: 0x282C34, alpha: 0.18 });
  }
  c.addChild(ground);

  const wallW = 6;
  const wallC = COLOR.frameRim;
  const wall = new Graphics()
    .rect(0, 0, CANVAS_W, wallW).fill(wallC)
    .rect(0, CANVAS_H - wallW, CANVAS_W, wallW).fill(wallC)
    .rect(0, 0, wallW, CANVAS_H).fill(wallC)
    .rect(CANVAS_W - wallW, 0, wallW, CANVAS_H).fill(wallC);
  c.addChild(wall);

  return c;
}

function fitCanvas(canvas: HTMLCanvasElement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
  canvas.style.width = (CANVAS_W * scale) + 'px';
  canvas.style.height = (CANVAS_H * scale) + 'px';
}
