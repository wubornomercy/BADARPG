import { StatType, RESIST_STATS } from './types/StatType.js';

/**
 * Global hard caps. Applied as the FINAL step of the stat pipeline,
 * after override resolution. Caps cannot be exceeded by any combination
 * of modifiers — that is intentional and protects later systems
 * (corruption / endgame scaling) from runaway numbers.
 */
export const CAPS = {
  /** Max value for any individual resistance stat. */
  maxResistCap:           75,
  /** Max additive % bonus over baseline move speed (i.e. final ≤ base × 3). */
  maxMoveSpeedBonus:      200,
  /** Hard ceiling on crit chance. */
  critChanceCap:          100,
  /** Hard ceiling on cooldown reduction. */
  cooldownReductionCap:   75,
  /** Hard ceiling on life steal. */
  lifeStealCap:           40,
} as const;

/**
 * Apply the cap appropriate for the given stat. Stats without a cap pass
 * through untouched. The base value is required for relative caps such
 * as MOVE_SPEED whose ceiling is `base × (1 + bonus/100)`.
 */
export function clampStat(stat: StatType, value: number, baseValue: number): number {
  if (RESIST_STATS.has(stat)) {
    return Math.min(value, CAPS.maxResistCap);
  }
  switch (stat) {
    case StatType.CRIT_CHANCE:
      return Math.min(value, CAPS.critChanceCap);
    case StatType.COOLDOWN_REDUCTION:
      return Math.min(value, CAPS.cooldownReductionCap);
    case StatType.LIFE_STEAL:
      return Math.min(value, CAPS.lifeStealCap);
    case StatType.MOVE_SPEED: {
      const ceiling = baseValue * (1 + CAPS.maxMoveSpeedBonus / 100);
      return Math.min(value, ceiling);
    }
    default:
      return value;
  }
}
