import { describe, it, expect } from 'vitest';
import {
  SkillManager,
  SkillBehaviorType,
  SkillTargetingType,
  ProjectileBehavior, NovaBehavior, DashBehavior, BeamBehavior, GroundAOEBehavior,
  STARTER_SKILLS, SKILL_CORRUPT_BOLT,
  CastFailReason,
  type SkillCaster, type SkillWorld,
} from '../index.js';
import { DamagePipeline, type CombatEntity } from '../../combat/index.js';
import { DamageType } from '../../combat/types/DamageType.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * skillCast.test — end-to-end cast flow including cooldown application,
 * mana deduction, and the spec's triggered-skill exemptions.
 */

function emptyWorld(): SkillWorld {
  return { enemiesInRadius: () => [] };
}

function makeCaster(overrides: Partial<SkillCaster> = {}): SkillCaster {
  const sm = new StatManager();
  sm.setBase(StatType.MAX_MANA, 100);
  sm.setBase(StatType.MAX_HP,   100);
  return {
    id:           overrides.id ?? 'P1',
    hp:           overrides.hp ?? 100,
    hpMax:        100,
    mana:         overrides.mana ?? 100,
    maxMana:      100,
    x:            overrides.x ?? 0,
    y:            overrides.y ?? 0,
    alive:        overrides.alive ?? true,
    castingUntil: 0,
    statManager:  sm,
  } as SkillCaster;
}

function setup(world: SkillWorld = emptyWorld()) {
  const pipeline = new DamagePipeline(() => 0.99);
  const sm = new SkillManager(pipeline, world);
  sm.registerBehavior(SkillBehaviorType.PROJECTILE,  new ProjectileBehavior());
  sm.registerBehavior(SkillBehaviorType.NOVA,        new NovaBehavior());
  sm.registerBehavior(SkillBehaviorType.DASH,        new DashBehavior());
  sm.registerBehavior(SkillBehaviorType.BEAM,        new BeamBehavior());
  sm.registerBehavior(SkillBehaviorType.GROUND_AOE,  new GroundAOEBehavior());
  sm.registerAll(STARTER_SKILLS);
  return { sm, pipeline };
}

describe('Skill cast — validation', () => {
  it('TEST 2 — mana cost deducted on cast', () => {
    const { sm } = setup();
    const c = makeCaster({ mana: 100 });
    const r = sm.cast(c, SKILL_CORRUPT_BOLT.id, {
      casterId: c.id, skillId: SKILL_CORRUPT_BOLT.id,
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    }, 0);
    expect(r.ok).toBe(true);
    expect(c.mana).toBe(100 - SKILL_CORRUPT_BOLT.manaCost);
  });

  it('insufficient mana → fail with INSUFFICIENT_MANA', () => {
    const { sm } = setup();
    const c = makeCaster({ mana: 2 });
    const r = sm.cast(c, SKILL_CORRUPT_BOLT.id, {
      casterId: c.id, skillId: SKILL_CORRUPT_BOLT.id,
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    }, 0);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(CastFailReason.INSUFFICIENT_MANA);
    expect(c.mana).toBe(2); // not debited on failure
  });

  it('dead caster cannot cast', () => {
    const { sm } = setup();
    const c = makeCaster({ alive: false });
    const r = sm.cast(c, SKILL_CORRUPT_BOLT.id, {
      casterId: c.id, skillId: SKILL_CORRUPT_BOLT.id,
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    }, 0);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(CastFailReason.CASTER_DEAD);
  });

  it('TEST 1 — cooldown applies; second cast within cooldown fails', () => {
    const { sm } = setup();
    const c = makeCaster();
    // Use Venom Nova (4 s CD)
    const ctx = {
      casterId: c.id, skillId: 'venom_nova',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    };
    const r1 = sm.cast(c, 'venom_nova', ctx, 0);
    expect(r1.ok).toBe(true);
    // Even after cast time elapses, cooldown is still active
    const r2 = sm.cast(c, 'venom_nova', ctx, 1000);
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe(CastFailReason.COOLDOWN);
    // After full cooldown the skill can be cast again
    const r3 = sm.cast(c, 'venom_nova', ctx, 4100);
    expect(r3.ok).toBe(true);
  });

  it('TEST 4 — triggered cast ignores cast time (fires immediately)', () => {
    const { sm } = setup();
    const c = makeCaster();
    const r = sm.trigger(c, 'venom_nova', {
      casterId: c.id, skillId: 'venom_nova',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [], triggeredBy: 'something', chainDepth: 1,
    }, 0);
    expect(r.ok).toBe(true);
    expect(r.pending).not.toBe(true);     // not queued — fired immediately
    expect(r.firedAt).toBe(0);
  });

  it('TEST 3 — triggered cast ignores resource cost', () => {
    const { sm } = setup();
    const c = makeCaster({ mana: 0 });    // empty mana
    const r = sm.trigger(c, 'venom_nova', {
      casterId: c.id, skillId: 'venom_nova',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [], triggeredBy: 'crit', chainDepth: 1,
    }, 0);
    expect(r.ok).toBe(true);
    expect(c.mana).toBe(0); // not debited
  });

  it('non-triggered cast respects cast-time lock', () => {
    const { sm } = setup();
    const c = makeCaster();
    // Venom Nova has 0.5s cast time
    const ctx = {
      casterId: c.id, skillId: 'venom_nova',
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    };
    const r1 = sm.cast(c, 'venom_nova', ctx, 0);
    expect(r1.ok).toBe(true);
    expect(r1.pending).toBe(true);
    expect(c.castingUntil).toBeGreaterThan(0);
    // While still casting, trying to start another non-trigger cast fails
    const r2 = sm.cast(c, 'corrupt_bolt', {
      ...ctx, skillId: 'corrupt_bolt',
    }, 100);
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe(CastFailReason.STILL_CASTING);
  });
});
