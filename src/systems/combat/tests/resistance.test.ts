import { describe, it, expect } from 'vitest';
import {
  DamagePipeline,
  DamageType,
  ResistanceResolver,
  RESIST_CAP,
  type CombatEntity,
  type DamageContext,
} from '../index.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * resistance.test — direct formula tests on ResistanceResolver and
 * integration tests on the pipeline showing penetration applied BEFORE
 * cap.
 *
 * Covers TEST 5 (resistance reduction) and the spec's penetration rule.
 */

function makeEntity(stats: ReadonlyMap<StatType, number>, id = 'e'): CombatEntity {
  const sm = new StatManager();
  sm.setBases(stats);
  return { id, hp: 10000, hpMax: 10000, alive: true, statManager: sm };
}
function ctx(overrides: Partial<DamageContext> = {}): DamageContext {
  return {
    sourceEntityId: 'src',
    targetEntityId: 'tgt',
    sourceTags: [],
    baseDamage: 100,
    damageType: DamageType.FIRE,
    canCrit: false,
    canBeBlocked: false,
    canBeDodged: false,
    ...overrides,
  };
}

describe('ResistanceResolver (formula)', () => {
  it('TEST 5 — 50% fire resist halves fire damage', () => {
    const sm = new StatManager();
    sm.setBase(StatType.FIRE_RESIST, 50);
    expect(ResistanceResolver.compute(sm, DamageType.FIRE)).toBeCloseTo(0.5, 5);
  });

  it('caps at 75% by default', () => {
    const sm = new StatManager();
    sm.setBase(StatType.FIRE_RESIST, 95);
    expect(ResistanceResolver.compute(sm, DamageType.FIRE)).toBeCloseTo(1 - RESIST_CAP / 100, 5);
  });

  it('negative resist makes target vulnerable (multiplier > 1)', () => {
    const sm = new StatManager();
    sm.setBase(StatType.COLD_RESIST, -50);
    expect(ResistanceResolver.compute(sm, DamageType.COLD)).toBeCloseTo(1.5, 5);
  });

  it('penetration subtracts BEFORE cap clamps', () => {
    // 80 resist - 20 pen = 60 effective → mult = 0.4
    const sm = new StatManager();
    sm.setBase(StatType.LIGHTNING_RESIST, 80);
    expect(ResistanceResolver.compute(sm, DamageType.LIGHTNING, 20)).toBeCloseTo(0.4, 5);
  });

  it('penetration can drive resist below 0', () => {
    // 30 resist - 80 pen = -50 → mult = 1.5
    const sm = new StatManager();
    sm.setBase(StatType.POISON_RESIST, 30);
    expect(ResistanceResolver.compute(sm, DamageType.POISON, 80)).toBeCloseTo(1.5, 5);
  });

  it('physical never visits resistance — returns 1.0 multiplier', () => {
    const sm = new StatManager();
    sm.setBase(StatType.FIRE_RESIST, 75);
    expect(ResistanceResolver.compute(sm, DamageType.PHYSICAL)).toBe(1.0);
  });
});

describe('Resistance — pipeline integration', () => {
  it('applies fire resist to fire damage at the resistance stage', () => {
    const src = makeEntity(new Map());
    const tgt = makeEntity(new Map([[StatType.FIRE_RESIST, 50]]));
    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, ctx({ baseDamage: 100, damageType: DamageType.FIRE }));
    expect(r.finalDamage).toBeCloseTo(50, 5);
    expect(r.pipelineBreakdown.afterDefense).toBeCloseTo(100, 5);   // armor doesn't touch fire
    expect(r.pipelineBreakdown.afterResistance).toBeCloseTo(50, 5);
  });

  it('penetration reduces resist before cap', () => {
    const src = makeEntity(new Map());
    const tgt = makeEntity(new Map([[StatType.FIRE_RESIST, 90]]));
    const p = new DamagePipeline();

    // No pen: capped at 75 → mult 0.25 → 25
    const r1 = p.resolve(src, tgt, ctx({ baseDamage: 100, damageType: DamageType.FIRE }));
    expect(r1.finalDamage).toBeCloseTo(25, 5);

    // 30 pen: 90-30=60 (under cap) → mult 0.4 → 40
    const r2 = p.resolve(src, tgt, ctx({ baseDamage: 100, damageType: DamageType.FIRE, penetration: 30 }));
    expect(r2.finalDamage).toBeCloseTo(40, 5);
  });
});
