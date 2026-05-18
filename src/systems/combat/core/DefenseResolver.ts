import type { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';

/**
 * DefenseResolver — physical-only armor mitigation.
 *
 * Spec formula:
 *   damageReduction = armor / (armor + physicalDamage * 5)
 *   clamped to a maximum of 0.85 (85%).
 *
 * Returns the FRACTION of incoming physical damage to subtract — the
 * pipeline applies it as `damage *= 1 - reduction`. Non-physical damage
 * never visits this resolver.
 */
export class DefenseResolver {
  static physicalReduction(
    targetSM: StatManager | undefined,
    incomingPhysical: number,
  ): number {
    if (!targetSM) return 0;
    if (incomingPhysical <= 0) return 0;
    const armor = targetSM.getFinalStat(StatType.ARMOR);
    if (armor <= 0) return 0;
    const reduction = armor / (armor + incomingPhysical * 5);
    return Math.min(0.85, Math.max(0, reduction));
  }
}
