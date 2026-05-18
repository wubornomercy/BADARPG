import type { CombatEntity } from '../../combat/types/CombatEntity.js';

/**
 * SkillWorld — minimal "what targets exist around point X" contract.
 *
 * The skill system is intentionally decoupled from the live game state.
 * main.ts implements this interface (closing over the enemies array) and
 * passes the implementation to SkillManager at construction time. Tests
 * provide their own implementation with a fixed enemy list.
 *
 * Future additions (line-sweep for beams, target lock-on, target groups)
 * land here as new methods rather than as direct main.ts reach-ins from
 * behaviors.
 */
export interface SkillWorld {
  /**
   * Returns alive enemies whose center is within `radius` pixels of
   * (`cx`, `cy`). Implementations may use a broad-phase grid; for V1
   * a linear scan is fine (max 40 enemies).
   */
  enemiesInRadius(cx: number, cy: number, radius: number): CombatEntity[];
}
