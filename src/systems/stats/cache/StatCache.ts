import type { StatType } from '../types/StatType.js';

/**
 * StatCache — minimal final-value cache keyed by StatType.
 *
 * Semantics:
 *   - `get(stat)` returns the cached final value if any.
 *   - A stat is considered DIRTY iff it's not currently in the cache. The
 *     cache is populated only after an explicit `set()`; invalidations
 *     simply remove the entry.
 *   - StatManager owns invalidation policy: on modifier add/remove, level
 *     up, equipment change, condition change, or primary attribute change
 *     it calls `invalidate(stat)` for every affected stat.
 */
export class StatCache {
  private readonly cache: Map<StatType, number> = new Map();

  get(stat: StatType): number | undefined { return this.cache.get(stat); }

  set(stat: StatType, value: number): void { this.cache.set(stat, value); }

  isDirty(stat: StatType): boolean { return !this.cache.has(stat); }

  invalidate(stat: StatType): void { this.cache.delete(stat); }

  invalidateAll(): void { this.cache.clear(); }

  /** Snapshot for debug rendering — does not mutate cache. */
  snapshot(): Map<StatType, number> { return new Map(this.cache); }

  size(): number { return this.cache.size; }
}
