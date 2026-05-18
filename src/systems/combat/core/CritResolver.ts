import type { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';
import type { DamageContext } from '../types/DamageContext.js';

/**
 * CritResolver — read the source's crit chance and multiplier, fold in
 * any per-hit `bonusCritChance` / `bonusCritMultiplier` from the context.
 *
 * Defaults (when source has no StatManager): chance 5%, multiplier 150%
 * per spec. Chance is clamped to [0, 1] before rolling.
 */
export class CritResolver {
  static compute(sourceSM: StatManager | undefined, ctx: DamageContext): {
    chance: number;
    multiplier: number;
  } {
    const baseChancePct      = sourceSM ? sourceSM.getFinalStat(StatType.CRIT_CHANCE)     : 5;
    const baseMultiplierPct  = sourceSM ? sourceSM.getFinalStat(StatType.CRIT_MULTIPLIER) : 150;

    const chance = Math.min(1, Math.max(0, (baseChancePct + (ctx.bonusCritChance ?? 0)) / 100));
    const multiplier = (baseMultiplierPct + (ctx.bonusCritMultiplier ?? 0)) / 100;
    return { chance, multiplier };
  }
}
