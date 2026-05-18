/**
 * Player entity — the only player class in Phase 2.
 * Responsibilities: movement, dodge i-frames, primary attack input.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE, TIME, CANVAS_W, CANVAS_H } from '../tokens.js';
import { inputDir, isMouseDown, wasPressed, isDown, mouse } from '../input.js';

export class Player {
  container: Container;
  body: Graphics;
  shadow: Graphics;
  iframeRing: Graphics;

  x: number = CANVAS_W / 2;
  y: number = CANVAS_H / 2;
  vx = 0; vy = 0;
  hp: number = TUNE.PLAYER_HP;
  hpMax: number = TUNE.PLAYER_HP;

  // Dodge state
  dodgeUntil = 0;       // ms timestamp when i-frame ends
  dodgeReadyAt = 0;     // ms timestamp when next dodge becomes available
  dodgeDir = { x: 0, y: 0 };

  // Attack cooldown
  nextAttackAt = 0;

  // Hit feedback
  hitFlashUntil = 0;

  facingX = 1; facingY = 0;

  constructor() {
    this.container = new Container();
    this.container.label = 'player';

    // Ground shadow — hard pixel ellipse
    this.shadow = new Graphics()
      .ellipse(0, 14, 18, 5)
      .fill({ color: 0x000000, alpha: 0.45 });
    this.container.addChild(this.shadow);

    // I-frame ring (visible during dodge)
    this.iframeRing = new Graphics()
      .circle(0, 0, 22)
      .stroke({ color: COLOR.tier1, width: 2, alignment: 0.5 });
    this.iframeRing.visible = false;
    this.container.addChild(this.iframeRing);

    // Body — chunky pixel hunter silhouette
    this.body = new Graphics();
    this.drawBody(false);
    this.container.addChild(this.body);
  }

  private drawBody(hit: boolean) {
    const g = this.body;
    g.clear();
    const main = hit ? COLOR.playerHit : COLOR.player;
    // chunky hunter — same pixel language as Phase 1 character portrait
    g.rect(-7, -22, 14, 8).fill(0x2A2E35);   // hood
    g.rect(-3, -16, 6, 4).fill(0x0A0C10);    // face shadow
    g.rect(-1, -14, 1, 1).fill(0x5E646D);    // eye L
    g.rect(1, -14, 1, 1).fill(0x5E646D);     // eye R
    g.rect(-8, -14, 16, 18).fill(main);      // body cloak
    g.rect(-7, -8, 14, 2).fill(0x0A0C10);    // belt
    g.rect(-3, -5, 6, 2).fill(0x7E1F24);     // crest
    g.rect(-6, 4, 4, 10).fill(0x1A1D22);     // leg L
    g.rect(2, 4, 4, 10).fill(0x1A1D22);      // leg R
    g.rect(-7, 14, 6, 2).fill(0x0A0C10);     // foot L
    g.rect(1, 14, 6, 2).fill(0x0A0C10);      // foot R
    g.rect(-13, -8, 2, 14).fill(0x3A4048);   // bow shaft
  }

  update(dtMs: number, now: number) {
    const dt = dtMs / 1000;

    // ---------- Dodge trigger ----------
    if (wasPressed('dodge') && now >= this.dodgeReadyAt) {
      const dir = inputDir();
      // If no input dir, use mouse direction (so dodge always has a vector)
      let dx = dir.x, dy = dir.y;
      if (dx === 0 && dy === 0) {
        dx = this.facingX; dy = this.facingY;
      }
      this.dodgeDir = { x: dx, y: dy };
      this.dodgeUntil = now + TIME.DODGE_DURATION;
      this.dodgeReadyAt = now + TIME.DODGE_COOLDOWN;
    }
    const dodging = now < this.dodgeUntil;
    this.iframeRing.visible = dodging;

    // ---------- Movement ----------
    if (dodging) {
      // Burst velocity during dodge — overrides normal movement
      const speed = TUNE.PLAYER_MAX_SPEED * TUNE.DODGE_SPEED_MULT;
      this.vx = this.dodgeDir.x * speed;
      this.vy = this.dodgeDir.y * speed;
    } else {
      const dir = inputDir();
      const targetVx = dir.x * TUNE.PLAYER_MAX_SPEED;
      const targetVy = dir.y * TUNE.PLAYER_MAX_SPEED;
      // accelerate toward target; decelerate when moving against
      const accel = (dir.x === 0 && dir.y === 0) ? TUNE.PLAYER_DECEL : TUNE.PLAYER_ACCEL;
      this.vx = approach(this.vx, targetVx, accel * dt);
      this.vy = approach(this.vy, targetVy, accel * dt);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp to arena bounds (with margin)
    const m = 40;
    this.x = Math.max(m, Math.min(CANVAS_W - m, this.x));
    this.y = Math.max(m, Math.min(CANVAS_H - m, this.y));

    // ---------- Facing ----------
    // Face mouse cursor (for projectile aiming)
    const fx = mouse.world.x - this.x;
    const fy = mouse.world.y - this.y;
    const fmag = Math.hypot(fx, fy);
    if (fmag > 0.01) {
      this.facingX = fx / fmag;
      this.facingY = fy / fmag;
    }

    // ---------- Render ----------
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);

    // Hit-flash
    if (now < this.hitFlashUntil) {
      this.drawBody(true);
    } else if (this.body.tint !== 0xFFFFFF) {
      this.drawBody(false);
    }
  }

  isInvulnerable(now: number): boolean {
    return now < this.dodgeUntil || now < this.hitFlashUntil + 200;
  }

  canAttack(now: number): boolean {
    return now >= this.nextAttackAt;
  }
  consumeAttack(now: number) {
    this.nextAttackAt = now + TUNE.ATTACK_CD;
  }

  takeDamage(amount: number, now: number) {
    if (this.isInvulnerable(now)) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashUntil = now + 120;
  }
}

function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}
