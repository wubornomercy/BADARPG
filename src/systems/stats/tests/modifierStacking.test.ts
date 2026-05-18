import { describe, it, expect } from 'vitest';
import { StatManager, StatType, ModifierType, SourceType } from '../index.js';

/**
 * modifierStacking.test — verifies that the three additive/multiplicative
 * stacking rules behave per the spec, and that OVERRIDE shortcuts the
 * whole pipeline.
 */
describe('Modifier stacking', () => {
  it('multiple INCREASED modifiers stack additively', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PHYSICAL_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 20, sourceType: SourceType.ITEM, sourceId: 'a' });
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 35, sourceType: SourceType.ITEM, sourceId: 'b' });
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 15, sourceType: SourceType.AURA, sourceId: 'c' });
    // 100 * (1 + 0.20 + 0.35 + 0.15) = 170
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBeCloseTo(170, 5);
  });

  it('multiple MORE modifiers multiply independently', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PROJECTILE_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.MORE, value: 30, sourceType: SourceType.BUFF,  sourceId: 'frenzy' });
    sm.modifiers.add({ id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.MORE, value: 20, sourceType: SourceType.SKILL, sourceId: 'support' });
    // 100 * 1.30 * 1.20 = 156
    expect(sm.getFinalStat(StatType.PROJECTILE_DAMAGE)).toBeCloseTo(156, 5);
  });

  it('FLAT modifiers stack additively before INCREASED', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.FLAT, value: 25, sourceType: SourceType.ITEM, sourceId: 'a' });
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.FLAT, value: 50, sourceType: SourceType.ITEM, sourceId: 'b' });
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.INCREASED, value: 50, sourceType: SourceType.PASSIVE, sourceId: 'c' });
    // (100 + 25 + 50) * 1.50 = 262.5
    expect(sm.getFinalStat(StatType.MAX_HP)).toBeCloseTo(262.5, 5);
  });

  it('INCREASED and MORE compose correctly: base * (1+sumInc) * eachMore', () => {
    const sm = new StatManager();
    sm.setBase(StatType.SPELL_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.SPELL_DAMAGE, modifierType: ModifierType.INCREASED, value: 100, sourceType: SourceType.PASSIVE, sourceId: 'a' });
    sm.modifiers.add({ id: '', stat: StatType.SPELL_DAMAGE, modifierType: ModifierType.INCREASED, value: 50,  sourceType: SourceType.PASSIVE, sourceId: 'b' });
    sm.modifiers.add({ id: '', stat: StatType.SPELL_DAMAGE, modifierType: ModifierType.MORE,      value: 50,  sourceType: SourceType.SKILL,   sourceId: 'c' });
    // 100 * (1 + 1.00 + 0.50) * 1.50 = 375
    expect(sm.getFinalStat(StatType.SPELL_DAMAGE)).toBeCloseTo(375, 5);
  });

  it('OVERRIDE has highest priority — replaces pipeline result', () => {
    const sm = new StatManager();
    sm.setBase(StatType.CRIT_CHANCE, 5);
    sm.modifiers.add({ id: '', stat: StatType.CRIT_CHANCE, modifierType: ModifierType.FLAT,      value: 50,  sourceType: SourceType.ITEM,    sourceId: 'a' });
    sm.modifiers.add({ id: '', stat: StatType.CRIT_CHANCE, modifierType: ModifierType.INCREASED, value: 200, sourceType: SourceType.PASSIVE, sourceId: 'b' });
    sm.modifiers.add({ id: '', stat: StatType.CRIT_CHANCE, modifierType: ModifierType.OVERRIDE,  value: 42,  sourceType: SourceType.SKILL,   sourceId: 'asn' });
    expect(sm.getFinalStat(StatType.CRIT_CHANCE)).toBe(42);
  });

  it('OVERRIDE last-write wins when multiple overrides present', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.OVERRIDE, value: 1,    sourceType: SourceType.MONSTER, sourceId: 'curse' });
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.OVERRIDE, value: 9999, sourceType: SourceType.SKILL,   sourceId: 'godmode' });
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(9999);
  });

  it('OVERRIDE still subject to clamps', () => {
    const sm = new StatManager();
    sm.setBase(StatType.FIRE_RESIST, 0);
    sm.modifiers.add({ id: '', stat: StatType.FIRE_RESIST, modifierType: ModifierType.OVERRIDE, value: 999, sourceType: SourceType.SKILL, sourceId: 'cheat' });
    expect(sm.getFinalStat(StatType.FIRE_RESIST)).toBe(75);
  });
});
