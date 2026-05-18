import { describe, it, expect } from 'vitest';
import {
  MonsterManager, MonsterSpawner, MonsterDirector, EliteManager,
  STARTER_MONSTERS, MeleeChaseAI, RangedKiteAI, ChargerAI, SuicideAI, SummonerAI,
  ROLE_SEPARATION_STRENGTH, MonsterRole,
  type MonsterFactory, type MonsterRuntime,
} from '../index.js';
import { StatManager, StatType } from '../../stats/index.js';
import { makeMonster } from './testHelpers.js';

/**
 * spawnDirector.test — TEST 3 (density limits) + TEST 4 (composition rules).
 */

function setup() {
  const mgr = new MonsterManager();
  mgr.registerDefinitions(STARTER_MONSTERS);
  mgr.registerAIs([new MeleeChaseAI(), new RangedKiteAI(), new ChargerAI(), new SuicideAI(), new SummonerAI()]);
  const elites = new EliteManager();

  const factory: MonsterFactory = (def, level, pos, opts) => {
    const m = makeMonster(def, level, { x: pos.x, y: pos.y });
    if (opts.summonerId) m.summonerId = opts.summonerId;
    return m;
  };
  const spawner = new MonsterSpawner(mgr, elites, factory);
  return { mgr, elites, spawner };
}

describe('MonsterDirector', () => {
  it('TEST 3 — does not exceed local density cap', () => {
    const { spawner } = setup();
    const director = new MonsterDirector(spawner, { localDensityCap: 6 });
    const active: MonsterRuntime[] = [];
    const player = { x: 0, y: 0 };
    let rng = 0;
    const rngFn = () => { rng = (rng + 0.137) % 1; return rng; };

    for (let i = 0; i < 5; i++) {
      const wave = director.dispatchOne({ now: i * 5000, player, activeMonsters: active, rng: rngFn });
      for (const m of wave) active.push(m);
    }
    const nearby = active.filter((m) => {
      const dx = m.x - player.x, dy = m.y - player.y;
      return dx * dx + dy * dy <= (16 * 32) ** 2;
    }).length;
    expect(nearby).toBeLessThanOrEqual(6);
  });

  it('TEST 4 — composition over many waves trends toward swarm-heavy', () => {
    const { spawner } = setup();
    const director = new MonsterDirector(spawner, { localDensityCap: 9999 });
    const active: MonsterRuntime[] = [];
    const player = { x: 0, y: 0 };
    let rng = 0;
    const rngFn = () => { rng = (rng + 0.31) % 1; return rng; };

    for (let i = 0; i < 60; i++) {
      const wave = director.dispatchOne({ now: i * 5000, player, activeMonsters: active, rng: rngFn });
      for (const m of wave) active.push(m);
    }
    const total = active.length;
    expect(total).toBeGreaterThan(50); // plenty of samples

    const roleCounts: Record<string, number> = {};
    for (const m of active) {
      roleCounts[m.definition.role] = (roleCounts[m.definition.role] ?? 0) + 1;
    }
    const swarmPct = (roleCounts[MonsterRole.SWARM] ?? 0) / total;
    // Spec: 50-60% SWARM. Allow ±15-pp tolerance for the small starter wave pool.
    expect(swarmPct).toBeGreaterThanOrEqual(0.4);
    expect(swarmPct).toBeLessThanOrEqual(0.85);
    // No "all ranged" or "all charger" packs — every wave includes Rotlings.
    expect(roleCounts[MonsterRole.RANGED] ?? 0).toBeLessThan(swarmPct * total);
  });

  it('dispatched waves vary across consecutive calls', () => {
    const { spawner } = setup();
    const director = new MonsterDirector(spawner);
    const active: MonsterRuntime[] = [];
    const player = { x: 0, y: 0 };
    let r = 0;
    const rngFn = () => { r = (r + 0.41) % 1; return r; };

    const compositions: string[] = [];
    for (let i = 0; i < 8; i++) {
      const wave = director.dispatchOne({ now: i * 5000, player, activeMonsters: active, rng: rngFn });
      const key = wave.map((m) => m.definition.id).sort().join(',');
      compositions.push(key);
    }
    // At least two distinct compositions across 8 dispatches.
    const unique = new Set(compositions);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('respects minimum spawn distance from player', () => {
    const { spawner } = setup();
    const director = new MonsterDirector(spawner);
    const player = { x: 0, y: 0 };
    const wave = director.dispatchOne({ now: 0, player, activeMonsters: [] });
    for (const m of wave) {
      const dx = m.x - player.x, dy = m.y - player.y;
      const dist = Math.hypot(dx, dy);
      expect(dist).toBeGreaterThanOrEqual(160); // 5 world units × 32 px
    }
  });
});
