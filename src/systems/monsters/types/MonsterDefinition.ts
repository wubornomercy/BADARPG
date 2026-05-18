import type { MonsterRole } from './MonsterRole.js';

/**
 * MonsterDefinition — pure data row for a monster archetype.
 *
 * `skills` is reserved for the future "monster casts player-system skill"
 * pathway. V1 AI hard-wires its abilities (charge attack, suicide
 * explosion, summon spawning) directly through the relevant managers
 * rather than going through SkillExecutor; the field exists so later
 * passes can migrate without a schema change.
 *
 * `behaviorConfig` holds AI-specific tunables (preferredDistance for
 * ranged, chargeRange/chargeWindup for charger, explosionRadius for
 * suicide, summonCooldown/maxSummons for summoner).
 */
export interface MonsterDefinition {
  id: string;
  name: string;
  role: MonsterRole;
  level: number;

  baseHP: number;
  moveSpeed: number;
  aggroRadius: number;

  xpReward: number;
  lootMultiplier: number;

  tags: string[];
  skills?: string[];
  aiType: string;

  behaviorConfig?: Record<string, any>;
}
