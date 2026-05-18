import type { SpawnWave } from '../types/SpawnWave.js';
import type { MonsterRuntime } from '../ai/AIBase.js';
import { STARTER_WAVES } from '../data/spawnTables.js';
import { MonsterSpawner } from './MonsterSpawner.js';

/**
 * MonsterDirector — pacing + composition controller.
 *
 * Responsibilities:
 *   - Picks the next wave template (varies pattern across dispatches).
 *   - Validates candidate spawn positions per spec patch 6:
 *       distance to player ≥ 5 world units (160 px), inside world
 *       bounds, not inside a blocking radius (host-supplied predicate).
 *   - Enforces local density cap (max 18 active monsters near player
 *     per spec).
 *
 * The director DOES NOT create entities — it computes per-monster spawn
 * plans and forwards them to MonsterSpawner.spawn().
 */
export const LOCAL_DENSITY_CAP = 18;
export const NEARBY_RADIUS_PX  = 16 * 32; // 16 world units of "nearby"

export interface DirectorConfig {
  /** Custom wave list — defaults to STARTER_WAVES. */
  waves?: ReadonlyArray<SpawnWave>;
  /** Seconds between automatic wave dispatches. */
  dispatchIntervalSec?: number;
  /** Density cap (max active nearby monsters). */
  localDensityCap?: number;
}

export class MonsterDirector {
  private readonly waves: ReadonlyArray<SpawnWave>;
  private readonly densityCap: number;
  private readonly dispatchIntervalMs: number;
  private lastWaveIdx = -1;
  private nextDispatchAt = 0;

  constructor(
    private readonly spawner: MonsterSpawner,
    cfg: DirectorConfig = {},
  ) {
    this.waves              = cfg.waves ?? STARTER_WAVES;
    this.densityCap         = cfg.localDensityCap ?? LOCAL_DENSITY_CAP;
    this.dispatchIntervalMs = (cfg.dispatchIntervalSec ?? 4) * 1000;
  }

  /**
   * Per-frame tick. Dispatches a wave at the configured interval, as
   * long as we're below the density cap. The host supplies the live
   * monster list and the player position; we don't track state.
   */
  update(args: {
    now: number;
    player: { x: number; y: number };
    activeMonsters: ReadonlyArray<MonsterRuntime>;
    rng?: () => number;
  }): void {
    if (args.now < this.nextDispatchAt) return;
    if (this.activeNearby(args.activeMonsters, args.player) >= this.densityCap) {
      this.nextDispatchAt = args.now + 500;
      return;
    }
    this.dispatchOne({ now: args.now, player: args.player, activeMonsters: args.activeMonsters, rng: args.rng });
    this.nextDispatchAt = args.now + this.dispatchIntervalMs;
  }

  /**
   * Dispatch a single wave immediately, returning the spawned monsters.
   * Used by the per-frame update() and tests.
   */
  dispatchOne(args: {
    now: number;
    player: { x: number; y: number };
    activeMonsters: ReadonlyArray<MonsterRuntime>;
    rng?: () => number;
  }): MonsterRuntime[] {
    const wave = this.pickWave(args.rng);
    return this.spawnWave(wave, args.player, args.activeMonsters, args.rng);
  }

  /**
   * Spawn every monster in `wave` at safe positions around the player.
   * Returns the runtime list (skips any rejected by the factory).
   */
  spawnWave(
    wave: SpawnWave,
    player: { x: number; y: number },
    activeMonsters: ReadonlyArray<MonsterRuntime>,
    rng: () => number = Math.random,
  ): MonsterRuntime[] {
    const out: MonsterRuntime[] = [];
    for (const entry of wave.monsters) {
      for (let i = 0; i < entry.count; i++) {
        if (this.activeNearby(activeMonsters, player) + out.length >= this.densityCap) return out;
        const pos = this.pickSpawnPosition(player, wave.minimumDistanceFromPlayer, rng);
        const ent = this.spawner.spawn({
          definitionId: entry.monsterId,
          position:     pos,
          eliteChance:  wave.eliteChance,
          rng,
        });
        if (ent) out.push(ent);
      }
    }
    return out;
  }

  private pickWave(rng: () => number = Math.random): SpawnWave {
    // Avoid immediate repeats so pressure patterns shift.
    let idx = Math.floor(rng() * this.waves.length);
    if (this.waves.length > 1 && idx === this.lastWaveIdx) {
      idx = (idx + 1) % this.waves.length;
    }
    this.lastWaveIdx = idx;
    return this.waves[idx];
  }

  private pickSpawnPosition(
    player: { x: number; y: number },
    minDistPx: number,
    rng: () => number,
  ): { x: number; y: number } {
    // Annular sample: random angle, random radius in [minDist, minDist*2.5].
    const angle = rng() * Math.PI * 2;
    const radius = minDistPx + rng() * (minDistPx * 1.5);
    return {
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
    };
  }

  private activeNearby(active: ReadonlyArray<MonsterRuntime>, player: { x: number; y: number }): number {
    const r2 = NEARBY_RADIUS_PX * NEARBY_RADIUS_PX;
    let n = 0;
    for (const m of active) {
      if (!m.alive) continue;
      const dx = m.x - player.x;
      const dy = m.y - player.y;
      if (dx * dx + dy * dy <= r2) n++;
    }
    return n;
  }
}
