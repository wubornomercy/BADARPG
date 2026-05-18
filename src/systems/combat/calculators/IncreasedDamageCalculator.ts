import type { StatManager } from '../../stats/core/StatManager.js';
import { ModifierType } from '../../stats/types/ModifierType.js';
import { StatType } from '../../stats/types/StatType.js';
import { DamageType } from '../types/DamageType.js';

/**
 * IncreasedDamageCalculator — total additive percentage increase applied
 * to a single damage chunk of `damageType` with the given context tags.
 *
 * Spec rule: "All increased modifiers are additive". Returned value is a
 * fraction, e.g. 0.75 = +75% combined.
 *
 * Modifier convention (locked in for V1):
 *   Increased-damage affixes are recorded as modifiers on the relevant
 *   damage-axis stat (FIRE_DAMAGE, PROJECTILE_DAMAGE, etc.) with the
 *   modifier value being the percent number itself (e.g. value=35 means
 *   "+35% increased fire damage"). Both FLAT and INCREASED ModifierTypes
 *   are folded into the additive sum so authors can use either spelling.
 */
export class IncreasedDamageCalculator {
  static compute(
    sm: StatManager | undefined,
    damageType: DamageType,
    contextTags: readonly string[],
  ): number {
    if (!sm) return 0;
    let totalPct = 0;
    const stats = applicableDamageStats(damageType, contextTags);
    for (const stat of stats) {
      const mods = sm.modifiers.activeFor(stat, contextTags);
      for (const m of mods) {
        if (m.modifierType === ModifierType.FLAT || m.modifierType === ModifierType.INCREASED) {
          totalPct += m.value;
        }
      }
    }
    return totalPct / 100;
  }
}

/**
 * Map (damage type + context tags) → stat axes whose modifiers contribute
 * additive increased scaling. Public for use by MoreDamageCalculator too.
 */
export function applicableDamageStats(
  damageType: DamageType,
  contextTags: readonly string[],
): StatType[] {
  const stats: StatType[] = [];
  switch (damageType) {
    case DamageType.PHYSICAL:  stats.push(StatType.PHYSICAL_DAMAGE);  break;
    case DamageType.FIRE:      stats.push(StatType.FIRE_DAMAGE);      break;
    case DamageType.COLD:      stats.push(StatType.COLD_DAMAGE);      break;
    case DamageType.LIGHTNING: stats.push(StatType.LIGHTNING_DAMAGE); break;
    case DamageType.POISON:    stats.push(StatType.POISON_DAMAGE);    break;
  }
  if (contextTags.includes('projectile')) stats.push(StatType.PROJECTILE_DAMAGE);
  if (contextTags.includes('spell'))      stats.push(StatType.SPELL_DAMAGE);
  if (contextTags.includes('melee'))      stats.push(StatType.MELEE_DAMAGE);
  if (contextTags.includes('dot'))        stats.push(StatType.DOT_DAMAGE);
  return stats;
}
