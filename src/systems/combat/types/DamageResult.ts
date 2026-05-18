import type { DamageType } from './DamageType.js';
import type { HitType } from './HitType.js';
import type { AilmentType } from './AilmentType.js';

/**
 * DamageResult — the full audit trail produced by DamagePipeline.resolve().
 *
 * Every consumer (UI floaters, log overlay, kill counters, lifesteal hook)
 * reads from this — there is no "second source of truth". The
 * `pipelineBreakdown` block is mandatory: every stage of the pipeline
 * deposits its aggregated post-stage value so debug overlays and
 * regression tests can attribute final damage to the right step.
 */
export interface DamageResult {
  finalDamage: number;
  hitType: HitType;
  damageType: DamageType;

  wasCrit: boolean;
  wasBlocked: boolean;
  wasDodged: boolean;

  appliedAilments: AilmentType[];

  targetKilled: boolean;

  pipelineBreakdown: {
    baseDamage:        number;
    addedDamage:       number;
    afterConversion:   number;
    afterIncreased:    number;
    afterMore:         number;
    afterCrit:         number;
    afterDefense:      number;
    afterResistance:   number;
    finalDamage:       number;
  };
}
