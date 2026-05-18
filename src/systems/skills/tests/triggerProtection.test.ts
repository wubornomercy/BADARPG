import { describe, it, expect } from 'vitest';
import {
  SkillManager, SkillBehaviorType, SkillTargetingType, MAX_TRIGGER_CHAIN_DEPTH,
  ProjectileBehavior, NovaBehavior, DashBehavior, BeamBehavior, GroundAOEBehavior,
  CastFailReason, type SkillDefinition, type SkillCaster, type SkillWorld,
} from '../index.js';
import { DamagePipeline } from '../../combat/index.js';
import { StatManager } from '../../stats/index.js';

/**
 * triggerProtection.test — recursion guard via `triggerProtection`, and
 * the global chain-depth cap (MAX_TRIGGER_CHAIN_DEPTH = 16).
 */

function makeCaster(): SkillCaster {
  return {
    id: 'P1', hp: 100, hpMax: 100, x: 0, y: 0,
    mana: 1000, maxMana: 1000, alive: true, castingUntil: 0,
    statManager: new StatManager(),
  } as SkillCaster;
}

function setup() {
  const world: SkillWorld = { enemiesInRadius: () => [] };
  const pipeline = new DamagePipeline(() => 0.99);
  const sm = new SkillManager(pipeline, world);
  sm.registerBehavior(SkillBehaviorType.PROJECTILE, new ProjectileBehavior());
  sm.registerBehavior(SkillBehaviorType.NOVA,        new NovaBehavior());
  sm.registerBehavior(SkillBehaviorType.DASH,        new DashBehavior());
  sm.registerBehavior(SkillBehaviorType.BEAM,        new BeamBehavior());
  sm.registerBehavior(SkillBehaviorType.GROUND_AOE,  new GroundAOEBehavior());
  return { sm };
}

function trivialNova(id: string, opts: Partial<SkillDefinition> = {}): SkillDefinition {
  return {
    id, name: id, description: id, icon: '',
    tags: [], behaviorType: SkillBehaviorType.NOVA, targetingType: SkillTargetingType.SELF_CENTERED,
    castTime: 0, cooldown: 0, manaCost: 0,
    ...opts,
  };
}

describe('Trigger protection + chain depth cap', () => {
  it('TEST 5 — triggerProtection blocks the skill from re-triggering itself in-chain', () => {
    const { sm } = setup();
    const skill = trivialNova('selfTrigger', { triggerProtection: true });
    sm.register(skill);
    const c = makeCaster();

    // First cast: not in chain history → succeeds.
    const r1 = sm.trigger(c, 'selfTrigger', {
      casterId: c.id, skillId: 'selfTrigger',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
      triggeredBy: 'crit',
      chainDepth: 1,
    }, 0);
    expect(r1.ok).toBe(true);

    // Retrigger from inside the same chain (history contains its own id) → blocked.
    const history = new Set(['selfTrigger']);
    const r2 = sm.trigger(c, 'selfTrigger', {
      casterId: c.id, skillId: 'selfTrigger',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
      triggeredBy: 'crit',
      chainDepth: 2,
      chainHistory: history,
    } as any, 1);
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe(CastFailReason.TRIGGER_PROTECTED);
  });

  it('TEST 5b — chain depth above the cap aborts execution', () => {
    const { sm } = setup();
    sm.register(trivialNova('chainy'));
    const c = makeCaster();

    const r = sm.trigger(c, 'chainy', {
      casterId: c.id, skillId: 'chainy',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
      triggeredBy: 'parent',
      chainDepth: MAX_TRIGGER_CHAIN_DEPTH + 1,
    }, 0);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(CastFailReason.CHAIN_DEPTH_EXCEEDED);
  });

  it('skill with canTrigger=false rejects trigger entry', () => {
    const { sm } = setup();
    sm.register(trivialNova('notriggers', { canTrigger: false }));
    const c = makeCaster();
    const r = sm.trigger(c, 'notriggers', {
      casterId: c.id, skillId: 'notriggers',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
      triggeredBy: 'crit',
      chainDepth: 1,
    }, 0);
    expect(r.ok).toBe(false);
  });

  it('non-protected skill DOES allow self-retrigger', () => {
    const { sm } = setup();
    sm.register(trivialNova('safeChain', { triggerProtection: false }));
    const c = makeCaster();
    const history = new Set(['safeChain']);
    const r = sm.trigger(c, 'safeChain', {
      casterId: c.id, skillId: 'safeChain',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
      triggeredBy: 'crit',
      chainDepth: 2,
      chainHistory: history,
    } as any, 0);
    expect(r.ok).toBe(true);
  });
});
