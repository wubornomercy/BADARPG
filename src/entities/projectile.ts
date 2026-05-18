/**
 * Player projectile — primary attack. Step 2 will add enemy / corruption variants.
 * Visual language per Phase 2 spec:
 *  - brighter core
 *  - tighter silhouette
 *  - cleaner trails (4 trail rectangles, decreasing alpha)
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

  // Trail history (last 4 positions)
  private trailHistory: { x: number, y: number }[] = [];

  constructor(x: number, y: number, vx: number, vy: number, spawnAt: number, ownerIsPlayer = true) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.spawnAt = spawnAt;
    this.ownerIsPlayer = ownerIsPlayer;

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
    // chunky pixel diamond — bright core + outer halo
    g.rect(-1, -3, 2, 6).fill(core);
    g.rect(-3, -1, 6, 2).fill(core);
    g.rect(-1, -4, 2, 1).fill(halo);
    g.rect(-1, 3, 2, 1).fill(halo);
    g.rect(-4, -1, 1, 2).fill(halo);
    g.rect(3, -1, 1, 2).fill(halo);
  }

  update(dtMs: number, now: number) {
    if (!this.alive) return;
    const dt = dtMs / 1000;

    // record current pos to trail (max 4 segments)
    this.trailHistory.unshift({ x: this.x, y: this.y });
    if (this.trailHistory.length > 4) this.trailHistory.pop();

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // lifespan
    if (now - this.spawnAt > TUNE.PROJ_LIFE) {
      this.alive = false;
      return;
    }

    // draw trail (hard pixel rectangles, descending alpha — no smooth gradient)
    const t = this.trail;
    t.clear();
    const halo = this.ownerIsPlayer ? COLOR.projPlayerTrail : COLOR.projEnemyTrail;
    for (let i = 0; i < this.trailHistory.length; i++) {
      const p = this.trailHistory[i];
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const alpha = 0.7 - i * 0.16;
      const size = 4 - i;
      t.rect(dx - size / 2, dy - size / 2, size, size).fill({ color: halo, alpha });
    }

    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }
}
