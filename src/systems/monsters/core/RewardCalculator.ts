import type { MonsterDefinition } from '../types/MonsterDefinition.js';
import { ELITE_XP_BONUS_MULT, ELITE_LOOT_BONUS_MULT } from './EliteManager.js';

/**
 * RewardCalculator — pure functions for XP / loot rewards on monster kill.
 *
 * Spec patch 4 locks the order:
 *   baseXP → level multiplier → elite bonus → final XP
 *
 * Implemented exactly that way: `xp = baseXP * levelMult * eliteBonus`.
 * Level multiplier formula: `1 + (level - 1) * 0.12` per spec.
 *
 * Loot multiplier follows the same shape so the two reward axes scale
 * symmetrically.
 */
export function levelMultiplier(level: number): number {
  return 1 + Math.max(0, level - 1) * 0.12;
}

export function computeXPReward(def: MonsterDefinition, level: number, isElite: boolean): number {
  return def.xpReward * levelMultiplier(level) * (isElite ? ELITE_XP_BONUS_MULT : 1);
}

export function computeLootMultiplier(def: MonsterDefinition, level: number, isElite: boolean): number {
  return def.lootMultiplier * levelMultiplier(level) * (isElite ? ELITE_LOOT_BONUS_MULT : 1);
}

/** Required XP for the next level: 40 * level^1.35 (spec). */
export function requiredXPForLevel(level: number): number {
  return Math.floor(40 * Math.pow(Math.max(1, level), 1.35));
}
