import { describe, it, expect } from 'vitest';
import { WeightResolver } from '../generation/WeightResolver.js';
import {
  ItemManager, AffixManager, LootGenerator,
  STARTER_BASES, STARTER_AFFIXES, ItemRarity,
} from '../index.js';

/**
 * lootWeights.test — weighted random correctness and the spec's "higher
 * tier = rarer" guarantee.
 *
 * Tests covered: TEST 5 (affix tier weights).
 */

describe('WeightResolver', () => {
  it('returns null on empty input', () => {
    expect(WeightResolver.pick([])).toBe(null);
  });

  it('respects weight proportions across many samples', () => {
    const items = [
      { name: 'a', weight: 10 },
      { name: 'b', weight: 90 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 5000; i++) {
      counts[WeightResolver.pick(items)!.name]++;
    }
    expect(counts.a / 5000).toBeGreaterThan(0.05);
    expect(counts.a / 5000).toBeLessThan(0.15);
    expect(counts.b / 5000).toBeGreaterThan(0.85);
    expect(counts.b / 5000).toBeLessThan(0.95);
  });

  it('zero / negative weights are skipped', () => {
    const items = [
      { name: 'a', weight: 0 },
      { name: 'b', weight: -5 },
      { name: 'c', weight: 100 },
    ];
    for (let i = 0; i < 50; i++) {
      expect(WeightResolver.pick(items)!.name).toBe('c');
    }
  });
});

describe('Affix tier weights', () => {
  function setup() {
    const items = new ItemManager();
    items.registerAll(STARTER_BASES);
    const affixes = new AffixManager();
    affixes.registerAll(STARTER_AFFIXES);
    return new LootGenerator(items, affixes);
  }

  it('TEST 5 — higher tier numbers (weaker) appear more often than lower (stronger)', () => {
    const gen = setup();
    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (let i = 0; i < 2000; i++) {
      const it = gen.generate({ itemLevel: 5, forcedRarity: ItemRarity.RARE })!;
      for (const r of [...it.prefixes, ...it.suffixes]) {
        tierCounts[r.tier]++;
      }
    }
    // T3 should be the most common, T1 the rarest.
    expect(tierCounts[3]).toBeGreaterThan(tierCounts[2]);
    expect(tierCounts[2]).toBeGreaterThan(tierCounts[1]);
  });
});
