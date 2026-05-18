/**
 * MonsterRole — exhaustive role taxonomy per spec.
 *
 * Each role is paired with an AI class that creates a DIFFERENT kind of
 * combat pressure:
 *
 *   SWARM     — clear-speed / AOE pressure
 *   CHARGER   — dodge-timing / positioning pressure
 *   RANGED    — ranged dps / projectile-avoidance / gap-closer pressure
 *   SUICIDE   — awareness / anti-swarm pressure
 *   SUMMONER  — target-prioritisation / sustain pressure
 *   ELITE     — meta tag layered on top of the above for tougher spawns
 *
 * ELITE is a tag, not a separate AI — elite monsters inherit their base
 * role's AI and get one extra EliteModifier applied at spawn time.
 */
export const MonsterRole = {
  SWARM:    'SWARM',
  CHARGER:  'CHARGER',
  RANGED:   'RANGED',
  SUICIDE:  'SUICIDE',
  SUMMONER: 'SUMMONER',
  ELITE:    'ELITE',
} as const;

export type MonsterRole = typeof MonsterRole[keyof typeof MonsterRole];

/** Per-role separation strength per spec patch 3. */
export const ROLE_SEPARATION_STRENGTH: Record<MonsterRole, number> = {
  SWARM:    0.35,
  CHARGER:  0.80,
  RANGED:   0.80,
  SUICIDE:  0.80,
  SUMMONER: 0.80,
  ELITE:    0.80,
};
