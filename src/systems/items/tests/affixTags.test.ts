import { describe, it, expect } from 'vitest';
import {
  ItemManager, AffixManager, EquipmentManager, LootGenerator,
  STARTER_BASES, STARTER_AFFIXES,
  AFFIX_VICIOUS, AFFIX_VENOMOUS,
  BASE_ROTFANG_BOW,
  ItemRarity, type EquippedSet,
} from '../index.js';
import {
  DamagePipeline, DamageType, type CombatEntity, type DamageContext,
} from '../../combat/index.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * affixTags.test — TEST 9: tagged affixes scale damage correctly through
 * the combat pipeline's tag-aware IncreasedDamageCalculator.
 */

function makeTarget(): CombatEntity {
  return { id: 'tgt', hp: 10000, hpMax: 10000, x: 0, y: 0, alive: true, statManager: new StatManager() };
}

function setup() {
  const items = new ItemManager();
  items.registerAll(STARTER_BASES);
  const affixes = new AffixManager();
  affixes.registerAll(STARTER_AFFIXES);
  const sm = new StatManager();
  const eq = new EquipmentManager(items, affixes, sm);
  const gen = new LootGenerator(items, affixes);
  return { items, affixes, sm, eq, gen };
}

describe('Affix tag scaling', () => {
  it('TEST 9 — Vicious (tags: projectile) only boosts projectile attacks', () => {
    const { sm, gen, eq } = setup();
    const slots: EquippedSet = {};

    // Force a known Vicious roll — RARE forces both prefixes + suffixes;
    // we synthesize the rolled affix directly to keep the test
    // deterministic regardless of the affix lottery.
    sm.modifiers.add({
      id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: AFFIX_VICIOUS.modifierType,
      value: 24, sourceType: 'ITEM' as any, sourceId: 'test',
      tags: [...AFFIX_VICIOUS.tags],
    });

    const pipeline = new DamagePipeline(() => 0.99); // no crit, no dodge
    const src: CombatEntity = { id: 'src', hp: 1, hpMax: 1, x: 0, y: 0, alive: true, statManager: sm };
    const baseDamage = 100;

    // Projectile attack — Vicious applies → +24% projectile damage.
    const projCtx: DamageContext = {
      sourceEntityId: 'src', targetEntityId: 'tgt',
      sourceTags: ['projectile', 'spell'],
      baseDamage, damageType: DamageType.PHYSICAL,
      canCrit: false, canBeBlocked: false, canBeDodged: false,
    };
    const projResult = pipeline.resolve(src, makeTarget(), projCtx);
    expect(projResult.finalDamage).toBeCloseTo(124, 5);

    // Melee attack — context has no 'projectile' tag → Vicious silent.
    const meleeCtx: DamageContext = {
      sourceEntityId: 'src', targetEntityId: 'tgt',
      sourceTags: ['melee', 'attack'],
      baseDamage, damageType: DamageType.PHYSICAL,
      canCrit: false, canBeBlocked: false, canBeDodged: false,
    };
    const meleeResult = pipeline.resolve(src, makeTarget(), meleeCtx);
    expect(meleeResult.finalDamage).toBeCloseTo(100, 5);
  });

  it('Venomous (poison) boosts poison damage automatically', () => {
    const { sm } = setup();
    sm.modifiers.add({
      id: '', stat: StatType.POISON_DAMAGE, modifierType: AFFIX_VENOMOUS.modifierType,
      value: 28, sourceType: 'ITEM' as any, sourceId: 'test',
      tags: [...AFFIX_VENOMOUS.tags],
    });
    const pipeline = new DamagePipeline(() => 0.99);
    const src: CombatEntity = { id: 'src', hp: 1, hpMax: 1, x: 0, y: 0, alive: true, statManager: sm };

    const ctx: DamageContext = {
      sourceEntityId: 'src', targetEntityId: 'tgt',
      sourceTags: ['projectile', 'spell'],
      baseDamage: 100, damageType: DamageType.POISON,
      canCrit: false, canBeBlocked: false, canBeDodged: false,
    };
    const res = pipeline.resolve(src, makeTarget(), ctx);
    expect(res.finalDamage).toBeCloseTo(128, 5);
  });

  it('TEST 10 — dropped items preserve rolled values (round-trip equip / unequip is non-mutating)', () => {
    const { sm, eq, gen } = setup();
    const slots: EquippedSet = {};
    const item = gen.generate({
      itemLevel: 5, forcedRarity: ItemRarity.RARE, forcedBaseId: BASE_ROTFANG_BOW.id,
    })!;
    const snapshotPrefixes = JSON.stringify(item.prefixes);
    const snapshotSuffixes = JSON.stringify(item.suffixes);

    eq.equip(item, slots);
    eq.unequip(slots, 'weapon');
    eq.equip(item, slots);
    eq.unequip(slots, 'weapon');

    expect(JSON.stringify(item.prefixes)).toBe(snapshotPrefixes);
    expect(JSON.stringify(item.suffixes)).toBe(snapshotSuffixes);
  });
});
