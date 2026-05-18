/**
 * Player entity — Combat Feel V2
 * Snap movement (no slide), hard dodge (instant velocity reset on end),
 * recoil on fire, footstep dust while moving.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE, TIME, CANVAS_W, CANVAS_H } from '../tokens.js';
import { inputDir, wasPressed, mouse } from '../input.js';

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
  dodgeUntil = 0;
  dodgeReadyAt = 0;
  dodgeDir = { x: 0, y: 0 };

  // Attack cooldown
  nextAttackAt = 0;

  // Hit feedback
  hitFlashUntil = 0;

  // Recoil state — extra velocity added on fire, decays fast
  recoilVx = 0;
  recoilVy = 0;

  // Footstep dust scheduling
  lastFootstepAt = 0;

  facingX = 1; facingY = 0;

  constructor() {
    this.container = new Container();
    this.container.label = 'player';

    // Ground shadow — chunky pixel ellipse (anchors to floor for "grounded" feel)
    this.shadow = new Graphics()
      .ellipse(0, 16, 14, 4)
      .fill({ color: 0x000000, alpha: 0.55 });
    this.container.addChild(this.shadow);

    // I-frame ring — only during dodge
    this.iframeRing = new Graphics()
      .circle(0, 0, 22)
      .stroke({ color: COLOR.tier1, width: 2, alignment: 0.5 });
    this.iframeRing.visible = false;
    this.container.addChild(this.iframeRing);

    this.body = new Graphics();
    this.drawBody(false);
    this.container.addChild(this.body);
  }

  private drawBody(hit: boolean) {
    const g = this.body;
    g.clear();
    const main = hit ? COLOR.playerHit : COLOR.player;
    g.rect(-7, -22, 14, 8).fill(0x2A2E35);
    g.rect(-3, -16, 6, 4).fill(0x0A0C10);
    g.rect(-1, -14, 1, 1).fill(0x5E646D);
    g.rect(1, -14, 1, 1).fill(0x5E646D);
    g.rect(-8, -14, 16, 18).fill(main);
    g.rect(-7, -8, 14, 2).fill(0x0A0C10);
    g.rect(-3, -5, 6, 2).fill(0x7E1F24);
    g.rect(-6, 4, 4, 10).fill(0x1A1D22);
    g.rect(2, 4, 4, 10).fill(0x1A1D22);
    g.rect(-7, 14, 6, 2).fill(0x0A0C10);
    g.rect(1, 14, 6, 2).fill(0x0A0C10);
    g.rect(-13, -8, 2, 14).fill(0x3A4048);
  }

  update(dtMs: number, now: number, onFootstep?: (x: number, y: number) => void) {
    const dt = dtMs / 1000;

    // ---------- Dodge trigger ----------
    if (wasPressed('dodge') && now >= this.dodgeReadyAt) {
      const dir = inputDir();
      let dx = dir.x, dy = dir.y;
      if (dx === 0 && dy === 0) {
        dx = this.facingX; dy = this.facingY;
      }
      this.dodgeDir = { x: dx, y: dy };
      this.dodgeUntil = now + TIME.DODGE_DURATION;
      this.dodgeReadyAt = now + TIME.DODGE_COOLDOWN;
      // Burst velocity is set inside dodge branch every frame; on START
      // also zero any lingering recoil so dodge feels "clean".
      this.recoilVx = 0; this.recoilVy = 0;
    }
    const dodgingPrev = now < this.dodgeUntil + dtMs;   // captures "was dodging last frame"
    const dodging = now < this.dodgeUntil;
    this.iframeRing.visible = dodging;

    // ---------- Movement ----------
    if (dodging) {
      const speed = TUNE.PLAYER_MAX_SPEED * TUNE.DODGE_SPEED_MULT;
      this.vx = this.dodgeDir.x * speed;
      this.vy = this.dodgeDir.y * speed;
    } else {
      // CRITICAL for combat feel: if dodge JUST ended this frame, instantly
      // zero the player's velocity so there's no "slide" tail. This was the
      // #1 floaty-feel offender in V1.
      if (!dodging && dodgingPrev && this.dodgeUntil !== 0 && now - this.dodgeUntil < dtMs) {
        this.vx = 0; this.vy = 0;
      }
      const dir = inputDir();
      const targetVx = dir.x * TUNE.PLAYER_MAX_SPEED;
      const targetVy = dir.y * TUNE.PLAYER_MAX_SPEED;
      const accel = (dir.x === 0 && dir.y === 0) ? TUNE.PLAYER_DECEL : TUNE.PLAYER_ACCEL;
      this.vx = approach(this.vx, targetVx, accel * dt);
      this.vy = approach(this.vy, targetVy, accel * dt);
    }

    // Apply recoil (decays fast)
    this.x += (this.vx + this.recoilVx) * dt;
    this.y += (this.vy + this.recoilVy) * dt;
    const recoilDecay = 14 * dt; // proportional shrink
    this.recoilVx -= this.recoilVx * Math.min(1, recoilDecay);
    this.recoilVy -= this.recoilVy * Math.min(1, recoilDecay);

    // Clamp to arena bounds
    const m = 40;
    this.x = Math.max(m, Math.min(CANVAS_W - m, this.x));
    this.y = Math.max(m, Math.min(CANVAS_H - m, this.y));

    // ---------- Facing ----------
    const fx = mouse.world.x - this.x;
    const fy = mouse.world.y - this.y;
    const fmag = Math.hypot(fx, fy);
    if (fmag > 0.01) {
      this.facingX = fx / fmag;
      this.facingY = fy / fmag;
    }

    // ---------- Footstep dust ----------
    const speedMag = Math.hypot(this.vx, this.vy);
    if (speedMag > TUNE.FOOTSTEP_VELOCITY_THRESHOLD && !dodging && onFootstep) {
      if (now - this.lastFootstepAt > TIME.FOOTSTEP_INTERVAL) {
        this.lastFootstepAt = now;
        onFootstep(this.x, this.y + 14);
      }
    }

    // ---------- Render ----------
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);

    if (now < this.hitFlashUntil) {
      this.drawBody(true);
    } else {
      this.drawBody(false);
    }
  }

  isInvulnerable(now: number): boolean {
    return now < this.dodgeUntil || now < this.hitFlashUntil + 200;
  }

  canAttack(now: number): boolean { return now >= this.nextAttackAt; }
  consumeAttack(now: number) { this.nextAttackAt = now + TUNE.ATTACK_CD; }

  /** Apply micro recoil opposite to the shot direction (combat feel). */
  applyRecoil(dirX: number, dirY: number) {
    this.recoilVx -= dirX * TUNE.RECOIL_SPEED;
    this.recoilVy -= dirY * TUNE.RECOIL_SPEED;
  }

  takeDamage(amount: number, now: number) {
    if (this.isInvulnerable(now)) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashUntil = now + 140;
  }
}

function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}
