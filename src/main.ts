/**
 * BAD ARPG — Combat Sandbox Foundation (Phase 2, Step 1 + Step 5)
 * Entry point. Bootstraps Pixi, creates the arena scene, runs the loop.
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import { CANVAS_W, CANVAS_H, COLOR, TUNE } from './tokens.js';
import { initInput, endFrameInput, mouse, isMouseDown } from './input.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile } from './entities/projectile.js';
import { LootDrop } from './entities/loot.js';
import { DebugHud, sim, canSpawnProjectile, canSpawnEnemy } from './sim.js';

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
  // Force nearest-neighbor scaling for pixel-perfect appearance
  app.renderer.canvas.style.imageRendering = 'pixelated';

  const stage = document.getElementById('stage')!;
  stage.appendChild(app.canvas);
  fitCanvas(app.canvas as HTMLCanvasElement);
  window.addEventListener('resize', () => fitCanvas(app.canvas as HTMLCanvasElement));

  initInput(app.canvas as HTMLCanvasElement, CANVAS_W, CANVAS_H);

  // ---------------------------------------------------------------------
  // Scene graph
  // ---------------------------------------------------------------------
  const worldRoot = new Container();
  app.stage.addChild(worldRoot);

  // World background — banded radial like the Phase 1 inventory/loot bg
  const bg = makeArenaBackground();
  worldRoot.addChild(bg);

  // Layer order: ground → loot → enemies → projectiles → player → hud
  const layerLoot = new Container();
  const layerEnemies = new Container();
  const layerProjectiles = new Container();
  const layerPlayer = new Container();
  const layerVfx = new Container();
  worldRoot.addChild(layerLoot, layerEnemies, layerProjectiles, layerPlayer, layerVfx);

  // Player
  const player = new Player();
  layerPlayer.addChild(player.container);

  // Entity lists
  const enemies: Enemy[] = [];
  const projectiles: Projectile[] = [];
  const lootDrops: LootDrop[] = [];

  // Seed some enemies
  for (let i = 0; i < TUNE.ENEMY_INITIAL_COUNT; i++) {
    spawnEnemyAtEdge();
  }

  // Spawner
  let nextSpawnAt = 0;
  function spawnEnemyAtEdge() {
    if (!canSpawnEnemy()) return;
    // Spawn at arena edge, away from player
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

  // Debug HUD
  const hud = new DebugHud();
  app.stage.addChild(hud.container);

  // Title overlay
  const title = new Text({
    text: '战斗沙盒 V1 · COMBAT SANDBOX',
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
  let hitStopUntil = 0;

  app.ticker.add(() => {
    const now = performance.now();
    const rawDt = now - lastTime;
    lastTime = now;

    // FPS aggregator
    fpsAccum += rawDt; fpsFrames++; fpsTimer += rawDt;
    if (fpsTimer >= 250) {
      sim.fps = (fpsFrames / fpsAccum) * 1000;
      sim.frameMs = fpsAccum / fpsFrames;
      fpsAccum = 0; fpsFrames = 0; fpsTimer = 0;
    }

    // Hit-stop: freeze world dt while in hitstop window (combat feel)
    const inHitStop = now < hitStopUntil;
    const dt = inHitStop ? 0 : Math.min(rawDt, 33);  // clamp to 30fps min

    // ----- Player -----
    player.update(dt, now);

    // ----- Player attack -----
    if (isMouseDown(0) && player.canAttack(now) && canSpawnProjectile()) {
      const px = player.x;
      const py = player.y;
      const dx = mouse.world.x - px;
      const dy = mouse.world.y - py;
      const mag = Math.hypot(dx, dy) || 1;
      const vx = (dx / mag) * TUNE.PROJ_SPEED;
      const vy = (dy / mag) * TUNE.PROJ_SPEED;
      const p = new Projectile(px, py, vx, vy, now, true);
      projectiles.push(p);
      layerProjectiles.addChild(p.container);
      sim.projectileCount++;
      player.consumeAttack(now);
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

      // Contact damage
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < TUNE.PLAYER_RADIUS + TUNE.ENEMY_RADIUS && e.canContact(now)) {
        player.takeDamage(TUNE.ENEMY_DAMAGE, now);
        e.applyContactCooldown(now);
      }
    }

    // ----- Projectiles + collision -----
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.update(dt, now);
      // Bounds check
      if (p.x < -20 || p.x > CANVAS_W + 20 || p.y < -20 || p.y > CANVAS_H + 20) {
        p.alive = false;
      }
      // Collision against enemies
      if (p.alive && p.ownerIsPlayer) {
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          if (dx * dx + dy * dy <= (TUNE.ENEMY_RADIUS + TUNE.PROJ_RADIUS) ** 2) {
            e.takeDamage(TUNE.PROJ_DAMAGE, now);
            p.alive = false;
            // Hit stop for combat feel
            hitStopUntil = now + 30;
            if (!e.alive) {
              // Death burst + loot drop
              spawnDeathBurst(e.x, e.y, now);
              sim.kills++;
              dropLoot(e.x, e.y, now);
            }
            break;
          }
        }
      }
    }

    // ----- VFX (death bursts) update -----
    for (const v of vfxList) v.update(dt, now);

    // ----- Loot -----
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
        sim.vfxCount--;
      }
    }

    // ----- Debug HUD -----
    hud.update();

    endFrameInput();
  });

  // ---------------------------------------------------------------------
  // VFX — pixel death burst
  // ---------------------------------------------------------------------
  type Vfx = {
    container: Container, alive: boolean, spawnAt: number,
    update: (dt: number, now: number) => void,
  };
  const vfxList: Vfx[] = [];

  function spawnDeathBurst(x: number, y: number, now: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerVfx.addChild(cnt);
    const particles: { g: Graphics, vx: number, vy: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 240;
      const g = new Graphics().rect(-2, -2, 4, 4).fill(COLOR.enemyHit);
      cnt.addChild(g);
      particles.push({ g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
    const vfx: Vfx = {
      container: cnt, alive: true, spawnAt: now,
      update(dtMs: number, n: number) {
        const t = (n - this.spawnAt) / 1000;
        if (t > 0.5) { this.alive = false; return; }
        const dt = dtMs / 1000;
        for (const p of particles) {
          p.g.x += p.vx * dt;
          p.g.y += p.vy * dt;
          p.g.alpha = Math.max(0, 1 - t * 2);
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
      },
    };
    vfxList.push(vfx);
    sim.vfxCount++;
  }

  function dropLoot(x: number, y: number, now: number) {
    // Phase 2 V1: 3 rarities only. Weighted toward normal.
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
  // Banded radial — same language as Phase 1 inventory/loot bg
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
  // Wipe the corners (since banded radial is a square canvas)
  bg.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x06080B, alpha: 0 });
  c.addChild(bg);

  // Horizon hairline at Y=540 — same as loot.css
  const horizon = new Graphics();
  for (let x = 0; x < CANVAS_W; x += 32) {
    horizon.rect(x, 540, 16, 4).fill(0x16181D);
  }
  horizon.rect(0, 568, CANVAS_W, 2).fill({ color: 0x2A2E35, alpha: 0.55 });
  c.addChild(horizon);

  // Subtle ground texture banded stripes
  const ground = new Graphics();
  for (let yi = 572; yi < CANVAS_H; yi += 96) {
    ground.rect(0, yi + 60, CANVAS_W, 2).fill({ color: 0x282C34, alpha: 0.18 });
  }
  c.addChild(ground);

  // Arena walls (chunky pixel border)
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
  // Uniform fit-to-viewport (CSS scale only; canvas internal stays 1920x1080)
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
  canvas.style.width = (CANVAS_W * scale) + 'px';
  canvas.style.height = (CANVAS_H * scale) + 'px';
}
