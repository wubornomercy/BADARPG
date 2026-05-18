import type { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';
import { DamageType } from '../types/DamageType.js';

/**
 * ResistanceResolver — elemental + poison resist with penetration.
 *
 * Spec rules:
 *   - Resistance multiplier:  damage *= (1 - resist / 100)
 *   - Cap: 75% (upper bound).
 *   - Penetration is subtracted BEFORE the cap is applied — i.e. an
 *     enemy with 80% fire resist + 20 fire pen sees an effective 60%
 *     (the cap of 75 doesn't save them from penetration).
 *   - Resists may go negative (vulnerability) — the multiplier then
 *     exceeds 1.0. The spec sets no negative floor; we leave it
 *     uncapped on the low side.
 */
export const RESIST_CAP = 75;

export class ResistanceResolver {
  /** Returns the multiplier applied to the damage chunk (e.g. 0.25 for 75% resist). */
  static compute(
    targetSM: StatManager | undefined,
    type: DamageType,
    penetration: number = 0,
  ): number {
    if (!targetSM) return 1.0;
    let statType: StatType;
    switch (type) {
      case DamageType.FIRE:      statType = StatType.FIRE_RESIST;      break;
      case DamageType.COLD:      statType = StatType.COLD_RESIST;      break;
      case DamageType.LIGHTNING: statType = StatType.LIGHTNING_RESIST; break;
      case DamageType.POISON:    statType = StatType.POISON_RESIST;    break;
      default:                   return 1.0; // physical — never visits here
    }
    // Use pre-clamp value so penetration applies to the raw resist per spec.
    // (StatManager caps resists at 75 inside getFinalStat; we need the un-
    // capped number to compute "resist - pen", THEN cap the result.)
    const resistRaw = targetSM.recompute(statType).beforeClamp;
    const effective = Math.min(RESIST_CAP, resistRaw - (penetration ?? 0));
    return 1 - effective / 100;
  }
}
