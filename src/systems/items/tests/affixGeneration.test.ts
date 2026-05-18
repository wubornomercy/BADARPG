import { describe, it, expect } from 'vitest';
import {
  ItemManager, AffixManager, LootGenerator,
  STARTER_BASES, STARTER_AFFIXES, AffixType,
  ItemRarity,
} from '../index.js';
import type { AffixDefinition } from '../types/AffixDefinition.js';
import { StatType } from '../../stats/types/StatType.js';
import { ModifierType } from '../../stats/types/ModifierType.js';

/**
 * affixGeneration.test — rarity-driven affix counts, duplicate-prevention,
 * and itemLevel gating.
 *
 * Tests covered: 1, 2, 3, 4, 11.
 */

function setup() {
  const items = new ItemManager();
  items.registerAll(STARTER_BASES);
  const affixes = new AffixManager();
  affixes.registerAll(STARTER_AFFIXES);
  const gen = new LootGenerator(items, affixes);
  return { items, affixes, gen };
}

describe('Affix generation', () => {
  it('TEST 1 — NORMAL items have zero affixes', () => {
    const { gen } = setup();
    for (let i = 0; i < 50; i++) {
      const it = gen.generate({ itemLevel: 5, forcedRarity: ItemRarity.NORMAL })!;
      expect(it.prefixes.length).toBe(0);
      expect(it.suffixes.length).toBe(0);
    }
  });

  it('TEST 2 — MAGIC items have 1 prefix OR 1 suffix OR both (total 1-2)', () => {
    const { gen } = setup();
    let sawPrefixOnly = false, sawSuffixOnly = false, sawBoth = false;
    for (let i = 0; i < 200; i++) {
      const it = gen.generate({ itemLevel: 5, forcedRarity: ItemRarity.MAGIC })!;
      const p = it.prefixes.length, s = it.suffixes.length;
      expect(p).toBeLessThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(1);
      expect(p + s).toBeGreaterThanOrEqual(1);
      expect(p + s).toBeLessThanOrEqual(2);
      if (p === 1 && s === 0) sawPrefixOnly = true;
      if (p === 0 && s === 1) sawSuffixOnly = true;
      if (p === 1 && s === 1) sawBoth = true;
    }
    // All three branches should appear with 200 samples.
    expect(sawPrefixOnly && sawSuffixOnly && sawBoth).toBe(true);
  });

  it('TEST 3 — RARE items have 1-3 prefixes AND 1-3 suffixes', () => {
    const { gen } = setup();
    for (let i = 0; i < 200; i++) {
      const it = gen.generate({ itemLevel: 5, forcedRarity: ItemRarity.RARE })!;
      expect(it.prefixes.length).toBeGreaterThanOrEqual(1);
      expect(it.prefixes.length).toBeLessThanOrEqual(3);
      expect(it.suffixes.length).toBeGreaterThanOrEqual(1);
      expect(it.suffixes.length).toBeLessThanOrEqual(3);
    }
  });

  it('TEST 4 — no duplicate affixes within a single item', () => {
    const { gen } = setup();
    for (let i = 0; i < 200; i++) {
      const it = gen.generate({ itemLevel: 5, forcedRarity: ItemRarity.RARE })!;
      const ids = new Set<string>();
      for (const r of it.prefixes) {
        expect(ids.has(r.affixId)).toBe(false);
        ids.add(r.affixId);
      }
      for (const r of it.suffixes) {
        expect(ids.has(r.affixId)).toBe(false);
        ids.add(r.affixId);
      }
    }
  });

  it('TEST 11 — itemLevel gates affixes (high-min affix never rolls at low level)', () => {
    const { items, affixes, gen: _gen } = setup();
    const hardAffix: AffixDefinition = {
      id: 'pfx_endgame',
      name: 'EndGame',
      affixType: AffixType.PREFIX,
      tags: [],
      minItemLevel: 20,
      weight: 999, // huge weight — would dominate the pool if eligible
      statTarget: StatType.MAX_HP,
      modifierType: ModifierType.FLAT,
      tiers: [{ tier: 1, minValue: 1, maxValue: 2, weight: 1 }],
    };
    affixes.register(hardAffix);
    const gen = new LootGenerator(items, affixes);

    // Hundred RARE rolls at iLvl 10 — should NEVER pick the endgame affix.
    for (let i = 0; i < 100; i++) {
      const it = gen.generate({ itemLevel: 10, forcedRarity: ItemRarity.RARE })!;
      for (const r of it.prefixes) expect(r.affixId).not.toBe('pfx_endgame');
    }
    // At iLvl 30 the affix becomes eligible and (given the absurd weight) usually appears.
    let foundCount = 0;
    for (let i = 0; i < 100; i++) {
      const it = gen.generate({ itemLevel: 30, forcedRarity: ItemRarity.RARE })!;
      if (it.prefixes.some((r) => r.affixId === 'pfx_endgame')) foundCount++;
    }
    expect(foundCount).toBeGreaterThan(20); // huge weight → very common
  });

  it('rolled values fall inside the tier bounds', () => {
    const { gen } = setup();
    for (let i = 0; i < 100; i++) {
      const it = gen.generate({ itemLevel: 5, forcedRarity: ItemRarity.RARE })!;
      for (const r of [...it.prefixes, ...it.suffixes]) {
        const def = STARTER_AFFIXES.find((a) => a.id === r.affixId)!;
        const tier = def.tiers.find((t) => t.tier === r.tier)!;
        expect(r.rolledValue).toBeGreaterThanOrEqual(tier.minValue);
        expect(r.rolledValue).toBeLessThanOrEqual(tier.maxValue);
      }
    }
  });
});
