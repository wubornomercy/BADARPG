import { describe, it, expect } from 'vitest';
import { StatManager, StatType, ModifierType, SourceType } from '../index.js';

/**
 * condition.test — conditional modifiers activate/deactivate as condition
 * state mutates, and the cache reflects those transitions.
 */
describe('Conditional modifiers', () => {
  it('whileMoving activates only when isMoving=true', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MOVE_SPEED, 5.2);
    sm.modifiers.add({
      id: '', stat: StatType.MOVE_SPEED, modifierType: ModifierType.INCREASED, value: 30,
      sourceType: SourceType.PASSIVE, sourceId: 'fleet',
      condition: { type: 'whileMoving' },
    });

    sm.setCondition('isMoving', false);
    expect(sm.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(5.2, 5);

    sm.setCondition('isMoving', true);
    expect(sm.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(5.2 * 1.3, 5);

    sm.setCondition('isMoving', false);
    expect(sm.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(5.2, 5);
  });

  it('onLowLife activates only when condition is true', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PHYSICAL_DAMAGE, 100);
    sm.modifiers.add({
      id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.MORE, value: 50,
      sourceType: SourceType.PASSIVE, sourceId: 'desperate',
      condition: { type: 'onLowLife' },
    });

    sm.setCondition('onLowLife', false);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBe(100);
    sm.setCondition('onLowLife', true);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBeCloseTo(150, 5);
  });

  it('nearbyEnemiesGte threshold gating', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PHYSICAL_DAMAGE, 100);
    sm.modifiers.add({
      id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.MORE, value: 25,
      sourceType: SourceType.PASSIVE, sourceId: 'crowdedFighter',
      condition: { type: 'nearbyEnemiesGte', value: 3 },
    });

    sm.setCondition('nearbyEnemyCount', 1);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBe(100);

    sm.setCondition('nearbyEnemyCount', 4);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBeCloseTo(125, 5);

    sm.setCondition('nearbyEnemyCount', 2);
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBe(100);
  });

  it('withBowEquipped reads equippedWeaponType', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PROJECTILE_DAMAGE, 100);
    sm.modifiers.add({
      id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.INCREASED, value: 40,
      sourceType: SourceType.PASSIVE, sourceId: 'archer',
      condition: { type: 'withBowEquipped' },
    });
    sm.setCondition('equippedWeaponType', 'sword');
    expect(sm.getFinalStat(StatType.PROJECTILE_DAMAGE)).toBe(100);
    sm.setCondition('equippedWeaponType', 'bow');
    expect(sm.getFinalStat(StatType.PROJECTILE_DAMAGE)).toBeCloseTo(140, 5);
  });

  it('unknown condition type falls back to equality on conditionState', () => {
    const sm = new StatManager();
    sm.setBase(StatType.SPELL_DAMAGE, 100);
    sm.modifiers.add({
      id: '', stat: StatType.SPELL_DAMAGE, modifierType: ModifierType.INCREASED, value: 25,
      sourceType: SourceType.BUFF, sourceId: 'arcane',
      condition: { type: 'arcaneCharged' }, // not a standard type
    });

    expect(sm.getFinalStat(StatType.SPELL_DAMAGE)).toBe(100);
    sm.setCondition('arcaneCharged', true);
    expect(sm.getFinalStat(StatType.SPELL_DAMAGE)).toBeCloseTo(125, 5);
  });
});
