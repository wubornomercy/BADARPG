import { describe, it, expect } from 'vitest';
import { StatManager, StatType, ModifierType, SourceType } from '../index.js';

/**
 * cache.test — dirty flag is set on every invalidating event, the cache
 * holds and reuses values otherwise, and derived-stat dependents are
 * invalidated transitively when their primary attribute changes.
 */
describe('Dirty flag + cache invalidation', () => {
  it('after first read, stat is no longer dirty', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(true);     // not yet cached
    sm.getFinalStat(StatType.MAX_HP);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(false);
  });

  it('adding a modifier marks the affected stat dirty', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    sm.getFinalStat(StatType.MAX_HP);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(false);
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.FLAT, value: 50, sourceType: SourceType.ITEM, sourceId: 'helm' });
    expect(sm.isDirty(StatType.MAX_HP)).toBe(true);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(150);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(false);
  });

  it('removing a modifier marks the affected stat dirty', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    const id = sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.FLAT, value: 50, sourceType: SourceType.ITEM, sourceId: 'helm' });
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(150);
    expect(sm.modifiers.remove(id)).toBe(true);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(true);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(100);
  });

  it('removeBySource invalidates every affected stat', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    sm.setBase(StatType.ARMOR, 0);
    sm.modifiers.add({ id: '', stat: StatType.MAX_HP, modifierType: ModifierType.FLAT, value: 50, sourceType: SourceType.ITEM, sourceId: 'plate' });
    sm.modifiers.add({ id: '', stat: StatType.ARMOR,  modifierType: ModifierType.FLAT, value: 80, sourceType: SourceType.ITEM, sourceId: 'plate' });
    sm.getFinalStat(StatType.MAX_HP);
    sm.getFinalStat(StatType.ARMOR);

    const removed = sm.modifiers.removeBySource('plate');
    expect(removed).toBe(2);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(true);
    expect(sm.isDirty(StatType.ARMOR)).toBe(true);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(100);
    expect(sm.getFinalStat(StatType.ARMOR)).toBe(0);
  });

  it('primary attribute change invalidates ALL its derived targets', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    sm.setBase(StatType.ARMOR, 0);
    sm.setBase(StatType.MELEE_DAMAGE, 100);
    sm.setBase(StatType.STRENGTH, 0);
    sm.getFinalStat(StatType.MAX_HP);
    sm.getFinalStat(StatType.ARMOR);
    sm.getFinalStat(StatType.MELEE_DAMAGE);

    sm.setBase(StatType.STRENGTH, 10);

    expect(sm.isDirty(StatType.MAX_HP)).toBe(true);
    expect(sm.isDirty(StatType.ARMOR)).toBe(true);
    expect(sm.isDirty(StatType.MELEE_DAMAGE)).toBe(true);
    expect(sm.getFinalStat(StatType.MAX_HP)).toBe(140);
    expect(sm.getFinalStat(StatType.ARMOR)).toBe(10);
    expect(sm.getFinalStat(StatType.MELEE_DAMAGE)).toBeCloseTo(105, 5);
  });

  it('condition change invalidates stats with conditional modifiers', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MOVE_SPEED, 5.2);
    sm.modifiers.add({
      id: '', stat: StatType.MOVE_SPEED, modifierType: ModifierType.INCREASED, value: 30,
      sourceType: SourceType.PASSIVE, sourceId: 'fleet',
      condition: { type: 'whileMoving' },
    });
    sm.setCondition('isMoving', false);
    expect(sm.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(5.2, 5);
    expect(sm.isDirty(StatType.MOVE_SPEED)).toBe(false);
    sm.setCondition('isMoving', true);
    expect(sm.isDirty(StatType.MOVE_SPEED)).toBe(true);
    expect(sm.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(5.2 * 1.3, 5);
  });

  it('setting the same base value twice does not invalidate the cache', () => {
    const sm = new StatManager();
    sm.setBase(StatType.MAX_HP, 100);
    sm.getFinalStat(StatType.MAX_HP);
    expect(sm.isDirty(StatType.MAX_HP)).toBe(false);
    sm.setBase(StatType.MAX_HP, 100); // identical
    expect(sm.isDirty(StatType.MAX_HP)).toBe(false);
  });

  it('tag-filtered queries bypass the cache', () => {
    const sm = new StatManager();
    sm.setBase(StatType.PHYSICAL_DAMAGE, 100);
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.INCREASED, value: 30, sourceType: SourceType.ITEM, sourceId: 'gloves', tags: ['projectile'] });

    // Non-tagged query caches the result.
    const baseRes = sm.getFinalStat(StatType.PHYSICAL_DAMAGE);
    expect(baseRes).toBe(100);
    expect(sm.isDirty(StatType.PHYSICAL_DAMAGE)).toBe(false);

    // Tagged query must NOT reuse the non-tagged cached value.
    const tagged = sm.getFinalStat(StatType.PHYSICAL_DAMAGE, ['projectile']);
    expect(tagged).toBeCloseTo(130, 5);

    // Non-tagged cache is still valid afterward.
    expect(sm.getFinalStat(StatType.PHYSICAL_DAMAGE)).toBe(100);
  });
});
