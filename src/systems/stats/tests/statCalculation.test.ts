import { describe, it, expect } from 'vitest';
import {
  StatManager,
  StatType,
  ModifierType,
  SourceType,
  PLAYER_LEVEL_1_BASE,
} from '../index.js';

/**
 * statCalculation.test — end-to-end pipeline order, derived-stat
 * propagation, tag matching, and cap behaviour.
 */
describe('Stat calculation pipeline', () => {
  it('returns base value when no modifiers present', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(100);
  });

  it('applies pipeline order: base → flat → increased → more', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PROJECTILE_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.FLAT,      value: 20, sourceType: SourceType.ITEM,    sourceId: 'bow1' });
    sm.modifiers.add({ id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.INCREASED, value: 50, sourceType: SourceType.PASSIVE, sourceId: 'p1' });
    sm.modifiers.add({ id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.MORE,      value: 30, sourceType: SourceType.BUFF,    sourceId: 'frenzy' });
    // (100 + 20) * 1.50 * 1.30 = 234
    expect(sm.getFinalStat(StatType.PROJECTILE_DAMAGE)).toBeCloseTo(234, 5);
  });

  it('STR derived contribution: 10 STR adds 40 maxHP, 10 armor, +5% melee', () => {
    const sm = new StatManager();
    sm.setBases(PLAYER_LEVEL_1_BASE);
    const hp0 = sm.getFinalStat(StatType.MAX_HP);
    const armor0 = sm.getFinalStat(StatType.ARMOR);

    sm.setBase(StatType.STRENGTH, 10);

    expect(sm.getFinalStat(StatType.MAX_HP) - hp0).toBeCloseTo(40, 5);
    expect(sm.getFinalStat(StatType.ARMOR) - armor0).toBeCloseTo(10, 5);
    // base meleeDamage is 0 → 0 * (1 + 0.05) = 0. Test increased contribution via
    // a non-zero base instead.
    sm.setBase(StatType.MELEE_DAMAGE, 100);
    expect(sm.getFinalStat(StatType.MELEE_DAMAGE)).toBeCloseTo(105, 5);
  });

  it('VIT derived contribution: 10 VIT adds 80 maxHP and 4 hpRegen', () => {
    const sm = new StatManager();
    sm.setBases(PLAYER_LEVEL_1_BASE);
    const hp0 = sm.getFinalStat(StatType.MAX_HP);
    const hpr0 = sm.getFinalStat(StatType.HP_REGEN);

    sm.setBase(StatType.VITALITY, 10);

    expect(sm.getFinalStat(StatType.MAX_HP) - hp0).toBeCloseTo(80, 5);
    expect(sm.getFinalStat(StatType.HP_REGEN) - hpr0).toBeCloseTo(4, 5);
  });

  it('STR and VIT both feed maxHP (additive)', () => {
    const sm = new StatManager();
    sm.setBases(PLAYER_LEVEL_1_BASE);
    sm.setBase(StatType.STRENGTH, 10);   // +40
    sm.setBase(StatType.VITALITY, 10);   // +80
    expect(sm.getFinalStat(StatType.MAX_HP)).toBeCloseTo(100 + 40 + 80, 5);
  });

  it('tag-gated modifier only applies when context tags match', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PHYSICAL_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 30, sourceType: SourceType.ITEM, sourceId: 'gloves', tags: ['projectile'] });
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 10, sourceType: SourceType.ITEM, sourceId: 'belt' });

    // No context: only untagged mods apply.
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBeCloseTo(110, 5);
    // Projectile context: both apply.
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE, ['projectile'])).toBeCloseTo(140, 5);
    // Melee context: only the untagged belt applies.
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE, ['melee'])).toBeCloseTo(110, 5);
  });

  it('modifier with multiple tags requires ALL tags present in context', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PHYSICAL_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 50, sourceType: SourceType.PASSIVE, sourceId: 'p', tags: ['projectile', 'crit'] });
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE, ['projectile'])).toBe(100);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE, ['crit'])).toBe(100);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE, ['projectile', 'crit'])).toBeCloseTo(150, 5);
  });

  it('applies resistance cap (75)', () => {
    const sm = new StatManager();
    sm.setBase(StatType.FIRE_RESIST, 50);
    sm.modifiers.add({ id: '', stat: StatType.FIRE_RESIST, modifierType: ModifierType.FLAT, value: 60, sourceType: SourceType.ITEM, sourceId: 'amulet' });
    expect(sm.getFinalStat(StatType.FIRE_RESIST)).toBe(75);
  });

  it('applies crit chance cap (100)', () => {
    const sm = new StatManager();
    sm.setBase(StatType.CRIT_CHANCE, 5);
    sm.modifiers.add({ id: '', stat: StatType.CRIT_CHANCE, modifierType: ModifierType.FLAT, value: 200, sourceType: SourceType.PASSIVE, sourceId: 'lucky' });
    expect(sm.getFinalStat(StatType.CRIT_CHANCE)).toBe(100);
  });

  it('applies life steal cap (40)', () => {
    const sm = new StatManager();
    sm.setBase(StatType.LIFE_STEAL, 0);
    sm.modifiers.add({ id: '', stat: StatType.LIFE_STEAL, modifierType: ModifierType.FLAT, value: 100, sourceType: SourceType.ITEM, sourceId: 'vampblade' });
    expect(sm.getFinalStat(StatType.LIFE_STEAL)).toBe(40);
  });

  it('move speed bonus cap (+200% over base)', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MOVE_SPEED, 5.2);
    sm.modifiers.add({ id: '', stat: StatType.MOVE_SPEED, modifierType: ModifierType.INCREASED, value: 500, sourceType: SourceType.BUFF, sourceId: 'fleet' });
    // bonus cap is +200% over base → final ≤ 5.2 * 3 = 15.6
    expect(sm.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(15.6, 5);
  });
});
