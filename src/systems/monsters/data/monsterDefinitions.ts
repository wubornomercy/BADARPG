import type { MonsterDefinition } from '../types/MonsterDefinition.js';
import { MonsterRole } from '../types/MonsterRole.js';
import { MonsterArchetype } from '../types/MonsterArchetype.js';

/**
 * Starter monster archetypes — exactly 5 per spec.
 *
 * Numeric values are verbatim from the spec. AI selection is by string
 * id (`aiType`) — MonsterManager looks it up against the AI registry at
 * spawn time. Behavior-specific tunables live in `behaviorConfig`.
 */

export const MONSTER_ROTLING: MonsterDefinition = {
  id:           MonsterArchetype.ROTLING,
  name:         '腐烬奴',
  role:         MonsterRole.SWARM,
  level:        1,
  baseHP:       42,
  moveSpeed:    5.8,
  aggroRadius:  7,
  xpReward:     4,
  lootMultiplier: 1.0,
  tags:         ['melee'],
  aiType:       'melee_chase',
  behaviorConfig: {
    contactDamage: 6,
    attackCooldown: 1.1,
  },
};

export const MONSTER_PLAGUE_HOUND: MonsterDefinition = {
  id:           MonsterArchetype.PLAGUE_HOUND,
  name:         '腐疫犬',
  role:         MonsterRole.CHARGER,
  level:        1,
  baseHP:       80,
  moveSpeed:    4.8,
  aggroRadius:  9,
  xpReward:     9,
  lootMultiplier: 1.2,
  tags:         ['melee', 'charge'],
  aiType:       'charger',
  behaviorConfig: {
    contactDamage:  16,
    chargeDamage:   28,
    chargeRange:    6,   // world units
    chargeWindup:   0.7, // seconds
    chargeCooldown: 5,   // seconds
  },
};

export const MONSTER_BLIGHT_ARCHER: MonsterDefinition = {
  id:           MonsterArchetype.BLIGHT_ARCHER,
  name:         '腐瘴箭手',
  role:         MonsterRole.RANGED,
  level:        1,
  baseHP:       55,
  moveSpeed:    4.6,
  aggroRadius:  10,
  xpReward:     7,
  lootMultiplier: 1.1,
  tags:         ['ranged', 'projectile'],
  aiType:       'ranged_kite',
  behaviorConfig: {
    projectileDamage:  11,
    projectileSpeed:   13,
    attackCooldown:    1.8,
    preferredDistance: 6.5,
  },
};

export const MONSTER_FESTERLING: MonsterDefinition = {
  id:           MonsterArchetype.FESTERLING,
  name:         '腐溃者',
  role:         MonsterRole.SUICIDE,
  level:        1,
  baseHP:       30,
  moveSpeed:    6.4,
  aggroRadius:  8,
  xpReward:     8,
  lootMultiplier: 1.15,
  tags:         ['melee', 'suicide'],
  aiType:       'suicide',
  behaviorConfig: {
    explosionDamage:  34,
    explosionRadius:  2.5, // world units
    explosionDelay:   0.45,// seconds
    explosionType:    'poison',
  },
};

export const MONSTER_CORRUPT_BROODMOTHER: MonsterDefinition = {
  id:           MonsterArchetype.CORRUPT_BROODMOTHER,
  name:         '腐母',
  role:         MonsterRole.SUMMONER,
  level:        1,
  baseHP:       120,
  moveSpeed:    3.8,
  aggroRadius:  10,
  xpReward:     18,
  lootMultiplier: 1.4,
  tags:         ['summoner'],
  aiType:       'summoner',
  behaviorConfig: {
    summonId:         MonsterArchetype.ROTLING,
    summonCooldown:   7,   // seconds
    maxActiveSummons: 5,
    preferredDistance: 7,
  },
};

export const STARTER_MONSTERS: MonsterDefinition[] = [
  MONSTER_ROTLING, MONSTER_PLAGUE_HOUND, MONSTER_BLIGHT_ARCHER,
  MONSTER_FESTERLING, MONSTER_CORRUPT_BROODMOTHER,
];
