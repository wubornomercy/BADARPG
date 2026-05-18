/**
 * Enemy entity — placeholder wraith. Moves toward player; takes hits; dies.
 * Phase 2 V1: single enemy type. More types added in subsequent commits.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE, TIME } from '../tokens.js';

export class Enemy {
  container: Container;
  body: Graphics;
  shadow: Graphics;
  eyes: Graphics;

  x: number;
  y: number;
  vx = 0; vy = 0;
  hp: number = TUNE.ENEMY_HP;
  hpMax: number = TUNE.ENEMY_HP;
  alive = true;
  hitFlashUntil = 0;
  contactReadyAt = 0;
  staggerUntil = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.label = 'enemy';

    this.shadow = new Graphics()
      .ellipse(0, 14, 16, 4)
      .fill({ color: 0x000000, alpha: 0.5 });
    this.container.addChild(this.shadow);

    // Body — chunky wraith silhouette
    this.body = new Graphics();
    this.drawBody(0);
    this.container.addChild(this.body);

    // Eyes — 2 red dots that always read as "threat"
    this.eyes = new Graphics();
    this.eyes.rect(-4, -8, 2, 2).fill(0xB2383F);
    this.eyes.rect(2, -8, 2, 2).fill(0xB2383F);
    this.container.addChild(this.eyes);
  }

  private drawBody(hitAlpha: number) {
    const g = this.body;
    g.clear();
    const base = COLOR.enemy;
    const lit = COLOR.enemyHit;
    // Wraith shape — chunky pixel polygon
    g.rect(-6, -12, 12, 4).fill(base);    // head
    g.rect(-8, -8, 16, 14).fill(base);    // torso
    g.rect(-10, -2, 4, 8).fill(base);     // arm L
    g.rect(6, -2, 4, 8).fill(base);       // arm R
    g.rect(-6, 6, 4, 8).fill(base);       // tail L
    g.rect(2, 6, 4, 8).fill(base);        // tail R
    // Threat aura (low saturation banded ring)
    g.rect(-9, -13, 18, 1).fill({ color: 0xB2383F, alpha: 0.20 });
    g.rect(-9, 14, 18, 1).fill({ color: 0xB2383F, alpha: 0.20 });
    if (hitAlpha > 0) {
      g.rect(-10, -14, 20, 30).fill({ color: lit, alpha: hitAlpha });
    }
  }

  update(dtMs: number, now: number, target: { x: number, y: number }) {
    if (!this.alive) return;
    const dt = dtMs / 1000;

    // Movement: simple seek toward player
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    const staggered = now < this.staggerUntil;
    const speed = staggered ? TUNE.ENEMY_SPEED * 0.25 : TUNE.ENEMY_SPEED;
    if (dist > 1) {
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    } else {
      this.vx = this.vy = 0;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Render
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);

    // Hit flash decay
    if (now < this.hitFlashUntil) {
      const t = (this.hitFlashUntil - now) / 120;
      this.drawBody(t);
    } else {
      this.drawBody(0);
    }
  }

  takeDamage(amount: number, now: number) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlashUntil = now + 120;
    this.staggerUntil = now + 80;
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  canContact(now: number): boolean {
    return now >= this.contactReadyAt;
  }
  applyContactCooldown(now: number) {
    this.contactReadyAt = now + TUNE.ENEMY_CONTACT_CD;
  }
}
