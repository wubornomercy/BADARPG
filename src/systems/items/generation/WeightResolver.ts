/**
 * WeightResolver — generic weighted random selection.
 *
 * The single source of truth for "pick one of N candidates by weight".
 * Used by:
 *   - LootGenerator (rarity selection, base-type selection)
 *   - AffixRoller (affix pool, tier selection)
 *
 * Injectable RNG so unit tests can pin results.
 *
 * Weights are NOT pre-normalised; the resolver sums on the fly. Zero or
 * negative weights are treated as zero.
 */
export class WeightResolver {
  static pick<T extends { weight: number }>(items: readonly T[], rng: () => number = Math.random): T | null {
    if (items.length === 0) return null;
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const w = items[i].weight;
      if (w > 0) total += w;
    }
    if (total === 0) return null;
    let r = rng() * total;
    for (let i = 0; i < items.length; i++) {
      const w = items[i].weight;
      if (w <= 0) continue;
      r -= w;
      if (r < 0) return items[i];
    }
    // Fallback for floating-point edge — return the last positive-weight entry.
    for (let i = items.length - 1; i >= 0; i--) if (items[i].weight > 0) return items[i];
    return null;
  }

  /** Uniform integer in [min, max] inclusive. */
  static randInt(min: number, max: number, rng: () => number = Math.random): number {
    if (max < min) return min;
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  /** Uniform float in [min, max] inclusive of min, exclusive of max. */
  static randFloat(min: number, max: number, rng: () => number = Math.random): number {
    return min + (max - min) * rng();
  }
}
