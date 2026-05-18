/**
 * AilmentType — status conditions that a hit may apply.
 *
 * NOTE: Per spec V1 we implement ARCHITECTURE SUPPORT ONLY. The pipeline
 * records `appliedAilments` on the DamageResult, but actual ailment
 * mechanics (DOT ticks, freeze movement lock, shock damage taken, etc.)
 * are out of scope for this phase.
 */
export const AilmentType = {
  BURN:   'burn',
  POISON: 'poison',
  SHOCK:  'shock',
  FREEZE: 'freeze',
  BLEED:  'bleed',
} as const;

export type AilmentType = typeof AilmentType[keyof typeof AilmentType];
