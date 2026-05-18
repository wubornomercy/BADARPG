import { StatType } from './types/StatType.js';

/**
 * Level 1 player baseline. Every stat that has a meaningful non-zero
 * starting value is listed here; everything else defaults to 0 inside
 * StatManager.
 *
 * Spec source: "BASE PLAYER STATS — Level 1 player baseline".
 */
export const PLAYER_LEVEL_1_BASE: ReadonlyMap<StatType, number> = new Map<StatType, number>([
  // ---- Primary attributes -----------------------------------------------
  [StatType.STRENGTH,     0],
  [StatType.DEXTERITY,    0],
  [StatType.INTELLIGENCE, 0],
  [StatType.VITALITY,     0],

  // ---- Defensive --------------------------------------------------------
  [StatType.MAX_HP,           100],
  [StatType.MAX_MANA,         50],
  [StatType.ARMOR,            0],
  [StatType.EVASION,          0],
  [StatType.BLOCK_CHANCE,     0],
  [StatType.FIRE_RESIST,      0],
  [StatType.COLD_RESIST,      0],
  [StatType.LIGHTNING_RESIST, 0],
  [StatType.POISON_RESIST,    0],
  [StatType.HP_REGEN,         1],
  [StatType.MANA_REGEN,       2],
  [StatType.DAMAGE_REDUCTION, 0],
  [StatType.AILMENT_RESIST,   0],

  // ---- Offensive --------------------------------------------------------
  [StatType.CRIT_CHANCE,           5],
  [StatType.CRIT_MULTIPLIER,       150],
  [StatType.ATTACK_SPEED,          1.0],
  [StatType.CAST_SPEED,            1.0],
  [StatType.ACCURACY,              0],
  [StatType.ARMOR_PENETRATION,     0],
  [StatType.ELEMENTAL_PENETRATION, 0],
  [StatType.LIFE_STEAL,            0],

  // ---- Utility ----------------------------------------------------------
  [StatType.MOVE_SPEED,         5.2],
  [StatType.COOLDOWN_REDUCTION, 0],
  [StatType.PICKUP_RADIUS,      0],
  [StatType.GOLD_FIND,          0],
  [StatType.RARITY_FIND,        0],
]);

/** Convenience accessor that doesn't expose the Map directly. */
export function getBaselineValue(stat: StatType): number {
  return PLAYER_LEVEL_1_BASE.get(stat) ?? 0;
}
