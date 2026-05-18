import type { MonsterDefinition } from '../types/MonsterDefinition.js';
import type { MonsterRuntime } from '../ai/AIBase.js';
import type { MonsterManager } from './MonsterManager.js';
import { EliteManager, ELITE_CHANCE } from './EliteManager.js';

/**
 * MonsterFactory — host-provided callback that turns a spawn plan into
 * a concrete runtime entity (Pixi-bound in production, plain object in
 * tests). Spawner stays Pixi-free.
 */
export type MonsterFactory = (
  def: MonsterDefinition,
  level: number,
  position: { x: number; y: number },
  opts: { eliteModifierId?: string; summonerId?: string },
) => MonsterRuntime | null;

/**
 * MonsterSpawner — single intake for monster creation.
 *
 * Responsibilities:
 *   - Roll elite (8% by default, per spec).
 *   - Delegate visual creation to the host-supplied factory.
 *   - Apply the elite modifier via EliteManager (sourceId tracked).
 *
 * Spawn-position safety (5-unit player distance, ground hazards) is
 * the director's job — by the time the spawner runs, the position is
 * already validated.
 */
export class MonsterSpawner {
  constructor(
    private readonly monsters: MonsterManager,
    private readonly elites:   EliteManager,
    private readonly factory:  MonsterFactory,
  ) {}

  /**
   * Spawn one monster. Returns the runtime, or null if the factory
   * rejected the spawn (e.g. global cap reached host-side).
   */
  spawn(opts: {
    definitionId: string;
    position: { x: number; y: number };
    level?: number;
    /** Per-spawn elite roll chance. Set to 0 for guaranteed-non-elite (e.g. summons). */
    eliteChance?: number;
    /** Force a specific elite modifier id (skips the random roll). */
    forcedEliteModifierId?: string;
    /** Parent monster's runtime id when this is a summon. */
    summonerId?: string;
    /** Injectable RNG for tests. */
    rng?: () => number;
  }): MonsterRuntime | null {
    const def = this.monsters.getDefinition(opts.definitionId);
    if (!def) return null;

    const chance = opts.eliteChance ?? ELITE_CHANCE;
    const rng = opts.rng ?? Math.random;
    let eliteId: string | undefined = opts.forcedEliteModifierId;
    // Summons never roll elite by default.
    const elligibleForRoll = !opts.summonerId && eliteId === undefined && chance > 0;
    if (elligibleForRoll && rng() < chance) {
      eliteId = this.elites.pickRandom(rng);
    }

    const entity = this.factory(def, opts.level ?? def.level, opts.position, {
      eliteModifierId: eliteId,
      summonerId:      opts.summonerId,
    });
    if (!entity) return null;

    if (eliteId) this.elites.applyTo(entity, eliteId);

    return entity;
  }
}
