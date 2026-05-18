import type { StatManager } from '../../stats/core/StatManager.js';

/**
 * CombatEntity — minimum contract any object must satisfy to participate
 * in the DamagePipeline as either a source or a target.
 *
 * Player, Enemy, and synthetic test fixtures all structurally implement
 * this interface. Fields are intentionally permissive: `statManager` is
 * optional because not every source (DOT environments, triggered effects)
 * has a personal stat profile.
 *
 * Concrete implementations may add gameplay-specific reactions (hit
 * flashes, knockback, stagger). The pipeline never touches those — it
 * only mutates `hp`, `shield`, and `alive`. Subscribe to combat events
 * to react.
 */
export interface CombatEntity {
  /** Stable id used for event payloads and source/target equality checks. */
  id: string;
  /** Current health. Pipeline subtracts final damage from this. */
  hp: number;
  /** Maximum health. Currently informational (used for clamping heals). */
  hpMax: number;
  /** Optional armour-style buffer absorbed before HP. Spec V1 architecture-only. */
  shield?: number;
  /** Flipped to false by the pipeline on first hit that takes hp ≤ 0. */
  alive: boolean;
  /** Optional stat profile. Without it, defensive/offensive scaling defaults to zero. */
  statManager?: StatManager;
}
