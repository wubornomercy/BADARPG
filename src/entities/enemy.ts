/**
 * Enemy entity — Combat Feel V2
 * Knockback velocity field, longer stagger, death squash scale on the
 * frame of death.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE } from '../tokens.js';

export class Enemy {
  container: Container;
  body: Graphics;
  shadow: Graphics;
  eyes: Graphics;

  /** CombatEntity contract: stable id for pipeline events. Assigned externally. */
  id: string = '';

  x: number;
  y: number;
  vx = 0; vy = 0;
  hp: number = TUNE.ENEMY_HP;
  hpMax: number = TUNE.ENEMY_HP;
  alive = true;
  hitFlashUntil = 0;
  contactReadyAt = 0;
  staggerUntil = 0;

  // Knockback impulse (separate from AI velocity, decays per-frame)
  knockVx = 0;
  knockVy = 0;

  // Death squash flag — main loop reads this to play burst
  diedThisFrame = false;
  lastDamageDir = { x: 0, y: 0 };
  lastWasCrit = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.label = 'enemy';

    this.shadow = new Graphics()
      .ellipse(0, 14, 14, 4)
      .fill({ color: 0x000000, alpha: 0.55 });
    this.container.addChild(this.shadow);

    this.body = new Graphics();
    this.drawBody(0);
    this.container.addChild(this.body);

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
    g.rect(-6, -12, 12, 4).fill(base);
    g.rect(-8, -8, 16, 14).fill(base);
    g.rect(-10, -2, 4, 8).fill(base);
    g.rect(6, -2, 4, 8).fill(base);
    g.rect(-6, 6, 4, 8).fill(base);
    g.rect(2, 6, 4, 8).fill(base);
    g.rect(-9, -13, 18, 1).fill({ color: 0xB2383F, alpha: 0.20 });
    g.rect(-9, 14, 18, 1).fill({ color: 0xB2383F, alpha: 0.20 });
    if (hitAlpha > 0) {
      g.rect(-10, -14, 20, 30).fill({ color: lit, alpha: hitAlpha });
    }
  }

  update(dtMs: number, now: number, target: { x: number, y: number }) {
    if (!this.alive) return;
    const dt = dtMs / 1000;

    // Knockback decays exponentially each frame
    const decay = Math.min(1, TUNE.ENEMY_KNOCKBACK_DECAY * dt);
    this.knockVx -= this.knockVx * decay;
    this.knockVy -= this.knockVy * decay;

    // AI movement: seek toward player (suppressed during stagger)
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    const staggered = now < this.staggerUntil;
    const speed = staggered ? TUNE.ENEMY_SPEED * 0.12 : TUNE.ENEMY_SPEED;
    if (dist > 1) {
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    } else {
      this.vx = this.vy = 0;
    }

    // Combine AI + knockback velocity
    this.x += (this.vx + this.knockVx) * dt;
    this.y += (this.vy + this.knockVy) * dt;

    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);

    if (now < this.hitFlashUntil) {
      const t = Math.min(1, (this.hitFlashUntil - now) / 140);
      this.drawBody(t);
    } else {
      this.drawBody(0);
    }
  }

  /**
   * Apply hit-feedback (flash, stagger, knockback). HP/alive are owned
   * by DamagePipeline — call this AFTER pipeline.resolve() has applied
   * its damage. Pure presentation/AI reaction; no math.
   */
  applyHitReactions(now: number, dirX: number, dirY: number, isCrit: boolean): void {
    this.hitFlashUntil = now + (isCrit ? 220 : 140);
    this.staggerUntil = now + (isCrit ? TUNE.ENEMY_STAGGER_CRIT : TUNE.ENEMY_STAGGER_NORMAL);
    const kb = isCrit ? TUNE.ENEMY_KNOCKBACK_CRIT : TUNE.ENEMY_KNOCKBACK;
    this.knockVx += dirX * kb;
    this.knockVy += dirY * kb;
    this.lastDamageDir = { x: dirX, y: dirY };
    this.lastWasCrit = isCrit;
    // diedThisFrame is set externally by main.ts when pipeline ON_KILL fires
    // (or detected via target.alive transition).
  }

  canContact(now: number): boolean { return now >= this.contactReadyAt; }
  applyContactCooldown(now: number) { this.contactReadyAt = now + TUNE.ENEMY_CONTACT_CD; }
}
