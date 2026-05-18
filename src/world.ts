/**
 * World — 3200x3200 corrupted forgotten battlefield arena.
 * Pixel ground tiles + corruption zones + ruined structures.
 * Per Phase 2A spec: dark stone, cracked terrain, corruption veins,
 * sparse pixel fog. NO realistic forests, no MMO grasslands.
 */
import { Container, Graphics } from 'pixi.js';
import { WORLD_W, WORLD_H, ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_HALF, COLOR, TUNE } from './tokens.js';

/** Corruption zone — purple-black banded circle, animated edge */
export interface CorruptionZone {
  x: number;
  y: number;
  radius: number;
  container: Container;
  inner: Graphics;
  outer: Graphics;
  lastDotTick: number;
}

export const corruptionZones: CorruptionZone[] = [];

/**
 * Build the entire world background. Returns a Container that lives at
 * world-coordinates (no camera translation applied here).
 */
export function buildWorld(): Container {
  const world = new Container();
  world.label = 'world';

  // ----- Ground base: deep desaturated charcoal -----
  const base = new Graphics()
    .rect(0, 0, WORLD_W, WORLD_H).fill(0x0E1116);
  world.addChild(base);

  // ----- Banded radial ambient — slightly brighter at arena center -----
  const ambient = new Graphics();
  const rings = [
    { r: 0,    c: 0x1A1E26 },
    { r: 200,  c: 0x161A22 },
    { r: 500,  c: 0x12151C },
    { r: 900,  c: 0x0E1116 },
    { r: 1400, c: 0x0A0C10 },
  ];
  for (const ring of rings) {
    ambient.circle(ARENA_CENTER_X, ARENA_CENTER_Y, ring.r + 220).fill(ring.c);
  }
  world.addChild(ambient);

  // ----- Cracked terrain — chunky pixel cracks scattered -----
  const cracks = new Graphics();
  // seeded-ish placement; pixel-aligned
  const crackPoints: [number, number, number][] = [
    // x, y, length
    [1100, 1280, 80], [1340, 1820, 64], [1820, 1500, 96],
    [1980, 1180, 72], [1520, 2040, 88], [1280, 1500, 56],
    [1740, 1700, 60], [2080, 1620, 84], [1180, 1900, 70],
    [1620, 1240, 52], [2180, 1380, 64], [1420, 1740, 76],
  ];
  for (const [cx, cy, len] of crackPoints) {
    drawPixelCrack(cracks, cx, cy, len);
  }
  world.addChild(cracks);

  // ----- Dead grass tufts — sparse, 1-2 px gray-green pixels -----
  const grass = new Graphics();
  for (let i = 0; i < 240; i++) {
    const x = Math.floor(Math.random() * WORLD_W);
    const y = Math.floor(Math.random() * WORLD_H);
    // bias toward arena edges
    const distFromCenter = Math.hypot(x - ARENA_CENTER_X, y - ARENA_CENTER_Y);
    if (distFromCenter < 240) continue;
    grass.rect(x, y, 2, 2).fill({ color: 0x3A4039, alpha: 0.55 });
  }
  world.addChild(grass);

  // ----- Ruined structures — chunky pixel debris around the periphery -----
  const ruins = new Graphics();
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = ARENA_HALF + 200 + Math.random() * 600;
    const x = Math.round(ARENA_CENTER_X + Math.cos(angle) * dist);
    const y = Math.round(ARENA_CENTER_Y + Math.sin(angle) * dist);
    drawPixelRuin(ruins, x, y);
  }
  world.addChild(ruins);

  // ----- Corruption veins — purple-black streaks bleeding from corruption pits -----
  const veins = new Graphics();
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 600 + Math.random() * 900;
    const x = Math.round(ARENA_CENTER_X + Math.cos(angle) * dist);
    const y = Math.round(ARENA_CENTER_Y + Math.sin(angle) * dist);
    drawCorruptionVein(veins, x, y, angle);
  }
  world.addChild(veins);

  // ----- Arena center marker — subtle chunky pixel ring -----
  const arenaRing = new Graphics();
  for (let r = ARENA_HALF; r <= ARENA_HALF + 8; r += 4) {
    arenaRing.circle(ARENA_CENTER_X, ARENA_CENTER_Y, r)
      .stroke({ color: 0x2A2E35, width: 1, alpha: 0.4 });
  }
  world.addChild(arenaRing);

  // ----- World border walls — chunky pixel frame -----
  const border = new Graphics();
  const wallC = COLOR.frameRim;
  const wallW = 12;
  border.rect(0, 0, WORLD_W, wallW).fill(wallC)
        .rect(0, WORLD_H - wallW, WORLD_W, wallW).fill(wallC)
        .rect(0, 0, wallW, WORLD_H).fill(wallC)
        .rect(WORLD_W - wallW, 0, wallW, WORLD_H).fill(wallC);
  world.addChild(border);

  return world;
}

/**
 * Spawn the 3 corruption zones (purple-black pixel circles).
 * Returns a Container of all zones for adding to the world.
 */
export function spawnCorruptionZones(): Container {
  const layer = new Container();
  layer.label = 'corruption-zones';

  // Hand-placed scattered around arena edges for combat readability
  const placements: [number, number][] = [
    [ARENA_CENTER_X - 540, ARENA_CENTER_Y - 380],
    [ARENA_CENTER_X + 600, ARENA_CENTER_Y + 240],
    [ARENA_CENTER_X - 120, ARENA_CENTER_Y + 620],
  ];

  for (const [x, y] of placements) {
    const radius = TUNE.CORRUPTION_ZONE_RADIUS;
    const cnt = new Container();
    cnt.x = x; cnt.y = y;
    cnt.label = 'corruption-zone';

    // Outer banded edge — 3 concentric hard pixel rings (no blur)
    const outer = new Graphics();
    for (let k = 0; k < 5; k++) {
      const rr = radius - k * 6;
      const a  = 0.20 - k * 0.03;
      outer.circle(0, 0, rr).fill({ color: COLOR.corruption, alpha: a });
    }
    cnt.addChild(outer);

    // Inner pulse layer
    const inner = new Graphics()
      .circle(0, 0, radius * 0.45)
      .fill({ color: COLOR.corruptionHi, alpha: 0.16 });
    cnt.addChild(inner);

    // Center skull-pit marker (4 dark pixels)
    const pit = new Graphics();
    pit.rect(-3, -3, 2, 2).fill(0x0A0C10);
    pit.rect(1, -3, 2, 2).fill(0x0A0C10);
    pit.rect(-3, 1, 2, 2).fill(0x0A0C10);
    pit.rect(1, 1, 2, 2).fill(0x0A0C10);
    cnt.addChild(pit);

    layer.addChild(cnt);
    corruptionZones.push({
      x, y, radius,
      container: cnt, inner, outer,
      lastDotTick: 0,
    });
  }

  return layer;
}

/**
 * Update corruption zones (pulse animation + check player damage).
 * Returns total DOT damage to apply to player this tick (0 if not standing in one).
 */
export function updateCorruptionZones(now: number, playerX: number, playerY: number): number {
  let dot = 0;
  for (const z of corruptionZones) {
    // Pulse animation — opacity sine wave at low frequency
    const t = (now / 1800) + (z.x * 0.001);
    const pulse = 0.5 + Math.sin(t) * 0.5;
    z.inner.alpha = 0.10 + pulse * 0.10;
    z.outer.alpha = 0.85 + pulse * 0.15;

    // DOT check
    const dx = playerX - z.x;
    const dy = playerY - z.y;
    if (dx * dx + dy * dy <= z.radius * z.radius) {
      if (now - z.lastDotTick >= TUNE.CORRUPTION_ZONE_DOT_TICK) {
        dot += TUNE.CORRUPTION_ZONE_DOT;
        z.lastDotTick = now;
      }
    }
  }
  return dot;
}

// =========================================================================
// Pixel art helpers
// =========================================================================
function drawPixelCrack(g: Graphics, x: number, y: number, length: number) {
  // chunky stair-step crack — random ±1 direction each segment
  let px = x, py = y;
  const dir = Math.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < length; i += 4) {
    g.rect(px, py, 2, 2).fill(0x080A0E);
    px += dir * 2;
    py += (Math.random() < 0.5 ? 2 : -2);
  }
}

function drawPixelRuin(g: Graphics, x: number, y: number) {
  // Small chunky block — varied size
  const w = 8 + Math.floor(Math.random() * 4) * 4;
  const h = 6 + Math.floor(Math.random() * 3) * 4;
  g.rect(x, y, w, h).fill(0x16181D);
  g.rect(x, y, w, 2).fill(0x2A2E35);
  // crack on top
  g.rect(x + Math.floor(w / 3), y - 2, 2, 4).fill(0x0A0C10);
}

function drawCorruptionVein(g: Graphics, x: number, y: number, angle: number) {
  // 3-4 chunky pixel dashes in a line
  const len = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < len; i++) {
    const dx = Math.cos(angle) * i * 4;
    const dy = Math.sin(angle) * i * 4;
    g.rect(Math.round(x + dx), Math.round(y + dy), 2, 2).fill(COLOR.corruption);
  }
}
