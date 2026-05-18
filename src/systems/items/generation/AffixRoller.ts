import type { AffixDefinition, AffixType } from '../types/AffixDefinition.js';
import type { AffixTier } from '../types/AffixTier.js';
import type { RolledAffix } from '../types/ItemDefinition.js';
import { AffixManager } from '../core/AffixManager.js';
import { WeightResolver } from './WeightResolver.js';

/**
 * AffixRoller — picks N affixes of a given type (prefix or suffix),
 * obeying the spec rules:
 *
 *   1. itemLevel >= affix.minItemLevel
 *   2. No duplicate affixes within a single item
 *   3. Lower-tier numbers (stronger) are rarer via tier.weight
 *   4. rolledValue uniform in [tier.minValue, tier.maxValue]
 *
 * Used by LootGenerator. Standalone helper so tests can validate
 * the rolling behaviour in isolation.
 */
export class AffixRoller {
  static roll(
    mgr: AffixManager,
    type: AffixType,
    count: number,
    itemLevel: number,
    excludeIds: Set<string>,
    rng: () => number = Math.random,
  ): RolledAffix[] {
    const out: RolledAffix[] = [];
    if (count <= 0) return out;

    const pool = mgr.eligible(itemLevel, type).filter((a) => !excludeIds.has(a.id));
    if (pool.length === 0) return out;

    const remaining = pool.slice();
    for (let i = 0; i < count; i++) {
      if (remaining.length === 0) break;
      const affix = WeightResolver.pick(remaining, rng);
      if (!affix) break;

      // Strip from the pool to enforce the no-duplicates rule.
      const idx = remaining.indexOf(affix);
      if (idx >= 0) remaining.splice(idx, 1);

      const tier = pickTier(affix, itemLevel, rng);
      if (!tier) continue;
      const rolledValue = WeightResolver.randFloat(tier.minValue, tier.maxValue + Number.EPSILON, rng);

      out.push({
        affixId: affix.id,
        tier: tier.tier,
        // Persist as a whole number when the source bounds are integers; this
        // matches the spec's affix table presentation (e.g. "18-24") and keeps
        // the tooltip readable.
        rolledValue: roundToBounds(rolledValue, tier),
      });

      excludeIds.add(affix.id);
    }
    return out;
  }
}

function pickTier(affix: AffixDefinition, itemLevel: number, rng: () => number): AffixTier | null {
  const eligible: AffixTier[] = [];
  for (const t of affix.tiers) {
    if (t.minItemLevel !== undefined && t.minItemLevel > itemLevel) continue;
    if (t.weight <= 0) continue;
    eligible.push(t);
  }
  return WeightResolver.pick(eligible, rng);
}

function roundToBounds(value: number, tier: AffixTier): number {
  // If the tier was authored with integer min/max, snap to nearest integer
  // and clamp into range. Float-valued tiers (none in V1) flow through.
  if (Number.isInteger(tier.minValue) && Number.isInteger(tier.maxValue)) {
    const v = Math.round(value);
    return Math.max(tier.minValue, Math.min(tier.maxValue, v));
  }
  return value;
}
