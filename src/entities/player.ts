/**
 * Player entity — Combat Feel V2
 * Snap movement (no slide), hard dodge (instant velocity reset on end),
 * recoil on fire, footstep dust while moving.
 */
import { Container, Graphics } from 'pixi.js';
import { COLOR, TUNE, TIME, WORLD_W, WORLD_H } from '../tokens.js';
import { wasActionPressed, mouse } from '../input.js';
import { StatManager } from '../systems/stats/core/StatManager.js';
import { StatType } from '../systems/stats/types/StatType.js';
import { PLAYER_LEVEL_1_BASE } from '../systems/stats/baseline.js';
import type { ItemDefinition } from '../systems/items/types/ItemDefinition.js';
import type { EquippedSet } from '../systems/items/core/EquipmentManager.js';

/** Minimum distance before player considers the move target "reached". */
const MOVE_STOP_DIST = 6;

export class Player {
  container: Container;
  body: Graphics;
  shadow: Graphics;
  iframeRing: Graphics;

  x: number = WORLD_W / 2;
  y: number = WORLD_H / 2;
  vx = 0; vy = 0;

  // Click-to-move target (Diablo-style). null when LMB not held.
  // Set externally via setMoveTarget(); cleared on LMB release.
  moveTarget: { x: number, y: number } | null = null;

  // ---- Stat-system driven (read via getters) ----
  readonly statManager: StatManager;
  hp: number;
  mana: number;
  /** CombatEntity contract: stable id for damage-pipeline events. */
  readonly id: string = 'player';
  /** CombatEntity contract: flipped false on death; revived by scene logic. */
  alive: boolean = true;
  /** Movement-speed baseline in stat units; maps to TUNE.PLAYER_MAX_SPEED 1:1. */
  private readonly moveSpeedBase: number;

  // ---- Item-system driven ----
  /** Linear inventory list. Capped at INVENTORY_CAP per spec. */
  static readonly INVENTORY_CAP = 40;
  inventory: ItemDefinition[] = [];
  /** Slot → equipped item. EquipmentManager mutates this map. */
  equippedItems: EquippedSet = {};

  // ---- Progression ----
  /** Current player level. Increments via gainXP() when xp >= xpRequired. */
  level: number = 1;
  /** Banked XP toward the next level. */
  xp: number = 0;
  /** XP required for the next level. Recomputed on each level-up via spec formula 40 * level^1.35. */
  xpRequired: number = 40;

  // ---- Skill-system driven ----
  /** Skill slot bindings. Slot index → registered skill id; null = empty slot. */
  equippedSkills: (string | null)[] = [null, null, null, null, null];
  /** While performing a cast time, movement is slowed (spec: 35% of normal). */
  castingUntil: number = 0;
  /**
   * Per-cast override for the dodge / dash movement speed (px/s). Non-zero
   * means "use this exact speed instead of TUNE.DODGE_SPEED_MULT × max
   * speed" — DASH skills set this so the spec distance lands exactly inside
   * the spec duration.
   */
  dodgeSpeedOverride: number = 0;

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
    // Initialize stat system BEFORE first read of hpMax / maxMana getters.
    this.statManager = new StatManager();
    this.statManager.setBases(PLAYER_LEVEL_1_BASE);
    this.moveSpeedBase = PLAYER_LEVEL_1_BASE.get(StatType.MOVE_SPEED) ?? 5.2;
    this.hp = this.hpMax;
    this.mana = this.maxMana;

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

    // Effective max movement speed: stat-driven, mapped from spec base
    // (5.2) to pixel speed (TUNE.PLAYER_MAX_SPEED). While in a cast-time
    // window the spec slows movement to 35% of normal.
    const moveSpeedFinal = this.statManager.getFinalStat(StatType.MOVE_SPEED);
    let effectiveMaxSpeed = TUNE.PLAYER_MAX_SPEED * (moveSpeedFinal / this.moveSpeedBase);
    if (this.castingUntil > now) effectiveMaxSpeed *= 0.35;

    // ---------- Dodge trigger (reads rebindable 'dodge' action) ----------
    if (wasActionPressed('dodge') && now >= this.dodgeReadyAt) {
      let dx = this.facingX, dy = this.facingY;
      // Fallback to last movement dir if cursor right on top of player
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        const v = Math.hypot(this.vx, this.vy);
        if (v > 1) { dx = this.vx / v; dy = this.vy / v; }
        else { dx = 1; dy = 0; }
      }
      this.dodgeDir = { x: dx, y: dy };
      this.dodgeUntil = now + TIME.DODGE_DURATION;
      this.dodgeReadyAt = now + TIME.DODGE_COOLDOWN;
      this.recoilVx = 0; this.recoilVy = 0;
    }
    const dodgingPrev = now < this.dodgeUntil + dtMs;
    const dodging = now < this.dodgeUntil;
    this.iframeRing.visible = dodging;

    // ---------- Movement (click-to-move) ----------
    if (dodging) {
      // Dodge / dash: dodgeSpeedOverride lets DASH skills inject an exact
      // px/s figure so spec distance × duration math lands cleanly.
      const speed = this.dodgeSpeedOverride > 0
        ? this.dodgeSpeedOverride
        : effectiveMaxSpeed * TUNE.DODGE_SPEED_MULT;
      this.vx = this.dodgeDir.x * speed;
      this.vy = this.dodgeDir.y * speed;
    } else {
      // Clear the override the first frame after the dodge / dash window ends.
      if (this.dodgeSpeedOverride !== 0 && now >= this.dodgeUntil) this.dodgeSpeedOverride = 0;
      // Snap to zero on dodge end (no slide tail)
      if (!dodging && dodgingPrev && this.dodgeUntil !== 0 && now - this.dodgeUntil < dtMs) {
        this.vx = 0; this.vy = 0;
      }
      // Compute desired direction from move target (LMB hold)
      let dirX = 0, dirY = 0;
      if (this.moveTarget) {
        const dx = this.moveTarget.x - this.x;
        const dy = this.moveTarget.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MOVE_STOP_DIST) {
          dirX = dx / dist;
          dirY = dy / dist;
        }
      }
      const targetVx = dirX * effectiveMaxSpeed;
      const targetVy = dirY * effectiveMaxSpeed;
      const accel = (dirX === 0 && dirY === 0) ? TUNE.PLAYER_DECEL : TUNE.PLAYER_ACCEL;
      this.vx = approach(this.vx, targetVx, accel * dt);
      this.vy = approach(this.vy, targetVy, accel * dt);
    }

    // Apply recoil (decays fast)
    this.x += (this.vx + this.recoilVx) * dt;
    this.y += (this.vy + this.recoilVy) * dt;
    const recoilDecay = 14 * dt; // proportional shrink
    this.recoilVx -= this.recoilVx * Math.min(1, recoilDecay);
    this.recoilVy -= this.recoilVy * Math.min(1, recoilDecay);

    // Clamp to WORLD bounds (not canvas) — the world is 3200x3200, the
    // camera scrolls around it. V2A: previously clamped to canvas which
    // is why the playable area felt tiny.
    const m = 40;
    this.x = Math.max(m, Math.min(WORLD_W - m, this.x));
    this.y = Math.max(m, Math.min(WORLD_H - m, this.y));

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

    // ---------- Stat-system condition state ----------
    // Drive standard condition keys so conditional modifiers (e.g.
    // `whileMoving`, `onLowLife`) activate/deactivate correctly.
    const moving = Math.hypot(this.vx, this.vy) > 1;
    this.statManager.setCondition('isMoving', moving);
    this.statManager.setCondition('onLowLife', this.hp / Math.max(1, this.hpMax) <= 0.35);
  }

  /** Set click-to-move target in world coords. Called every frame while LMB held. */
  setMoveTarget(x: number, y: number) {
    this.moveTarget = { x, y };
  }
  clearMoveTarget() {
    this.moveTarget = null;
  }

  isInvulnerable(now: number): boolean {
    return now < this.dodgeUntil || now < this.hitFlashUntil + 200;
  }

  canAttack(now: number): boolean { return now >= this.nextAttackAt; }
  consumeAttack(now: number) {
    // Attack cadence is driven by ATTACK_SPEED final value. Base 1.0 →
    // unchanged cooldown; 1.5 → 67% of cooldown; 0.5 → doubled cooldown.
    const as = Math.max(0.01, this.statManager.getFinalStat(StatType.ATTACK_SPEED));
    this.nextAttackAt = now + TUNE.ATTACK_CD / as;
  }

  /** Final maximum HP after the full stat pipeline. */
  get hpMax(): number { return this.statManager.getFinalStat(StatType.MAX_HP); }
  /** Final maximum mana after the full stat pipeline. */
  get maxMana(): number { return this.statManager.getFinalStat(StatType.MAX_MANA); }
  /** Final crit chance as a fraction (e.g. 0.05 = 5%). */
  getCritChance(): number { return this.statManager.getFinalStat(StatType.CRIT_CHANCE) / 100; }
  /** Final crit multiplier as a multiplier (e.g. 1.5 = 150%). */
  getCritMultiplier(): number { return this.statManager.getFinalStat(StatType.CRIT_MULTIPLIER) / 100; }

  /** Returns true if the item was added; false when the inventory is full. */
  pushInventory(item: ItemDefinition): boolean {
    if (this.inventory.length >= Player.INVENTORY_CAP) return false;
    this.inventory.push(item);
    return true;
  }
  /** Removes the item at `index` and returns it (null if out of range). */
  popInventory(index: number): ItemDefinition | null {
    if (index < 0 || index >= this.inventory.length) return null;
    return this.inventory.splice(index, 1)[0];
  }

  /**
   * Award `amount` XP and process any level-ups. Per spec each level grants
   * +2 to each primary attribute via StatManager modifiers (sourceId
   * `level_up_<level>` for traceability).
   *
   * Returns the number of levels gained this call.
   */
  gainXP(amount: number): number {
    if (amount <= 0) return 0;
    this.xp += amount;
    let levels = 0;
    while (this.xp >= this.xpRequired) {
      this.xp -= this.xpRequired;
      this.level++;
      levels++;
      this.applyLevelUpStats(this.level);
      this.xpRequired = Math.floor(40 * Math.pow(this.level, 1.35));
    }
    return levels;
  }

  private applyLevelUpStats(newLevel: number): void {
    const sourceId = `level_up_${newLevel}`;
    const primary: StatType[] = [
      StatType.STRENGTH, StatType.DEXTERITY, StatType.INTELLIGENCE, StatType.VITALITY,
    ];
    for (const stat of primary) {
      this.statManager.modifiers.add({
        id: '',
        stat,
        modifierType: 'FLAT' as any,
        value: 2,
        sourceType: 'PASSIVE' as any,
        sourceId,
      });
    }
  }

  /** Apply micro recoil opposite to the shot direction (combat feel). */
  applyRecoil(dirX: number, dirY: number) {
    this.recoilVx -= dirX * TUNE.RECOIL_SPEED;
    this.recoilVy -= dirY * TUNE.RECOIL_SPEED;
  }

  /**
   * Visual hit-feedback. Pipeline owns hp; this method only flashes the
   * sprite. Called by main.ts from the ON_DAMAGE_TAKEN combat event.
   */
  applyHitReactions(now: number): void {
    this.hitFlashUntil = now + 140;
  }
}

function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}
