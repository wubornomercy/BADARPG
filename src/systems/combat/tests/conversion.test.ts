import { describe, it, expect } from 'vitest';
import {
  DamagePipeline,
  DamageType,
  DamageConversionCalculator,
  type CombatEntity,
  type DamageContext,
} from '../index.js';
import { StatManager, StatType, ModifierType, SourceType } from '../../stats/index.js';

/**
 * conversion.test — partial conversion, full conversion clamp, multi-target
 * conversion, and downstream tag-based scaling on the converted chunk.
 *
 * Covers TEST 6 (partial conversion correctness) and TEST 7 (tag-based
 * increased scaling correctness — verified via the fire chunk picking up
 * +fire damage automatically after conversion).
 */

function makeEntity(stats: ReadonlyMap<StatType, number> = new Map(), id = 'e'): CombatEntity {
  const sm = new StatManager();
  sm.setBases(stats);
  return { id, hp: 10000, hpMax: 10000, x: 0, y: 0, alive: true, statManager: sm };
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

describe('DamageConversionCalculator (direct)', () => {
  it('no conversion table → original type holds full amount', () => {
    const b = DamageConversionCalculator.convert(100, DamageType.PHYSICAL, undefined);
    expect(b[DamageType.PHYSICAL]).toBeCloseTo(100, 5);
    expect(b[DamageType.FIRE]).toBeUndefined();
  });

  it('50% phys → fire produces 50/50 split', () => {
    const b = DamageConversionCalculator.convert(100, DamageType.PHYSICAL, { fire: 50 });
    expect(b[DamageType.PHYSICAL]).toBeCloseTo(50, 5);
    expect(b[DamageType.FIRE]).toBeCloseTo(50, 5);
  });

  it('100% conversion drains original type', () => {
    const b = DamageConversionCalculator.convert(80, DamageType.PHYSICAL, { fire: 100 });
    expect(b[DamageType.PHYSICAL] ?? 0).toBe(0);
    expect(b[DamageType.FIRE]).toBeCloseTo(80, 5);
  });

  it('multi-target conversion: 30% fire + 40% cold', () => {
    const b = DamageConversionCalculator.convert(100, DamageType.PHYSICAL, { fire: 30, cold: 40 });
    expect(b[DamageType.PHYSICAL]).toBeCloseTo(30, 5);
    expect(b[DamageType.FIRE]).toBeCloseTo(30, 5);
    expect(b[DamageType.COLD]).toBeCloseTo(40, 5);
  });

  it('over-conversion (sum > 100%) is clamped proportionally', () => {
    // requested 80 fire + 80 cold = 160 → scale 100/160 = 0.625
    // → 50 fire + 50 cold, 0 phys remains
    const b = DamageConversionCalculator.convert(100, DamageType.PHYSICAL, { fire: 80, cold: 80 });
    expect(b[DamageType.PHYSICAL] ?? 0).toBeCloseTo(0, 5);
    expect(b[DamageType.FIRE]).toBeCloseTo(50, 5);
    expect(b[DamageType.COLD]).toBeCloseTo(50, 5);
  });

  it('self-conversion entry (phys → phys) is ignored', () => {
    const b = DamageConversionCalculator.convert(100, DamageType.PHYSICAL, { physical: 50, fire: 50 });
    expect(b[DamageType.PHYSICAL]).toBeCloseTo(50, 5);
    expect(b[DamageType.FIRE]).toBeCloseTo(50, 5);
  });
});

describe('Conversion — pipeline integration', () => {
  it('partial conversion + resist applies ONLY to converted chunk', () => {
    const src = makeEntity();
    // 100 fire resist - on fire chunk only.
    const tgt = makeEntity(new Map([[StatType.FIRE_RESIST, 75]]));
    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, ctx({
      baseDamage: 100,
      damageType: DamageType.PHYSICAL,
      conversion: { fire: 50 }, // 50 phys + 50 fire
    }));
    // Phys 50 (no armor) + fire 50 * 0.25 = 12.5 → total 62.5
    expect(r.finalDamage).toBeCloseTo(62.5, 5);
  });

  it('TEST 7 — converted fire chunk picks up +fire damage scaling automatically', () => {
    const sm = new StatManager();
    sm.modifiers.add({ id: '', stat: StatType.FIRE_DAMAGE, modifierType: ModifierType.FLAT, value: 100, sourceType: SourceType.ITEM, sourceId: 'ring' });
    const src: CombatEntity = { id: 'src', hp: 1, hpMax: 1, x: 0, y: 0, alive: true, statManager: sm };
    const tgt = makeEntity();

    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, ctx({
      baseDamage: 100,
      damageType: DamageType.PHYSICAL,
      conversion: { fire: 50 },
    }));
    // Phys chunk: 50 (no scaling). Fire chunk: 50 * (1 + 1.00) = 100. Total 150.
    expect(r.finalDamage).toBeCloseTo(150, 5);
  });

  it('TEST 7 — tag-based scaling: projectile tag pulls in PROJECTILE_DAMAGE', () => {
    const sm = new StatManager();
    sm.modifiers.add({ id: '', stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.FLAT, value: 50, sourceType: SourceType.ITEM, sourceId: 'bow' });
    const src: CombatEntity = { id: 'src', hp: 1, hpMax: 1, x: 0, y: 0, alive: true, statManager: sm };
    const tgt = makeEntity();

    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, ctx({
      baseDamage: 100,
      sourceTags: ['projectile'],
    }));
    // 100 * (1 + 0.50) = 150
    expect(r.finalDamage).toBeCloseTo(150, 5);
  });

  it('TEST 8 — MORE multipliers multiply independently', () => {
    const sm = new StatManager();
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.MORE, value: 30, sourceType: SourceType.BUFF, sourceId: 'frenzy' });
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.MORE, value: 20, sourceType: SourceType.SKILL, sourceId: 'support' });
    const src: CombatEntity = { id: 'src', hp: 1, hpMax: 1, x: 0, y: 0, alive: true, statManager: sm };
    const tgt = makeEntity();
    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, ctx({ baseDamage: 100 }));
    expect(r.finalDamage).toBeCloseTo(100 * 1.3 * 1.2, 5); // 156
  });
});
