import { describe, it, expect } from 'vitest';
import {
  EliteManager, ELITE_CHANCE, MonsterSpawner, MonsterManager,
  STARTER_MONSTERS,
  ELITE_TOXIC, ELITE_TITANIC, ELITE_VOLATILE,
  type MonsterFactory, type MonsterRuntime,
} from '../index.js';
import { StatType } from '../../stats/types/StatType.js';
import { DamagePipeline, DamageType, type CombatEntity } from '../../combat/index.js';
import { StatManager } from '../../stats/index.js';
import { makeMonster } from './testHelpers.js';

/**
 * eliteScaling.test — TEST 5 (8% elite chance) + TEST 6 (modifier apply)
 * + TEST 7 (volatile explosion through DamagePipeline).
 */

function setup() {
  const mgr = new MonsterManager();
  mgr.registerDefinitions(STARTER_MONSTERS);
  const elites = new EliteManager();
  const factory: MonsterFactory = (def, level, pos) =>
    makeMonster(def, level, { x: pos.x, y: pos.y });
  const spawner = new MonsterSpawner(mgr, elites, factory);
  return { mgr, elites, spawner };
}

describe('Elite system', () => {
  it('TEST 5 — elite chance approximately 8% across many spawns', () => {
    const { spawner } = setup();
    const N = 5000;
    let eliteCount = 0;
    let r = 0;
    const rng = () => { r = (r + 0.137) % 1; return r; };
    for (let i = 0; i < N; i++) {
      const m = spawner.spawn({
        definitionId: 'rotling',
        position: { x: 0, y: 0 },
        rng,
      })!;
      if (m.eliteModifierIds.length > 0) eliteCount++;
    }
    const pct = eliteCount / N;
    // Allow ±2-pp around the spec 8%.
    expect(pct).toBeGreaterThan(0.06);
    expect(pct).toBeLessThan(0.10);
    // Convince the linter the constant is referenced.
    expect(ELITE_CHANCE).toBe(0.08);
  });

  it('TEST 6 — TOXIC modifier raises poison damage + move speed via StatManager', () => {
    const elites = new EliteManager();
    const m = makeMonster(STARTER_MONSTERS[0]); // rotling
    const poisonBefore = m.statManager!.getFinalStat(StatType.POISON_DAMAGE);
    const moveBefore = m.statManager!.getFinalStat(StatType.MOVE_SPEED);

    elites.applyTo(m, ELITE_TOXIC.id);

    expect(m.eliteModifierIds).toEqual([ELITE_TOXIC.id]);
    expect(m.statManager!.getFinalStat(StatType.POISON_DAMAGE)).toBe(poisonBefore + 40);
    expect(m.statManager!.getFinalStat(StatType.MOVE_SPEED)).toBeCloseTo(moveBefore * 1.25, 5);
  });

  it('TEST 6 — TITANIC modifier raises maxHP by 80% and exposes scale hint', () => {
    const elites = new EliteManager();
    const m = makeMonster(STARTER_MONSTERS[0]);
    const hpBefore = m.statManager!.getFinalStat(StatType.MAX_HP);
    elites.applyTo(m, ELITE_TITANIC.id);
    expect(m.statManager!.getFinalStat(StatType.MAX_HP)).toBeCloseTo(hpBefore * 1.8, 4);
    const def = elites.get(ELITE_TITANIC.id)!;
    expect(def.renderHints?.scale).toBe(1.25);
  });

  it('max 1 elite modifier per monster — second apply is a no-op', () => {
    const elites = new EliteManager();
    const m = makeMonster(STARTER_MONSTERS[0]);
    expect(elites.applyTo(m, ELITE_TOXIC.id)).toBe(true);
    expect(elites.applyTo(m, ELITE_TITANIC.id)).toBe(false);
    expect(m.eliteModifierIds).toEqual([ELITE_TOXIC.id]);
  });

  it('removeFrom() sweeps elite modifiers via removeBySource', () => {
    const elites = new EliteManager();
    const m = makeMonster(STARTER_MONSTERS[0]);
    elites.applyTo(m, ELITE_TOXIC.id);
    elites.removeFrom(m);
    expect(m.eliteModifierIds).toEqual([]);
    expect(m.statManager!.getFinalStat(StatType.POISON_DAMAGE)).toBe(0);
  });

  it('TEST 7 — VOLATILE definition exposes an onDeathExplosion payload usable by DamagePipeline', () => {
    const m = makeMonster(STARTER_MONSTERS[0], 1, { x: 100, y: 100 });
    const elites = new EliteManager();
    elites.applyTo(m, ELITE_VOLATILE.id);
    const def = elites.get(ELITE_VOLATILE.id)!;
    expect(def.onDeathExplosion).toBeDefined();
    expect(def.onDeathExplosion!.baseDamage).toBe(48);
    expect(def.onDeathExplosion!.damageType).toBe(DamageType.FIRE);
    expect(def.onDeathExplosion!.radius).toBe(3);

    // Wire it through a live pipeline call to confirm it flows.
    const pipeline = new DamagePipeline(() => 0.99);
    const target: CombatEntity = { id: 'tgt', hp: 100, hpMax: 100, x: m.x + 32, y: m.y, alive: true, statManager: new StatManager() };
    const result = pipeline.resolve(m as any, target, {
      sourceEntityId: m.id,
      targetEntityId: target.id,
      sourceTags:     [...def.onDeathExplosion!.tags],
      baseDamage:     def.onDeathExplosion!.baseDamage,
      damageType:     def.onDeathExplosion!.damageType,
      canCrit:        false,
      canBeBlocked:   false,
      canBeDodged:    false,
    });
    expect(result.finalDamage).toBeCloseTo(48, 5);
    expect(target.hp).toBeCloseTo(100 - 48, 5);
  });
});
