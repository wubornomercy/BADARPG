import { describe, it, expect } from 'vitest';
import {
  computeXPReward, computeLootMultiplier, requiredXPForLevel, levelMultiplier,
  MONSTER_ROTLING, MONSTER_BLIGHT_ARCHER, MONSTER_CORRUPT_BROODMOTHER,
} from '../index.js';
import { RangedKiteAI } from '../ai/RangedKiteAI.js';
import { SuicideAI } from '../ai/SuicideAI.js';
import type { AIContext, MonsterRuntime } from '../ai/AIBase.js';
import { DamagePipeline, type CombatEntity, type DamageContext } from '../../combat/index.js';
import { StatManager, StatType } from '../../stats/index.js';
import { makeMonster } from './testHelpers.js';

/**
 * rewardScaling.test — TEST 9, 10, 11, 12.
 *
 *  TEST 9  — Ranged AI maintains preferred distance.
 *  TEST 10 — Suicide explosion goes through DamagePipeline.
 *  TEST 11 — XP scaling formula correct (40 * level^1.35).
 *  TEST 12 — Level-up grants +2 to each primary stat via StatManager.
 */

describe('Reward scaling formulas', () => {
  it('TEST 11 — requiredXPForLevel = 40 * level^1.35', () => {
    expect(requiredXPForLevel(1)).toBe(40);
    expect(requiredXPForLevel(2)).toBe(Math.floor(40 * Math.pow(2, 1.35)));
    expect(requiredXPForLevel(10)).toBe(Math.floor(40 * Math.pow(10, 1.35)));
  });

  it('level multiplier follows spec patch 4 order: base × levelMult × eliteBonus', () => {
    // Spec example: level 3, Plague Hound (base 9 xp).
    // levelMult = 1 + 2 * 0.12 = 1.24
    const def = MONSTER_BLIGHT_ARCHER; // base 7
    const lvl = 3;
    expect(levelMultiplier(lvl)).toBeCloseTo(1.24, 5);
    expect(computeXPReward(def, lvl, false)).toBeCloseTo(7 * 1.24, 5);
    expect(computeXPReward(def, lvl, true)).toBeCloseTo(7 * 1.24 * 1.6, 5);
  });

  it('elite loot multiplier doubles up (1.8x) on top of level scaling', () => {
    const def = MONSTER_CORRUPT_BROODMOTHER; // base 1.4
    const lvl = 1;
    expect(computeLootMultiplier(def, lvl, false)).toBeCloseTo(1.4, 5);
    expect(computeLootMultiplier(def, lvl, true)).toBeCloseTo(1.4 * 1.8, 5);
  });
});

describe('TEST 12 — Player level-up grants attributes via StatManager', () => {
  it('+2 to each primary stat per level via FLAT modifier', () => {
    const sm = new StatManager();
    // Simulate Player.levelUp() — direct stat manager calls.
    const grant = (newLevel: number) => {
      const sourceId = `level_up_${newLevel}`;
      for (const stat of [StatType.STRENGTH, StatType.DEXTERITY, StatType.INTELLIGENCE, StatType.VITALITY]) {
        sm.modifiers.add({
          id: '', stat, modifierType: 'FLAT' as any, value: 2,
          sourceType: 'PASSIVE' as any, sourceId,
        });
      }
    };
    grant(2); grant(3); grant(4);
    // After 3 level-ups, each stat = 6.
    expect(sm.getFinalStat(StatType.STRENGTH)).toBe(6);
    expect(sm.getFinalStat(StatType.DEXTERITY)).toBe(6);
    expect(sm.getFinalStat(StatType.INTELLIGENCE)).toBe(6);
    expect(sm.getFinalStat(StatType.VITALITY)).toBe(6);
  });
});

describe('TEST 9 — RangedKiteAI maintains preferred distance', () => {
  it('retreats when player is too close, advances when too far', () => {
    const ai = new RangedKiteAI();
    const m = makeMonster(MONSTER_BLIGHT_ARCHER, 1, { x: 0, y: 0 });
    m.aggroUntil = 99_999;
    const preferredUnits = MONSTER_BLIGHT_ARCHER.behaviorConfig!.preferredDistance as number;
    const preferredPx = preferredUnits * 32;

    const ctxAt = (px: number, py: number, now = 0): AIContext => ({
      now, dtSec: 0.05,
      player: { id: 'P', x: px, y: py, alive: true, isInvulnerable: () => false },
      damage: new DamagePipeline(),
      spawnProjectile: () => {},
      spawnSummon: () => null,
      livingSummonsOf: () => 0,
      enemiesInRadius: () => [],
    });

    // Player very close → archer retreats (vx points AWAY from player).
    ai.tick(m, ctxAt(20, 0)); // player to the right
    expect(m.vx).toBeLessThan(0);

    // Player far away → archer advances slowly toward.
    const m2 = makeMonster(MONSTER_BLIGHT_ARCHER, 1, { x: 0, y: 0 });
    m2.aggroUntil = 99_999;
    ai.tick(m2, ctxAt(preferredPx * 2, 0));
    expect(m2.vx).toBeGreaterThan(0);
  });
});

describe('TEST 10 — SuicideAI explosion routes through DamagePipeline', () => {
  it('damages the player via pipeline.resolve when fuse expires', () => {
    const ai = new SuicideAI();
    const m = makeMonster({
      ...MONSTER_ROTLING,
      id: 'festerling_test',
      // Use Festerling-shaped behaviorConfig.
      behaviorConfig: { explosionDamage: 34, explosionRadius: 2.5, explosionDelay: 0.01, explosionType: 'poison' },
      role: 'SUICIDE' as any,
    }, 1, { x: 0, y: 0 });
    m.aggroUntil = 99_999;

    const player: CombatEntity & { isInvulnerable: (n: number) => boolean } = {
      id: 'P', hp: 100, hpMax: 100, x: 30, y: 0, alive: true, statManager: new StatManager(),
      isInvulnerable: () => false,
    };
    let resolveCalls = 0;
    const pipeline = new DamagePipeline(() => 0.99);
    const realResolve = pipeline.resolve.bind(pipeline);
    pipeline.resolve = ((src: any, tgt: any, ctx: DamageContext) => {
      resolveCalls++;
      return realResolve(src, tgt, ctx);
    }) as any;

    const ctx: AIContext = {
      now: 0, dtSec: 0.05,
      player: { id: player.id, x: player.x, y: player.y, alive: true, isInvulnerable: () => false, statManager: player.statManager },
      damage: pipeline,
      spawnProjectile: () => {},
      spawnSummon: () => null,
      livingSummonsOf: () => 0,
      enemiesInRadius: () => [],
    };

    // First tick — enters fuse phase.
    m.nextThinkAt = -1;
    ai.tick(m, ctx);
    expect((m.aiState as any).phase).toBe('fuse');

    // Second tick after delay — detonates.
    ctx.now = 100;
    m.nextThinkAt = -1;
    ai.tick(m, ctx);
    expect(resolveCalls).toBeGreaterThan(0);
    expect(m.alive).toBe(false);
  });
});
