import { describe, it, expect } from 'vitest';
import {
  DamagePipeline,
  DamageType,
  HitType,
  type CombatEntity,
  type DamageContext,
} from '../index.js';
import { StatManager, StatType, ModifierType, SourceType } from '../../stats/index.js';

/**
 * damagePipeline.test — full-flow integration: hit checks, breakdown
 * values, shield → HP order, DOT bypass behaviour.
 *
 * Tests cover spec items: 1 (dodge), 2 (block), 4 (armor), 9 (DOT bypass),
 * 12 (shield absorbs first).
 */

function makeEntity(opts: Partial<CombatEntity> & { stats?: ReadonlyMap<StatType, number> }): CombatEntity {
  const sm = new StatManager();
  if (opts.stats) sm.setBases(opts.stats);
  return {
    id:           opts.id ?? 'e',
    hp:           opts.hp ?? 100,
    hpMax:        opts.hpMax ?? opts.hp ?? 100,
    shield:       opts.shield,
    alive:        opts.alive ?? true,
    statManager:  sm,
  };
}

function basicCtx(overrides: Partial<DamageContext> = {}): DamageContext {
  return {
    sourceEntityId: 'src',
    targetEntityId: 'tgt',
    sourceTags:     [],
    baseDamage:     100,
    damageType:     DamageType.PHYSICAL,
    canCrit:        false,
    canBeBlocked:   false,
    canBeDodged:    false,
    ...overrides,
  };
}

describe('DamagePipeline — flow', () => {
  it('applies base damage to target HP when no scaling / defenses', () => {
    const p = new DamagePipeline();
    const src = makeEntity({ id: 'src' });
    const tgt = makeEntity({ id: 'tgt', hp: 1000, hpMax: 1000 });

    const result = p.resolve(src, tgt, basicCtx({ baseDamage: 100 }));

    expect(result.finalDamage).toBeCloseTo(100, 5);
    expect(tgt.hp).toBeCloseTo(900, 5);
    expect(result.hitType).toBe(HitType.NORMAL);
    expect(result.wasCrit).toBe(false);
    expect(result.wasDodged).toBe(false);
    expect(result.wasBlocked).toBe(false);
    expect(result.targetKilled).toBe(false);
  });

  it('TEST 1 — dodge formula clamps and applies', () => {
    // dodgeChance = evasion / (evasion + accuracy*2) = 200 / (200+100*2) = 0.5
    const src = makeEntity({ id: 'src', stats: new Map([[StatType.ACCURACY, 100]]) });
    const tgt = makeEntity({ id: 'tgt', hp: 100, stats: new Map([[StatType.EVASION, 200]]) });

    const dodgeRng = new DamagePipeline(() => 0.0); // always roll low → dodge succeeds
    const r1 = dodgeRng.resolve(src, tgt, basicCtx({ canBeDodged: true }));
    expect(r1.wasDodged).toBe(true);
    expect(r1.finalDamage).toBe(0);
    expect(tgt.hp).toBe(100); // untouched

    const noDodgeRng = new DamagePipeline(() => 0.99);
    const r2 = noDodgeRng.resolve(src, tgt, basicCtx({ canBeDodged: true }));
    expect(r2.wasDodged).toBe(false);
    expect(r2.finalDamage).toBeCloseTo(100, 5);
  });

  it('TEST 2 — block applies 0.35 retention at end', () => {
    const src = makeEntity({ id: 'src' });
    const tgt = makeEntity({ id: 'tgt', hp: 1000, stats: new Map([[StatType.BLOCK_CHANCE, 50]]) });
    const p = new DamagePipeline(() => 0.0);
    const result = p.resolve(src, tgt, basicCtx({ canBeBlocked: true, baseDamage: 100 }));

    expect(result.wasBlocked).toBe(true);
    expect(result.finalDamage).toBeCloseTo(35, 5); // 100 * 0.35
  });

  it('TEST 4 — armor mitigation clamps at 85% and matches formula', () => {
    // armor 1000, incoming 100 phys → 1000 / (1000 + 100*5) = 1000/1500 = 0.6667
    const src = makeEntity({ id: 'src' });
    const tgt = makeEntity({ id: 'tgt', hp: 1000, stats: new Map([[StatType.ARMOR, 1000]]) });
    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, basicCtx({ baseDamage: 100 }));
    expect(r.finalDamage).toBeCloseTo(100 * (1 - 1000 / 1500), 4); // ≈ 33.33

    // Extreme armor → cap at 85%
    const tgt2 = makeEntity({ id: 'tgt2', hp: 1000, stats: new Map([[StatType.ARMOR, 1_000_000]]) });
    const r2 = p.resolve(src, tgt2, basicCtx({ baseDamage: 100 }));
    expect(r2.finalDamage).toBeCloseTo(15, 4); // 100 * (1 - 0.85)
  });

  it('TEST 4 — armor does NOT affect non-physical', () => {
    const src = makeEntity({ id: 'src' });
    const tgt = makeEntity({ id: 'tgt', hp: 1000, stats: new Map([[StatType.ARMOR, 10_000]]) });
    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, basicCtx({ baseDamage: 100, damageType: DamageType.FIRE }));
    expect(r.finalDamage).toBeCloseTo(100, 5);
  });

  it('TEST 9 — DOT bypasses dodge and block', () => {
    const src = makeEntity({ id: 'src' });
    const tgt = makeEntity({ id: 'tgt', hp: 1000, stats: new Map([
      [StatType.EVASION, 10000],     // ridiculous evasion
      [StatType.BLOCK_CHANCE, 75],   // capped block
    ]) });
    const p = new DamagePipeline(() => 0.0); // always rolls low
    const r = p.resolve(src, tgt, basicCtx({
      baseDamage: 50,
      damageType: DamageType.POISON,
      isDOT: true,
      canBeDodged: true,
      canBeBlocked: true,
      canCrit: true, // also disabled by isDOT unless allowDOTCrit
    }));
    expect(r.wasDodged).toBe(false);
    expect(r.wasBlocked).toBe(false);
    expect(r.wasCrit).toBe(false);
    expect(r.finalDamage).toBeCloseTo(50, 5);
  });

  it('TEST 12 — shield absorbs damage before HP', () => {
    const src = makeEntity({ id: 'src' });
    const tgt: CombatEntity = {
      id: 'tgt',
      hp: 100,
      hpMax: 100,
      shield: 50,
      alive: true,
      statManager: new StatManager(),
    };
    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, basicCtx({ baseDamage: 80 }));

    expect(r.finalDamage).toBeCloseTo(30, 5); // 80 total → 50 absorbed by shield, 30 to HP
    expect(tgt.shield).toBe(0);
    expect(tgt.hp).toBeCloseTo(70, 5);
  });

  it('TEST 12 — shield fully absorbs when damage <= shield', () => {
    const tgt: CombatEntity = { id: 'tgt', hp: 100, hpMax: 100, shield: 200, alive: true, statManager: new StatManager() };
    const p = new DamagePipeline();
    p.resolve(makeEntity({ id: 's' }), tgt, basicCtx({ baseDamage: 100 }));
    expect(tgt.shield).toBe(100);
    expect(tgt.hp).toBe(100);
  });

  it('pipelineBreakdown reports each stage', () => {
    const sm = new StatManager();
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.FLAT, value: 50, sourceType: SourceType.ITEM, sourceId: 'a' });
    sm.modifiers.add({ id: '', stat: StatType.PHYSICAL_DAMAGE, modifierType: ModifierType.MORE, value: 20, sourceType: SourceType.BUFF, sourceId: 'b' });
    const src: CombatEntity = { id: 'src', hp: 1, hpMax: 1, alive: true, statManager: sm };
    const tgt = makeEntity({ id: 'tgt', hp: 10000 });

    const p = new DamagePipeline();
    const r = p.resolve(src, tgt, basicCtx({ baseDamage: 100 }));
    expect(r.pipelineBreakdown.baseDamage).toBe(100);
    expect(r.pipelineBreakdown.afterConversion).toBeCloseTo(100, 5);
    expect(r.pipelineBreakdown.afterIncreased).toBeCloseTo(150, 5);    // 100 * 1.50
    expect(r.pipelineBreakdown.afterMore).toBeCloseTo(180, 5);         // 150 * 1.20
    expect(r.pipelineBreakdown.afterCrit).toBeCloseTo(180, 5);         // no crit
    expect(r.pipelineBreakdown.afterDefense).toBeCloseTo(180, 5);      // no armor
    expect(r.pipelineBreakdown.afterResistance).toBeCloseTo(180, 5);   // physical
    expect(r.pipelineBreakdown.finalDamage).toBeCloseTo(180, 5);
  });
});
