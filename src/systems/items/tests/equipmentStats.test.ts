import { describe, it, expect } from 'vitest';
import {
  ItemManager, AffixManager, EquipmentManager, LootGenerator,
  STARTER_BASES, STARTER_AFFIXES,
  BASE_TATTERED_HOOD, BASE_DISEASED_VEST, BASE_WORMCOIL_RING,
  ItemRarity, EquipmentSlot, type EquippedSet,
} from '../index.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * equipmentStats.test — implicit + affix flow through ItemStatApplier
 * → StatManager → getFinalStat.
 *
 * Tests covered: 6 (equip applies), 7 (unequip removes), 8 (implicits).
 */

function setup() {
  const items = new ItemManager();
  items.registerAll(STARTER_BASES);
  const affixes = new AffixManager();
  affixes.registerAll(STARTER_AFFIXES);
  const sm = new StatManager();
  sm.setBase(StatType.MAX_HP, 100);
  sm.setBase(StatType.ARMOR, 0);
  sm.setBase(StatType.POISON_DAMAGE, 0);
  const eq = new EquipmentManager(items, affixes, sm);
  const gen = new LootGenerator(items, affixes);
  return { items, affixes, sm, eq, gen };
}

describe('Equipment apply / remove', () => {
  it('TEST 6 + TEST 8 — equipping a NORMAL item applies its implicit', () => {
    const { sm, eq, gen } = setup();
    const baselineHP = sm.getFinalStat(StatType.MAX_HP);
    expect(baselineHP).toBe(100);

    const hood = gen.generate({
      itemLevel: 1,
      forcedRarity: ItemRarity.NORMAL,
      forcedBaseId: BASE_TATTERED_HOOD.id,
    })!;
    const slots: EquippedSet = {};
    const r = eq.equip(hood, slots);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe(EquipmentSlot.HELMET);

    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(baselineHP + 12);
  });

  it('TEST 7 — unequipping removes the applied modifiers', () => {
    const { sm, eq, gen } = setup();
    const hood = gen.generate({
      itemLevel: 1, forcedRarity: ItemRarity.NORMAL, forcedBaseId: BASE_TATTERED_HOOD.id,
    })!;
    const slots: EquippedSet = {};
    eq.equip(hood, slots);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(112);

    const removed = eq.unequip(slots, EquipmentSlot.HELMET);
    expect(removed).toBe(hood);
    expect(slots[EquipmentSlot.HELMET]).toBe(null);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(100);
  });

  it('equipping a second item into a held slot displaces the previous one', () => {
    const { sm, eq, gen } = setup();
    const slots: EquippedSet = {};

    const vestA = gen.generate({ itemLevel: 1, forcedRarity: ItemRarity.NORMAL, forcedBaseId: BASE_DISEASED_VEST.id })!;
    const vestB = gen.generate({ itemLevel: 1, forcedRarity: ItemRarity.NORMAL, forcedBaseId: BASE_DISEASED_VEST.id })!;
    eq.equip(vestA, slots);
    expect(sm.getFinalStat(StatType.ARMOR)).toBe(18);

    const r = eq.equip(vestB, slots);
    expect(r.unequipped).toBe(vestA);
    expect(slots[EquipmentSlot.CHEST]).toBe(vestB);
    // Implicit still only +18 because vestB also implicits +18.
    expect(sm.getFinalStat(StatType.ARMOR)).toBe(18);
  });

  it('ring base equips into ringLeft first, then ringRight when slot already full', () => {
    const { sm, eq, gen } = setup();
    const slots: EquippedSet = {};
    const ringA = gen.generate({ itemLevel: 1, forcedRarity: ItemRarity.NORMAL, forcedBaseId: BASE_WORMCOIL_RING.id })!;
    const ringB = gen.generate({ itemLevel: 1, forcedRarity: ItemRarity.NORMAL, forcedBaseId: BASE_WORMCOIL_RING.id })!;
    const r1 = eq.equip(ringA, slots);
    expect(r1.slot).toBe(EquipmentSlot.RING_LEFT);
    const r2 = eq.equip(ringB, slots);
    expect(r2.slot).toBe(EquipmentSlot.RING_RIGHT);
    // Both rings active simultaneously → +8 poison damage twice (stacks additively).
    expect(sm.getFinalStat(StatType.POISON_DAMAGE)).toBe(16);
  });

  it('TEST 12 — implicit + rolled affix both register as separate modifiers', () => {
    const { sm, eq, gen, affixes: _ } = setup();
    // Force a MAGIC item — at minimum it'll have one prefix or suffix.
    let hood = null;
    for (let i = 0; i < 30 && !hood; i++) {
      hood = gen.generate({ itemLevel: 1, forcedRarity: ItemRarity.MAGIC, forcedBaseId: BASE_TATTERED_HOOD.id });
    }
    expect(hood).not.toBeNull();
    const totalAffixes = hood!.prefixes.length + hood!.suffixes.length;
    expect(totalAffixes).toBeGreaterThanOrEqual(1);

    eq.equip(hood!, {});
    // 1 implicit (+12 hp) plus affix count = total modifiers from this item.
    const sourceId = `item_${hood!.instanceId}`;
    const allMods = sm.modifiers.all().filter((m) => m.sourceId === sourceId);
    expect(allMods.length).toBe(1 + totalAffixes);
  });
});
