import { describe, it, expect } from 'vitest';
import { AggroManager, AGGRO_DURATION_MS } from '../core/AggroManager.js';
import { MONSTER_ROTLING } from '../data/monsterDefinitions.js';
import { MeleeChaseAI } from '../ai/MeleeChaseAI.js';
import type { AIContext } from '../ai/AIBase.js';
import { DamagePipeline } from '../../combat/index.js';
import { makeMonster } from './testHelpers.js';

/**
 * aggro.test — TEST 1 (acquisition) + TEST 2 (timeout).
 */

function emptyCtx(now: number, player: { x: number; y: number }): AIContext {
  return {
    now, dtSec: 0.05,
    player: {
      id: 'P', x: player.x, y: player.y, alive: true,
      isInvulnerable: () => false,
    },
    damage:           new DamagePipeline(),
    spawnProjectile:  () => {},
    spawnSummon:      () => null,
    livingSummonsOf:  () => 0,
    enemiesInRadius:  () => [],
  };
}

describe('AggroManager', () => {
  it('TEST 1 — acquire() sets aggroUntil to now + 6000', () => {
    const m = makeMonster(MONSTER_ROTLING);
    AggroManager.acquire(m, 1000);
    expect(m.aggroUntil).toBe(1000 + AGGRO_DURATION_MS);
    expect(AggroManager.isAggroed(m, 1000)).toBe(true);
  });

  it('TEST 2 — aggro expires after 6 seconds with no refresh', () => {
    const m = makeMonster(MONSTER_ROTLING);
    AggroManager.acquire(m, 0);
    expect(AggroManager.isAggroed(m, AGGRO_DURATION_MS - 1)).toBe(true);
    expect(AggroManager.isAggroed(m, AGGRO_DURATION_MS)).toBe(false);
    expect(AggroManager.isAggroed(m, AGGRO_DURATION_MS + 1)).toBe(false);
  });

  it('TEST 1 — entering aggro radius via MeleeChaseAI sets aggroUntil', () => {
    const ai = new MeleeChaseAI();
    const m = makeMonster(MONSTER_ROTLING, 1, { x: 0, y: 0 });
    // Aggro radius for Rotling: 7 world units * 32 = 224 px.
    // Place player inside radius — must aggro after a tick.
    const ctx = emptyCtx(0, { x: 100, y: 0 });
    // Force the think gate to allow immediate decision.
    m.nextThinkAt = -1;
    ai.tick(m, ctx);
    expect(m.aggroUntil).toBeGreaterThan(0);

    // Place player outside radius on a fresh monster — must NOT aggro.
    const farMonster = makeMonster(MONSTER_ROTLING, 1, { x: 0, y: 0 });
    farMonster.nextThinkAt = -1;
    ai.tick(farMonster, emptyCtx(0, { x: 500, y: 0 }));
    expect(farMonster.aggroUntil).toBe(0);
  });

  it('clear() forces de-aggro', () => {
    const m = makeMonster(MONSTER_ROTLING);
    AggroManager.acquire(m, 1000);
    AggroManager.clear(m);
    expect(AggroManager.isAggroed(m, 2000)).toBe(false);
  });
});
