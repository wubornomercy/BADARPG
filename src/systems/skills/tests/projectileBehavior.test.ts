import { describe, it, expect } from 'vitest';
import {
  SkillManager,
  SkillBehaviorType,
  ProjectileBehavior, NovaBehavior, DashBehavior, BeamBehavior, GroundAOEBehavior,
  STARTER_SKILLS, SKILL_CORRUPT_BOLT,
  ProjectileEntity, TILE_PX,
  type SkillCaster, type SkillWorld,
} from '../index.js';
import { DamagePipeline, type CombatEntity } from '../../combat/index.js';
import { DamageType } from '../../combat/types/DamageType.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * projectileBehavior.test — ownership preservation, hit-cooldown,
 * delta-time movement, maxDistance kill, ON_SKILL_HIT event dispatch.
 */

function makeCaster(): SkillCaster {
  const sm = new StatManager();
  sm.setBase(StatType.MAX_MANA, 100);
  return {
    id: 'P1', hp: 100, hpMax: 100, x: 0, y: 0,
    mana: 100, maxMana: 100, alive: true, castingUntil: 0,
    statManager: sm,
  } as SkillCaster;
}

function makeEnemy(id: string, x: number, y: number): CombatEntity {
  return { id, hp: 1000, hpMax: 1000, x, y, alive: true };
}

function setup(enemies: CombatEntity[]) {
  const world: SkillWorld = {
    enemiesInRadius(cx, cy, r) {
      const out: CombatEntity[] = [];
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - cx, dy = e.y - cy;
        if (dx * dx + dy * dy <= r * r) out.push(e);
      }
      return out;
    },
  };
  const pipeline = new DamagePipeline(() => 0.99); // no crit / no dodge
  const sm = new SkillManager(pipeline, world);
  sm.registerBehavior(SkillBehaviorType.PROJECTILE,  new ProjectileBehavior());
  sm.registerBehavior(SkillBehaviorType.NOVA,        new NovaBehavior());
  sm.registerBehavior(SkillBehaviorType.DASH,        new DashBehavior());
  sm.registerBehavior(SkillBehaviorType.BEAM,        new BeamBehavior());
  sm.registerBehavior(SkillBehaviorType.GROUND_AOE,  new GroundAOEBehavior());
  sm.registerAll(STARTER_SKILLS);
  sm.worldBounds = { minX: -1_000_000, minY: -1_000_000, maxX: 1_000_000, maxY: 1_000_000 };
  return { sm, pipeline };
}

describe('Projectile behaviour', () => {
  it('TEST 11 — ownerId / sourceSkillId / tags preserved on spawn', () => {
    const { sm } = setup([]);
    const caster = makeCaster();
    sm.cast(caster, SKILL_CORRUPT_BOLT.id, {
      casterId: caster.id, skillId: SKILL_CORRUPT_BOLT.id,
      castPosition: { x: caster.x, y: caster.y },
      direction: { x: 1, y: 0 },
      runtimeTags: ['fromInput'],
    }, 0);
    // Drive past the 0.25 s cast time so the projectile actually spawns.
    sm.update(300, 0);
    const list = sm.projectiles.all();
    expect(list.length).toBe(1);
    const p = list[0];
    expect(p.ownerId).toBe('P1');
    expect(p.sourceSkillId).toBe(SKILL_CORRUPT_BOLT.id);
    expect(p.tags).toEqual(expect.arrayContaining(['projectile', 'spell', 'poison', 'fromInput']));
    expect(p.creationTime).toBe(300);
  });

  it('TEST 6 — projectile dies after travelling maxDistance', () => {
    const { sm } = setup([]);
    const caster = makeCaster();
    sm.cast(caster, SKILL_CORRUPT_BOLT.id, {
      casterId: caster.id, skillId: SKILL_CORRUPT_BOLT.id,
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    }, 0);
    sm.update(300, 0);
    expect(sm.projectiles.count()).toBe(1);

    // Corrupt Bolt: maxDistance 14 units × 32 px = 448 px at speed 512 px/s
    // → ~0.875 s of flight. Step in 50-ms increments for 1.0 s.
    let now = 300;
    for (let i = 0; i < 25; i++) {
      now += 50;
      sm.update(now, 0.05);
    }
    expect(sm.projectiles.count()).toBe(0);
  });

  it('TEST 7 — hitCooldown prevents same target from re-hitting within window', () => {
    // Direct ProjectileEntity test — bypasses manager so we can control
    // collision timing precisely.
    const p = new ProjectileEntity({
      ownerId: 'P', sourceSkillId: 'S', tags: ['projectile'],
      x: 0, y: 0, dirX: 1, dirY: 0,
      cfg: { speed: 0, radius: 0.5, maxDistance: 100, pierceCount: 99, chainCount: 0, forkCount: 0, hitCooldown: 0.15 },
      damageType: DamageType.PHYSICAL, baseDamage: 10, canCrit: false,
      now: 0,
    });
    expect(p.canHit('E1', 0)).toBe(true);
    p.recordHit('E1', 0);
    expect(p.canHit('E1', 100)).toBe(false);   // 100 ms < 150 ms cooldown
    expect(p.canHit('E1', 160)).toBe(true);    // 160 ms >= 150 ms cooldown
  });

  it('hits enemy in range and applies damage through the pipeline', () => {
    const enemy = makeEnemy('E1', 80, 0); // 80 px to the right of caster
    const { sm } = setup([enemy]);
    const caster = makeCaster();
    sm.cast(caster, SKILL_CORRUPT_BOLT.id, {
      casterId: caster.id, skillId: SKILL_CORRUPT_BOLT.id,
      castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      runtimeTags: [],
    }, 0);
    // Drive past the cast time
    sm.update(300, 0);
    // Step a few frames so the projectile traverses the 80 px gap.
    let now = 300;
    for (let i = 0; i < 10; i++) { now += 30; sm.update(now, 0.03); }
    expect(enemy.hp).toBeLessThan(1000);
    expect(enemy.hp).toBeCloseTo(1000 - 18, 0);
  });

  it('TEST 12-equivalent — delta-time movement is step-size invariant', () => {
    // Two independent setups: one big 0.4 s step vs twenty 0.02 s steps.
    // Both projectiles should arrive at the same world x.
    function spawn(stepFn: (sm: SkillManager, casterX: number) => number): number {
      const env = setup([]);
      const c = makeCaster();
      env.sm.cast(c, SKILL_CORRUPT_BOLT.id, {
        casterId: c.id, skillId: SKILL_CORRUPT_BOLT.id,
        castPosition: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
        runtimeTags: [],
      }, 0);
      env.sm.update(300, 0); // pass cast time → projectile exists
      return stepFn(env.sm, c.x);
    }

    const xA = spawn((sm) => {
      sm.update(700, 0.4);
      return sm.projectiles.all()[0].x;
    });

    const xB = spawn((sm) => {
      let now = 300;
      for (let i = 0; i < 20; i++) {
        now += 20;
        sm.update(now, 0.02);
      }
      return sm.projectiles.all()[0].x;
    });

    expect(xA).toBeCloseTo(xB, -1); // within 10 px
  });
});
