import type { SpawnWave } from '../types/SpawnWave.js';
import { MonsterArchetype } from '../types/MonsterArchetype.js';

/**
 * Spawn wave templates — director picks one per dispatch then jitters
 * counts and positions on top. Spec requires variety across waves and
 * forbids "all ranged" / "all charger" / "suicide-stack" compositions.
 *
 * Each template is a pre-validated pressure pattern per the spec's
 * "REQUIRED WAVE TARGETS" examples.
 */
export const STARTER_WAVES: ReadonlyArray<SpawnWave> = [
  // 4 Rotlings + 1 Archer — swarm with ranged backline.
  {
    monsters: [
      { monsterId: MonsterArchetype.ROTLING,       count: 4 },
      { monsterId: MonsterArchetype.BLIGHT_ARCHER, count: 1 },
    ],
    eliteChance: 0.08,
    minimumDistanceFromPlayer: 160, // 5 world units × 32 px
  },
  // 3 Rotlings + 1 Charger — light swarm + threat.
  {
    monsters: [
      { monsterId: MonsterArchetype.ROTLING,      count: 3 },
      { monsterId: MonsterArchetype.PLAGUE_HOUND, count: 1 },
    ],
    eliteChance: 0.08,
    minimumDistanceFromPlayer: 160,
  },
  // 6 Rotlings + 1 Suicide — dense swarm with a punisher.
  {
    monsters: [
      { monsterId: MonsterArchetype.ROTLING,    count: 6 },
      { monsterId: MonsterArchetype.FESTERLING, count: 1 },
    ],
    eliteChance: 0.08,
    minimumDistanceFromPlayer: 160,
  },
  // Mixed pressure — director uses sparingly.
  {
    monsters: [
      { monsterId: MonsterArchetype.ROTLING,       count: 3 },
      { monsterId: MonsterArchetype.BLIGHT_ARCHER, count: 1 },
      { monsterId: MonsterArchetype.PLAGUE_HOUND,  count: 1 },
    ],
    eliteChance: 0.08,
    minimumDistanceFromPlayer: 160,
  },
];

/** Spec-mandated role composition envelope used by the director's sanity check. */
export const COMPOSITION_TARGETS = {
  SWARM:    { min: 0.50, max: 0.60 },
  RANGED:   { min: 0.15, max: 0.20 },
  CHARGER:  { min: 0.10, max: 0.15 },
  SUICIDE:  { min: 0.05, max: 0.10 },
  SUMMONER: { min: 0.00, max: 0.05 },
} as const;
