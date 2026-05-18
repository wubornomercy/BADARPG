/**
 * Enemy entity — Monster Ecosystem V1.
 *
 * Concrete MonsterRuntime implementation: holds Pixi visuals + runtime
 * state (HP / aggro / knockback / hit-flash). AI logic lives in the
 * monsters/ai modules and is ticked externally by main.ts every frame.
 *
 * Damage / hp / alive are mutated by the DamagePipeline. The AI sets
 * vx/vy each frame; this entity's update() applies movement + knockback
 * + hit-feedback rendering only — NO seek / pathfinding here.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE } from '../tokens.js';
import { StatManager } from '../systems/stats/core/StatManager.js';
import { StatType } from '../systems/stats/types/StatType.js';
import type { MonsterDefinition } from '../systems/monsters/types/MonsterDefinition.js';
import { MonsterRole, ROLE_SEPARATION_STRENGTH } from '../systems/monsters/types/MonsterRole.js';

let enemySeq = 0;

const ROLE_TINT: Record<MonsterRole, number> = {
  SWARM:    COLOR.enemy,
  CHARGER:  0x5A3A2E,
  RANGED:   0x2E4A5A,
  SUICIDE:  0x6A1F1F,
  SUMMONER: 0x4A2A5A,
  ELITE:    COLOR.enemy,
};

export class Enemy {
  container: Container;
  body: Graphics;
  shadow: Graphics;
  eyes: Graphics;

  /** CombatEntity contract: stable id for pipeline events. */
  id: string;

  // ---- Definition + data ----
  readonly definition: MonsterDefinition;
  readonly level: number;
  readonly statManager: StatManager;

  // ---- Position + motion ----
  x: number;
  y: number;
  vx = 0; vy = 0;
  knockVx = 0;
  knockVy = 0;

  // ---- Combat state ----
  hp: number;
  hpMax: number;
  alive = true;
  hitFlashUntil = 0;
  contactReadyAt = 0;
  staggerUntil = 0;
  diedThisFrame = false;
  lastDamageDir = { x: 0, y: 0 };
  lastWasCrit = false;

  // ---- AI / monster-ecosystem state ----
  aggroUntil = 0;
  nextThinkAt = 0;
  aiState: any = {};
  summonerId: string | null = null;
  eliteModifierIds: string[] = [];
  separationStrength: number;
  lastAttackAt = 0;

  /**
   * Base sprite scale before the hit-squash multiplier. Default bumped
   * from 1.0 to 1.4 after playtest feedback — the spec's pixel sprites
   * read too small relative to the player at 1.0. TITANIC elite modifier
   * multiplies on top of this (so TITANIC → 1.4 × 1.25 ≈ 1.75x).
   */
  baseVisualScale = 1.4;

  constructor(x: number, y: number, definition: MonsterDefinition, level: number = definition.level) {
    this.x = x;
    this.y = y;
    this.id = `enemy_${++enemySeq}`;
    this.definition = definition;
    this.level = level;

    this.statManager = new StatManager();
    this.statManager.setBase(StatType.MAX_HP,     definition.baseHP);
    this.statManager.setBase(StatType.MOVE_SPEED, definition.moveSpeed);

    this.hpMax = this.statManager.getFinalStat(StatType.MAX_HP);
    this.hp = this.hpMax;

    this.separationStrength = ROLE_SEPARATION_STRENGTH[definition.role];

    this.container = new Container();
    this.container.label = `monster:${definition.id}`;

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

    // Apply baseline visual scale immediately so the sprite isn't tiny
    // on its first rendered frame.
    this.container.scale.set(this.baseVisualScale, this.baseVisualScale);
  }

  private drawBody(hitAlpha: number) {
    const g = this.body;
    g.clear();
    const base = ROLE_TINT[this.definition.role] ?? COLOR.enemy;
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

  /**
   * Per-frame tick. AI has already written vx/vy this frame; we only
   * apply knockback, integrate position, and refresh hit feedback /
   * render. Position clamp + zIndex sort happen in main.ts post-AI.
   */
  update(dtMs: number, now: number): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;

    // Stagger slows AI movement (multiplier on vx/vy applied before this).
    const staggered = now < this.staggerUntil;
    const aiScale = staggered ? 0.12 : 1;

    // Knockback decays exponentially.
    const decay = Math.min(1, TUNE.ENEMY_KNOCKBACK_DECAY * dt);
    this.knockVx -= this.knockVx * decay;
    this.knockVy -= this.knockVy * decay;

    // Combined velocity = AI velocity (scaled by stagger) + knockback.
    this.x += (this.vx * aiScale + this.knockVx) * dt;
    this.y += (this.vy * aiScale + this.knockVy) * dt;

    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);

    if (now < this.hitFlashUntil) {
      const t = Math.min(1, (this.hitFlashUntil - now) / 140);
      this.drawBody(t);
      // Hit-squash overlaid on top of the elite/base visual scale.
      const sx = (1 + t * 0.18) * this.baseVisualScale;
      const sy = (1 - t * 0.28) * this.baseVisualScale;
      this.container.scale.set(sx, sy);
    } else {
      this.drawBody(0);
      if (this.container.scale.x !== this.baseVisualScale || this.container.scale.y !== this.baseVisualScale) {
        this.container.scale.set(this.baseVisualScale, this.baseVisualScale);
      }
    }
  }

  /**
   * Apply hit-feedback (flash, stagger, knockback). HP/alive are owned
   * by DamagePipeline. Pure presentation/AI reaction; no math.
   */
  applyHitReactions(now: number, dirX: number, dirY: number, isCrit: boolean): void {
    this.hitFlashUntil = now + (isCrit ? 220 : 140);
    this.staggerUntil = now + (isCrit ? TUNE.ENEMY_STAGGER_CRIT : TUNE.ENEMY_STAGGER_NORMAL);
    const kb = isCrit ? TUNE.ENEMY_KNOCKBACK_CRIT : TUNE.ENEMY_KNOCKBACK;
    this.knockVx += dirX * kb;
    this.knockVy += dirY * kb;
    this.lastDamageDir = { x: dirX, y: dirY };
    this.lastWasCrit = isCrit;
  }

  canContact(now: number): boolean { return now >= this.contactReadyAt; }
  applyContactCooldown(now: number) { this.contactReadyAt = now + TUNE.ENEMY_CONTACT_CD; }
}
