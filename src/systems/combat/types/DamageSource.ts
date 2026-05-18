/**
 * DamageSource — categorical origin of a damage instance.
 *
 * The DamagePipeline treats `DamageContext.sourceEntityId` as the actual
 * entity reference; this enum captures the high-level kind so analytics,
 * lifesteal gating, and threat tables can branch on it without scanning
 * stat tags.
 */
export const DamageSource = {
  /** Attack from a player-controlled entity. */
  PLAYER:     'PLAYER',
  /** Hit dealt by a hostile NPC / monster. */
  MONSTER:    'MONSTER',
  /** Damage over time tick (corruption pool, burning ground, poison stack). */
  ENVIRONMENT:'ENVIRONMENT',
  /** Damage from a chained/triggered effect re-firing a stored hit. */
  TRIGGER:    'TRIGGER',
  /** Reflected damage. */
  REFLECT:    'REFLECT',
  /** Internal/test plumbing. */
  SYNTHETIC:  'SYNTHETIC',
} as const;

export type DamageSource = typeof DamageSource[keyof typeof DamageSource];
