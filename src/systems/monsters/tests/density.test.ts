import { describe, it, expect } from 'vitest';
import { ROLE_SEPARATION_STRENGTH, MonsterRole } from '../types/MonsterRole.js';
import {
  MONSTER_ROTLING, MONSTER_PLAGUE_HOUND, MONSTER_BLIGHT_ARCHER, MONSTER_CORRUPT_BROODMOTHER,
} from '../data/monsterDefinitions.js';
import { SummonerAI } from '../ai/SummonerAI.js';
import type { AIContext, MonsterRuntime } from '../ai/AIBase.js';
import { DamagePipeline } from '../../combat/index.js';
import { makeMonster } from './testHelpers.js';

/**
 * density.test — separation strength values + TEST 8 (summon cap).
 */

describe('Per-role separation strength', () => {
  it('SWARM separation = 0.35; others = 0.80', () => {
    expect(ROLE_SEPARATION_STRENGTH[MonsterRole.SWARM]).toBe(0.35);
    expect(ROLE_SEPARATION_STRENGTH[MonsterRole.CHARGER]).toBe(0.80);
    expect(ROLE_SEPARATION_STRENGTH[MonsterRole.RANGED]).toBe(0.80);
    expect(ROLE_SEPARATION_STRENGTH[MonsterRole.SUICIDE]).toBe(0.80);
    expect(ROLE_SEPARATION_STRENGTH[MonsterRole.SUMMONER]).toBe(0.80);
  });

  it('monster fixtures inherit separation strength from their role', () => {
    expect(makeMonster(MONSTER_ROTLING).separationStrength).toBe(0.35);
    expect(makeMonster(MONSTER_PLAGUE_HOUND).separationStrength).toBe(0.80);
    expect(makeMonster(MONSTER_BLIGHT_ARCHER).separationStrength).toBe(0.80);
  });
});

describe('SummonerAI cap enforcement (TEST 8)', () => {
  it('stops spawning when live summons reach the cap', () => {
    const ai = new SummonerAI();
    const broodmother = makeMonster(MONSTER_CORRUPT_BROODMOTHER, 1, { x: 0, y: 0 });
    broodmother.nextThinkAt = -1;     // force decision every tick
    broodmother.aggroUntil = 99_999;  // permanently aggroed

    const livingSummons: MonsterRuntime[] = [];
    let summonAttempts = 0;

    const ctx: AIContext = {
      now: 0, dtSec: 0.05,
      player: { id: 'P', x: 200, y: 0, alive: true, isInvulnerable: () => false },
      damage: new DamagePipeline(),
      spawnProjectile: () => {},
      spawnSummon: (defId, pos, ownerId) => {
        summonAttempts++;
        const child = makeMonster(MONSTER_ROTLING, 1, { x: pos.x, y: pos.y });
        child.summonerId = ownerId;
        livingSummons.push(child);
        return child;
      },
      livingSummonsOf: (ownerId) => livingSummons.filter((c) => c.summonerId === ownerId && c.alive).length,
      enemiesInRadius: () => [],
    };

    // Tick until 10 summons would normally be created — should cap at 5.
    for (let i = 0; i < 20; i++) {
      ctx.now += 10_000; // far past summonCooldown
      broodmother.nextThinkAt = -1;
      ai.tick(broodmother, ctx);
    }
    const cap = MONSTER_CORRUPT_BROODMOTHER.behaviorConfig!.maxActiveSummons as number;
    expect(livingSummons.length).toBe(cap);
  });
});
