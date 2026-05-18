import type { CombatEventType } from './CombatEventType.js';
import type { CombatEntity } from '../types/CombatEntity.js';
import type { DamageType } from '../types/DamageType.js';
import type { HitType } from '../types/HitType.js';
import type { DamageResult } from '../types/DamageResult.js';

/**
 * CombatEvent — payload dispatched for every combat outcome. Future
 * systems hang off this:
 *   - lifesteal listens on ON_HIT, reads finalDamage + source
 *   - triggered skills listen on ON_HIT/ON_CRIT, react with their own
 *     pipeline.resolve() call
 *   - chain explosions / poison spread / execute use ON_KILL
 *   - reflect uses ON_DAMAGE_TAKEN with target + sourceTags + finalDamage
 *
 * The `result` reference exposes the full pipelineBreakdown for
 * advanced consumers — most listeners use only the flat fields.
 */
export interface CombatEvent {
  type:           CombatEventType;
  source:         CombatEntity;
  target:         CombatEntity;
  finalDamage:    number;
  damageType:     DamageType;
  hitType:        HitType;
  sourceTags:     readonly string[];
  wasCrit:        boolean;
  wasBlocked:     boolean;
  wasDodged:      boolean;
  targetKilled:   boolean;
  /** True if this was a DOT tick (no hit roll, no lifesteal). */
  isDOT:          boolean;
  /**
   * Free-form data carried from DamageContext.metadata. Skill behaviours
   * stash `sourceSkillId`, `dirX/dirY`, `hitX/hitY`, etc. here so VFX
   * listeners on the main side can render in the right place without
   * the pipeline knowing about Pixi.
   */
  metadata?:      Record<string, any>;
  /** Full pipeline result — reference, not a copy. */
  result:         DamageResult;
}
