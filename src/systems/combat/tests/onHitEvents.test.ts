import { describe, it, expect } from 'vitest';
import {
  DamagePipeline,
  DamageType,
  HitType,
  CombatEventType,
  type CombatEvent,
  type CombatEntity,
  type DamageContext,
} from '../index.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * onHitEvents.test — verifies event dispatch order, payload completeness,
 * and that listeners receive references to source / target / result.
 *
 * Covers TEST 10 (OnHit dispatch) and TEST 11 (OnKill dispatch).
 */

function makeEntity(stats: ReadonlyMap<StatType, number> = new Map(), id = 'e', hp = 100): CombatEntity {
  const sm = new StatManager();
  sm.setBases(stats);
  return { id, hp, hpMax: hp, alive: true, statManager: sm };
}
function ctx(overrides: Partial<DamageContext> = {}): DamageContext {
  return {
    sourceEntityId: 'src',
    targetEntityId: 'tgt',
    sourceTags: [],
    baseDamage: 100,
    damageType: DamageType.PHYSICAL,
    canCrit: false,
    canBeBlocked: false,
    canBeDodged: false,
    ...overrides,
  };
}

describe('Combat events', () => {
  it('TEST 10 — ON_HIT fires with full payload on a normal hit', () => {
    const p = new DamagePipeline();
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map(), 'tgt', 1000);

    let captured: CombatEvent | null = null;
    p.events.on(CombatEventType.ON_HIT, (e) => { captured = e; });

    p.resolve(src, tgt, ctx({ baseDamage: 50, sourceTags: ['projectile'] }));

    expect(captured).not.toBeNull();
    const ev = captured! as unknown as CombatEvent;
    expect(ev.type).toBe(CombatEventType.ON_HIT);
    expect(ev.source).toBe(src);
    expect(ev.target).toBe(tgt);
    expect(ev.finalDamage).toBeCloseTo(50, 5);
    expect(ev.damageType).toBe(DamageType.PHYSICAL);
    expect(ev.hitType).toBe(HitType.NORMAL);
    expect(ev.wasCrit).toBe(false);
    expect(ev.wasBlocked).toBe(false);
    expect(ev.wasDodged).toBe(false);
    expect(ev.sourceTags).toEqual(['projectile']);
    expect(ev.result.pipelineBreakdown.finalDamage).toBeCloseTo(50, 5);
  });

  it('ON_CRIT fires alongside ON_HIT when crit lands', () => {
    const p = new DamagePipeline(() => 0.0);
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 200]]), 'src');
    const tgt = makeEntity(new Map(), 'tgt', 1000);

    const seen: string[] = [];
    p.events.on(CombatEventType.ON_CRIT, () => seen.push('CRIT'));
    p.events.on(CombatEventType.ON_HIT,  () => seen.push('HIT'));

    p.resolve(src, tgt, ctx({ canCrit: true }));
    expect(seen).toEqual(['CRIT', 'HIT']); // crit before hit per spec
  });

  it('ON_BLOCK fires when block lands; damage * 0.35', () => {
    const p = new DamagePipeline(() => 0.0);
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map([[StatType.BLOCK_CHANCE, 50]]), 'tgt', 1000);

    let blocked = 0;
    p.events.on(CombatEventType.ON_BLOCK, () => blocked++);

    const r = p.resolve(src, tgt, ctx({ canBeBlocked: true, baseDamage: 100 }));
    expect(blocked).toBe(1);
    expect(r.hitType).toBe(HitType.BLOCKED);
    expect(r.finalDamage).toBeCloseTo(35, 5);
  });

  it('ON_DODGE fires and ON_HIT does NOT when dodge succeeds', () => {
    const p = new DamagePipeline(() => 0.0);
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map([[StatType.EVASION, 1000]]), 'tgt', 1000);

    let hits = 0;
    let dodges = 0;
    p.events.on(CombatEventType.ON_HIT,   () => hits++);
    p.events.on(CombatEventType.ON_DODGE, () => dodges++);

    p.resolve(src, tgt, ctx({ canBeDodged: true }));
    expect(dodges).toBe(1);
    expect(hits).toBe(0);
  });

  it('TEST 11 — ON_KILL fires when target HP transitions to ≤ 0', () => {
    const p = new DamagePipeline();
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map(), 'tgt', 30); // 30 HP

    let killEvent: CombatEvent | null = null;
    p.events.on(CombatEventType.ON_KILL, (e) => { killEvent = e; });

    p.resolve(src, tgt, ctx({ baseDamage: 50 }));

    expect(killEvent).not.toBeNull();
    const ke = killEvent! as unknown as CombatEvent;
    expect(ke.targetKilled).toBe(true);
    expect(ke.target.alive).toBe(false);
    expect(ke.target.hp).toBe(0);
  });

  it('ON_KILL does NOT fire when target survives', () => {
    const p = new DamagePipeline();
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map(), 'tgt', 1000);

    let killed = 0;
    p.events.on(CombatEventType.ON_KILL, () => killed++);

    p.resolve(src, tgt, ctx({ baseDamage: 10 }));
    expect(killed).toBe(0);
    expect(tgt.alive).toBe(true);
  });

  it('ON_DAMAGE_TAKEN always fires for non-dodged hits', () => {
    const p = new DamagePipeline();
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map(), 'tgt', 1000);

    let dtCount = 0;
    p.events.on(CombatEventType.ON_DAMAGE_TAKEN, () => dtCount++);

    p.resolve(src, tgt, ctx({ baseDamage: 10 }));
    p.resolve(src, tgt, ctx({ baseDamage: 5 }));
    expect(dtCount).toBe(2);
  });

  it('listeners may unsubscribe via the returned handle', () => {
    const p = new DamagePipeline();
    const src = makeEntity(new Map(), 'src');
    const tgt = makeEntity(new Map(), 'tgt', 1000);

    let hits = 0;
    const unsubscribe = p.events.on(CombatEventType.ON_HIT, () => hits++);
    p.resolve(src, tgt, ctx({ baseDamage: 10 }));
    unsubscribe();
    p.resolve(src, tgt, ctx({ baseDamage: 10 }));
    expect(hits).toBe(1);
  });
});
