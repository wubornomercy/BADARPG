import { describe, it, expect } from 'vitest';
import {
  DamagePipeline,
  DamageType,
  HitType,
  type CombatEntity,
  type DamageContext,
} from '../index.js';
import { StatManager, StatType } from '../../stats/index.js';

/**
 * crit.test — crit chance/multiplier sourcing, bonus chance/mult overlay,
 * and DOT crit gating via metadata.allowDOTCrit.
 *
 * Covers TEST 3 (crit multiplier correctness).
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
    damageType: DamageType.PHYSICAL,
    canCrit: true,
    canBeBlocked: false,
    canBeDodged: false,
    ...overrides,
  };
}

describe('Crit resolution', () => {
  it('TEST 3 — crit at base 150% multiplier doubles+halves damage as expected', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 150]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0); // always roll under crit chance
    const r = p.resolve(src, tgt, ctx({ baseDamage: 100 }));
    expect(r.wasCrit).toBe(true);
    expect(r.finalDamage).toBeCloseTo(150, 5);
    expect(r.hitType).toBe(HitType.CRIT);
  });

  it('TEST 3 — custom multiplier (250%) applies', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 250]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({ baseDamage: 100 }));
    expect(r.finalDamage).toBeCloseTo(250, 5);
  });

  it('crit chance of 0 never crits', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 0]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({}));
    expect(r.wasCrit).toBe(false);
    expect(r.finalDamage).toBeCloseTo(100, 5);
  });

  it('bonusCritChance pushes a 0% crit chance over the line', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 0], [StatType.CRIT_MULTIPLIER, 200]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({ bonusCritChance: 50 }));
    expect(r.wasCrit).toBe(true);
    expect(r.finalDamage).toBeCloseTo(200, 5);
  });

  it('bonusCritMultiplier stacks additively on the percent number', () => {
    // base 150 + bonus 100 = 250 → 2.5x
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 150]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({ bonusCritMultiplier: 100 }));
    expect(r.finalDamage).toBeCloseTo(250, 5);
  });

  it('canCrit=false suppresses crit even with 100% chance', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 200]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({ canCrit: false }));
    expect(r.wasCrit).toBe(false);
    expect(r.finalDamage).toBeCloseTo(100, 5);
  });

  it('DOT cannot crit by default', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 200]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({ canCrit: true, isDOT: true, damageType: DamageType.POISON }));
    expect(r.wasCrit).toBe(false);
    expect(r.finalDamage).toBeCloseTo(100, 5);
  });

  it('DOT can crit when metadata.allowDOTCrit = true', () => {
    const src = makeEntity(new Map([[StatType.CRIT_CHANCE, 100], [StatType.CRIT_MULTIPLIER, 200]]));
    const tgt = makeEntity(new Map());
    const p = new DamagePipeline(() => 0.0);
    const r = p.resolve(src, tgt, ctx({
      canCrit: true,
      isDOT: true,
      damageType: DamageType.POISON,
      metadata: { allowDOTCrit: true },
    }));
    expect(r.wasCrit).toBe(true);
    expect(r.finalDamage).toBeCloseTo(200, 5);
  });
});
