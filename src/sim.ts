/**
 * Sim — central counters, boundary enforcement, and debug overlay.
 * Per Phase 2 Step 5: hard caps that prevent design runaway.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { COLOR, SIM_BOUNDS, CANVAS_W } from './tokens.js';

export const sim = {
  projectileCount: 0,
  enemyCount: 0,
  vfxCount: 0,
  // Telemetry
  fps: 0,
  frameMs: 0,
  // Combat tallies
  kills: 0,
  lootDrops: 0,
};

/**
 * Can we spawn another projectile this frame?
 * Caller must increment sim.projectileCount itself after spawn,
 * and decrement when the projectile is destroyed.
 */
export function canSpawnProjectile(): boolean {
  return sim.projectileCount < SIM_BOUNDS.MAX_PROJECTILES_ON_SCREEN;
}
export function canSpawnEnemy(): boolean {
  return sim.enemyCount < SIM_BOUNDS.MAX_ACTIVE_ENEMIES;
}
export function canSpawnMajorVfx(): boolean {
  return sim.vfxCount < SIM_BOUNDS.MAX_MAJOR_VFX;
}

// =========================================================================
// Debug HUD — top-right corner overlay
// =========================================================================
export class DebugHud {
  container: Container;
  bg: Graphics;
  textFps: Text;
  textCounts: Text;
  textBounds: Text;
  textControls: Text;

  constructor() {
    this.container = new Container();
    this.container.label = 'debugHud';
    this.container.x = CANVAS_W - 360;
    this.container.y = 20;

    this.bg = new Graphics()
      .rect(0, 0, 340, 152).fill({ color: 0x07090D, alpha: 0.78 })
      .rect(0, 0, 340, 152).stroke({ color: COLOR.frameRim, width: 2 });
    this.container.addChild(this.bg);

    const STYLE = {
      fontFamily: 'Pixelify Sans, monospace',
      fontSize: 14,
      fill: COLOR.hudText,
    };

    this.textFps = new Text({
      text: '',
      style: { ...STYLE, fontSize: 16, fill: COLOR.tier1, fontWeight: '700' },
    });
    this.textFps.x = 12; this.textFps.y = 10;
    this.container.addChild(this.textFps);

    this.textCounts = new Text({
      text: '',
      style: { ...STYLE, fontSize: 13, fill: COLOR.hudTextDim },
    });
    this.textCounts.x = 12; this.textCounts.y = 36;
    this.container.addChild(this.textCounts);

    this.textBounds = new Text({
      text: '',
      style: { ...STYLE, fontSize: 11, fill: COLOR.hudTextDim, letterSpacing: 1 },
    });
    this.textBounds.x = 12; this.textBounds.y = 88;
    this.container.addChild(this.textBounds);

    this.textControls = new Text({
      text: 'LMB 移动  ·  RMB 攻击  ·  Space 翻滚',
      style: { ...STYLE, fontSize: 11, fill: COLOR.hudTextDim, letterSpacing: 1 },
    });
    this.textControls.x = 12; this.textControls.y = 124;
    this.container.addChild(this.textControls);
  }

  update() {
    this.textFps.text = `FPS  ${sim.fps.toFixed(0).padStart(3)}   ${sim.frameMs.toFixed(1)}ms`;
    this.textCounts.text =
      `投射物  ${sim.projectileCount.toString().padStart(2)} / ${SIM_BOUNDS.MAX_PROJECTILES_ON_SCREEN}\n` +
      `敌人      ${sim.enemyCount.toString().padStart(2)} / ${SIM_BOUNDS.MAX_ACTIVE_ENEMIES}\n` +
      `击杀      ${sim.kills.toString().padStart(2)}    战利品  ${sim.lootDrops}`;
    this.textBounds.text =
      `BOUNDS  CHAIN ${SIM_BOUNDS.MAX_CHAIN_DEPTH} · TRIGGER ${SIM_BOUNDS.MAX_TRIGGER_DEPTH} · VFX ${SIM_BOUNDS.MAX_MAJOR_VFX}`;
  }
}
