import { describe, it, expect } from 'vitest';
import { SkillResourceManager, type ResourceCaster } from '../core/SkillResourceManager.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import { SkillBehaviorType } from '../types/SkillBehaviorType.js';
import { SkillTargetingType } from '../types/SkillTargetingType.js';

function mkSkill(manaCost: number, hpCost = 0): SkillDefinition {
  return {
    id: 's', name: 's', description: 's', icon: '',
    tags: [], behaviorType: SkillBehaviorType.NOVA, targetingType: SkillTargetingType.SELF_CENTERED,
    castTime: 0, cooldown: 0, manaCost, hpCost,
  };
}
function mkCaster(mana: number, hp: number): ResourceCaster {
  return { mana, maxMana: 100, hp, hpMax: 100 };
}

describe('Resource manager — mana / HP cost', () => {
  it('canPay returns true when caster has enough mana', () => {
    const rm = new SkillResourceManager();
    expect(rm.canPay(mkCaster(20, 100), mkSkill(10))).toBe(true);
  });

  it('canPay returns false when caster is under mana', () => {
    const rm = new SkillResourceManager();
    expect(rm.canPay(mkCaster(5, 100), mkSkill(10))).toBe(false);
  });

  it('pay() debits mana exactly', () => {
    const rm = new SkillResourceManager();
    const c = mkCaster(20, 100);
    rm.pay(c, mkSkill(8));
    expect(c.mana).toBe(12);
  });

  it('HP cost applied AFTER mana per spec', () => {
    const rm = new SkillResourceManager();
    const c = mkCaster(20, 50);
    rm.pay(c, mkSkill(5, 10));
    expect(c.mana).toBe(15);
    expect(c.hp).toBe(40);
  });

  it('canPay rejects when HP cost would drop HP to zero', () => {
    const rm = new SkillResourceManager();
    expect(rm.canPay(mkCaster(20, 5), mkSkill(0, 10))).toBe(false);
  });

  it('zero-cost skill always payable', () => {
    const rm = new SkillResourceManager();
    expect(rm.canPay(mkCaster(0, 1), mkSkill(0))).toBe(true);
  });
});
