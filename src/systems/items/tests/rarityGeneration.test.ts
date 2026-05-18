import { describe, it, expect } from 'vitest';
import {
  ItemManager, AffixManager, LootGenerator,
  STARTER_BASES, STARTER_AFFIXES,
  ItemRarity, BASE_RARITY_WEIGHTS,
} from '../index.js';

/**
 * rarityGeneration.test — base rarity weight distribution.
 *
 * The spec values are 72/23/5. With 4 000 samples the distribution
 * should sit close to those means; we use a generous +/-5 percentage-
 * point tolerance to keep the test robust to RNG variance.
 */

function setup() {
  const items = new ItemManager();
  items.registerAll(STARTER_BASES);
  const affixes = new AffixManager();
  affixes.registerAll(STARTER_AFFIXES);
  return new LootGenerator(items, affixes);
}

describe('Rarity distribution', () => {
  it('approximates 72 / 23 / 5 across many samples', () => {
    const gen = setup();
    const N = 4000;
    const counts: Record<string, number> = { NORMAL: 0, MAGIC: 0, RARE: 0 };
    for (let i = 0; i < N; i++) {
      const it = gen.generate({ itemLevel: 5 })!;
      counts[it.rarity]++;
    }
    const normalPct = (counts.NORMAL / N) * 100;
    const magicPct  = (counts.MAGIC  / N) * 100;
    const rarePct   = (counts.RARE   / N) * 100;

    expect(normalPct).toBeGreaterThan(67);
    expect(normalPct).toBeLessThan(77);
    expect(magicPct).toBeGreaterThan(18);
    expect(magicPct).toBeLessThan(28);
    expect(rarePct).toBeGreaterThan(2);
    expect(rarePct).toBeLessThan(9);
  });

  it('forcedRarity overrides the random roll', () => {
    const gen = setup();
    for (let i = 0; i < 20; i++) {
      const r = gen.generate({ itemLevel: 1, forcedRarity: ItemRarity.RARE })!;
      expect(r.rarity).toBe(ItemRarity.RARE);
    }
  });

  it('rarity table sums to 100', () => {
    const total = BASE_RARITY_WEIGHTS.reduce((a, b) => a + b.weight, 0);
    expect(total).toBe(100);
  });
});
