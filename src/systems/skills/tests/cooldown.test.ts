import { describe, it, expect } from 'vitest';
import { SkillCooldownManager } from '../core/SkillCooldownManager.js';
import { StatManager, StatType, ModifierType, SourceType } from '../../stats/index.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import { SkillBehaviorType } from '../types/SkillBehaviorType.js';
import { SkillTargetingType } from '../types/SkillTargetingType.js';

/**
 * cooldown.test — spec formula `baseCD / (1 + cdr%)`, independence per
 * skill, and zero-cooldown skills.
 */

function makeSkill(id: string, cooldown: number): SkillDefinition {
  return {
    id, name: id, description: id, icon: '',
    tags: [], behaviorType: SkillBehaviorType.NOVA, targetingType: SkillTargetingType.SELF_CENTERED,
    castTime: 0, cooldown, manaCost: 0,
  };
}

describe('Cooldown manager', () => {
  it('zero-cooldown skill never reports on cooldown', () => {
    const cd = new SkillCooldownManager();
    const skill = makeSkill('zero', 0);
    cd.start(skill, undefined, 0);
    expect(cd.isOnCooldown('zero', 0)).toBe(false);
    expect(cd.isOnCooldown('zero', 999999)).toBe(false);
  });

  it('base cooldown without CDR equals base duration', () => {
    const cd = new SkillCooldownManager();
    const skill = makeSkill('a', 4); // 4 seconds
    cd.start(skill, undefined, 1000);
    expect(cd.isOnCooldown('a', 1000)).toBe(true);
    expect(cd.isOnCooldown('a', 4999)).toBe(true);
    expect(cd.remaining('a', 1000)).toBeCloseTo(4000, -1);
    // Boundary: at readyAt (1000 + 4000 = 5000), the skill is OFF cooldown.
    expect(cd.isOnCooldown('a', 5000)).toBe(false);
  });

  it('CDR formula: 4 s cooldown with 50% CDR → 2.666 s', () => {
    const sm = new StatManager();
    sm.modifiers.add({
      id: '', stat: StatType.COOLDOWN_REDUCTION, modifierType: ModifierType.FLAT,
      value: 50, sourceType: SourceType.PASSIVE, sourceId: 'p',
    });
    expect(sm.getFinalStat(StatType.COOLDOWN_REDUCTION)).toBe(50);

    const cd = new SkillCooldownManager();
    cd.start(makeSkill('a', 4), sm, 0);
    // 4000 / 1.5 = 2666.66...
    expect(cd.remaining('a', 0)).toBeCloseTo(2666.66, 0);
  });

  it('CDR cap (75%) honored via StatManager clamping', () => {
    const sm = new StatManager();
    sm.modifiers.add({
      id: '', stat: StatType.COOLDOWN_REDUCTION, modifierType: ModifierType.FLAT,
      value: 999, sourceType: SourceType.PASSIVE, sourceId: 'p',
    });
    // StatManager clamps CDR at 75
    expect(sm.getFinalStat(StatType.COOLDOWN_REDUCTION)).toBe(75);

    const cd = new SkillCooldownManager();
    cd.start(makeSkill('a', 4), sm, 0);
    // 4000 / (1 + 0.75) = 4000 / 1.75 ≈ 2285.71
    expect(cd.remaining('a', 0)).toBeCloseTo(2285.71, 0);
  });

  it('cooldowns are tracked independently per skill', () => {
    const cd = new SkillCooldownManager();
    cd.start(makeSkill('a', 4), undefined, 0);
    cd.start(makeSkill('b', 8), undefined, 0);
    expect(cd.isOnCooldown('a', 5000)).toBe(false);
    expect(cd.isOnCooldown('b', 5000)).toBe(true);
    expect(cd.isOnCooldown('b', 8001)).toBe(false);
  });

  it('cooldown snapshot exposes remaining time for debug rendering', () => {
    const cd = new SkillCooldownManager();
    cd.start(makeSkill('a', 4), undefined, 1000);
    cd.start(makeSkill('b', 8), undefined, 1000);
    const snap = cd.snapshot(2000);
    expect(snap['a']).toBeCloseTo(3000, -1);
    expect(snap['b']).toBeCloseTo(7000, -1);
  });
});
