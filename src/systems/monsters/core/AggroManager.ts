import type { MonsterRuntime } from '../ai/AIBase.js';

/**
 * AggroManager — thin helper around `monster.aggroUntil`.
 *
 * Spec rules:
 *   - Aggro fires when player enters aggro radius OR monster takes damage.
 *   - Aggro times out after 6 seconds with no fresh trigger.
 *
 * The per-monster timestamp lives directly on the entity so the AI can
 * read it inline without indirecting through this manager. The manager
 * exposes the same operations centrally so host code (kill / damage
 * pipelines) has a single intake point.
 */
export const AGGRO_DURATION_MS = 6000;

export class AggroManager {
  /** Refresh / acquire aggro. Called by both radius check and damage hook. */
  static acquire(m: MonsterRuntime, now: number): void {
    m.aggroUntil = now + AGGRO_DURATION_MS;
  }

  /** True if the monster is currently aggroed. */
  static isAggroed(m: MonsterRuntime, now: number): boolean {
    return now < m.aggroUntil;
  }

  /** Forces de-aggro (e.g. zone reset). */
  static clear(m: MonsterRuntime): void {
    m.aggroUntil = 0;
  }
}
