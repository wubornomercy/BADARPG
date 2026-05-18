import type { MonsterDefinition } from './MonsterDefinition.js';

/**
 * SpawnContext — input to MonsterSpawner.spawn().
 *
 *  - `position` is the world point to spawn at. Spawn director must pre-
 *    validate this against player distance + ground hazards per spec
 *    patch 6.
 *  - `summonerId` populates the spawned monster's runtime field so
 *    summon-attribution / summon-cap tracking can find the parent.
 *  - `eliteModifierId` flags the spawn as elite; EliteManager attaches
 *    the modifier with sourceId `elite_<monsterId>` per spec patch 1.
 *  - `level` is the monster level. Falls back to the definition's own
 *    level when omitted.
 */
export interface SpawnContext {
  definition: MonsterDefinition;
  position: { x: number; y: number };
  level?: number;
  summonerId?: string;
  eliteModifierId?: string;
}
