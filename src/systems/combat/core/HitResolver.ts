import type { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';

/**
 * HitResolver — pure dodge / block chance formulas.
 *
 * Exposed as static methods so the pipeline can roll them and tests can
 * verify the math without instantiating the full pipeline.
 *
 * Dodge:
 *   dodgeChance = evasion / (evasion + accuracy * 2)
 *   clamped to [0, 0.75]
 *
 * Block:
 *   target.BLOCK_CHANCE (percent), clamped to [0, 75], expressed as fraction
 */
export class HitResolver {
  /** Probability in [0, 0.75]. Returns 0 if target has no evasion. */
  static dodgeChance(sourceSM: StatManager | undefined, targetSM: StatManager | undefined): number {
    if (!targetSM) return 0;
    const evasion = targetSM.getFinalStat(StatType.EVASION);
    if (evasion <= 0) return 0;
    const accuracy = sourceSM ? sourceSM.getFinalStat(StatType.ACCURACY) : 0;
    const denom = evasion + accuracy * 2;
    if (denom <= 0) return 0;
    return Math.min(0.75, Math.max(0, evasion / denom));
  }

  /** Probability in [0, 0.75]. */
  static blockChance(targetSM: StatManager | undefined): number {
    if (!targetSM) return 0;
    const bc = targetSM.getFinalStat(StatType.BLOCK_CHANCE);
    return Math.min(0.75, Math.max(0, bc / 100));
  }
}

/** Block damage retention factor per spec: "final damage *= 0.35". */
export const BLOCK_DAMAGE_RETAINED = 0.35;
