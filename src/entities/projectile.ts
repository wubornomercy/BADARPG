/**
 * Player projectile — Combat Feel V2.
 * Bigger core, stronger contrast pixel trail, longer history for sense
 * of speed.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE } from '../tokens.js';

export class Projectile {
  container: Container;
  body: Graphics;
  trail: Graphics;

  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnAt: number;
  alive = true;
  ownerIsPlayer: boolean;

  // direction unit vector (for ricochet / FX hooks)
  dirX: number;
  dirY: number;

  private trailHistory: { x: number, y: number }[] = [];

  constructor(x: number, y: number, vx: number, vy: number, spawnAt: number, ownerIsPlayer = true) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.spawnAt = spawnAt;
    this.ownerIsPlayer = ownerIsPlayer;

    const mag = Math.hypot(vx, vy) || 1;
    this.dirX = vx / mag;
    this.dirY = vy / mag;

    this.container = new Container();
    this.container.label = 'proj';

    this.trail = new Graphics();
    this.container.addChild(this.trail);

    this.body = new Graphics();
    this.drawBody();
    this.container.addChild(this.body);
  }

  private drawBody() {
    const g = this.body;
    g.clear();
    const core = this.ownerIsPlayer ? COLOR.projPlayer : COLOR.projEnemy;
    const halo = this.ownerIsPlayer ? COLOR.projPlayerTrail : COLOR.projEnemyTrail;
    // chunkier pixel diamond — bigger core for weight
    g.rect(-1, -4, 2, 8).fill(core);
    g.rect(-4, -1, 8, 2).fill(core);
    // halo cross
    g.rect(-1, -5, 2, 1).fill(halo);
    g.rect(-1, 4, 2, 1).fill(halo);
    g.rect(-5, -1, 1, 2).fill(halo);
    g.rect(4, -1, 1, 2).fill(halo);
    // hot center pixel
    g.rect(-1, -1, 2, 2).fill(0xFFFFFF);
  }

  update(dtMs: number, now: number) {
    if (!this.alive) return;
    const dt = dtMs / 1000;

    // longer trail history for speed sense
    this.trailHistory.unshift({ x: this.x, y: this.y });
    if (this.trailHistory.length > 6) this.trailHistory.pop();

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (now - this.spawnAt > TUNE.PROJ_LIFE) {
      this.alive = false;
      return;
    }

    // Stronger contrast pixel trail
    const t = this.trail;
    t.clear();
    const halo = this.ownerIsPlayer ? COLOR.projPlayerTrail : COLOR.projEnemyTrail;
    for (let i = 0; i < this.trailHistory.length; i++) {
      const p = this.trailHistory[i];
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const alpha = 0.85 - i * 0.13;
      const size = 5 - i;
      if (size <= 0) continue;
      t.rect(dx - size / 2, dy - size / 2, size, size).fill({ color: halo, alpha });
    }

    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }
}
