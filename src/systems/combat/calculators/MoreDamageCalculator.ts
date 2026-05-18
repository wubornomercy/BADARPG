import type { StatManager } from '../../stats/core/StatManager.js';
import { ModifierType } from '../../stats/types/ModifierType.js';
import type { DamageType } from '../types/DamageType.js';
import { applicableDamageStats } from './IncreasedDamageCalculator.js';

/**
 * MoreDamageCalculator — list of independent multiplicative layers that
 * apply to a damage chunk.
 *
 * Per spec: "All MORE multipliers are multiplicative. Independent layers."
 *
 * Returns the list of fractional multipliers (e.g. `[0.3, 0.2]` for two
 * MORE mods at +30% and +20%). The pipeline applies them as
 *   `damage *= (1 + each)`, sequentially.
 *
 * Convention: MORE modifiers are stored on the same damage-axis stats as
 * INCREASED, but with `modifierType: MORE`. Tag-gated MORE mods (e.g.
 * "30% MORE damage with projectiles") are filtered via the standard
 * StatManager.activeFor tag check.
 */
export class MoreDamageCalculator {
  static compute(
    sm: StatManager | undefined,
    damageType: DamageType,
    contextTags: readonly string[],
  ): number[] {
    if (!sm) return [];
    const out: number[] = [];
    const stats = applicableDamageStats(damageType, contextTags);
    for (const stat of stats) {
      const mods = sm.modifiers.activeFor(stat, contextTags);
      for (const m of mods) {
        if (m.modifierType === ModifierType.MORE) out.push(m.value / 100);
      }
    }
    return out;
  }
}
