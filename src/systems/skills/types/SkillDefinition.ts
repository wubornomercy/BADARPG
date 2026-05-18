import type { SkillBehaviorType } from './SkillBehaviorType.js';
import type { SkillTargetingType } from './SkillTargetingType.js';
import type { SkillProjectileConfig } from './SkillProjectileConfig.js';
import type { DamageType } from '../../combat/types/DamageType.js';

/**
 * SkillDefinition — pure data. A skill is a row in a (logical) table:
 *
 *   { id, name, behaviorType, targetingType, tags, ...numbers }
 *
 * Behaviors are looked up at runtime by behaviorType, so adding a skill
 * is "edit a data file" — never "write a new TS class". One-file-per-
 * skill is explicitly forbidden by the spec.
 *
 * `behaviorConfig` is a free-form bag for behavior-specific knobs that
 * don't earn their own field (e.g. NOVA radius, GROUND_AOE duration,
 * DASH distance). The behavior validates / defaults the keys it cares
 * about.
 */
export interface SkillDefinition {
  id:             string;
  name:           string;
  description:    string;
  icon:           string;
  tags:           string[];

  behaviorType:   SkillBehaviorType;
  targetingType:  SkillTargetingType;

  /** Seconds (0 = instant). */
  castTime:       number;
  /** Seconds. Scaled by source's COOLDOWN_REDUCTION stat. */
  cooldown:       number;
  /** Flat resource cost paid on cast start. */
  manaCost:       number;
  /** Optional flat HP cost — applied AFTER mana. */
  hpCost?:        number;
  /** Recharge-style charge count. Architecture-only in V1. */
  maxCharges?:    number;

  /** Required for PROJECTILE behavior; ignored otherwise. */
  projectile?:    SkillProjectileConfig;

  /** Per-hit / per-tick base damage. */
  baseDamage?:    number;
  damageType?:    DamageType;
  canCrit?:       boolean;

  /**
   * Whether this skill can be invoked by trigger effects (cast-on-crit,
   * cast-on-kill, etc.). Defaults to true.
   */
  canTrigger?:    boolean;

  /**
   * When true, this skill cannot re-trigger itself within the same
   * trigger chain — guards against infinite loops where a skill triggers
   * a copy of itself.
   */
  triggerProtection?: boolean;

  /**
   * When true, the effective cooldown is divided by the source's
   * ATTACK_SPEED stat in addition to the CDR formula. Use this for
   * basic-attack-style skills so +attack speed gear speeds up their
   * spam rate. Defaults to false (regular cooldown scaling only).
   */
  attackSpeedScaled?: boolean;

  /** Behavior-specific knobs (NOVA radius, GROUND_AOE duration, etc.). */
  behaviorConfig?: Record<string, any>;
}
