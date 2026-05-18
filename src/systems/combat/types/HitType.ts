/**
 * HitType — classification of a resolved damage attempt. Set during hit
 * resolution and surfaced on DamageResult + every CombatEvent.
 *
 *  normal  — landed without crit, block, or dodge
 *  crit    — landed and rolled a critical strike
 *  blocked — landed but the target blocked (damage * 0.35)
 *  dodged  — target dodged entirely (damage = 0)
 */
export const HitType = {
  NORMAL:  'normal',
  CRIT:    'crit',
  BLOCKED: 'blocked',
  DODGED:  'dodged',
} as const;

export type HitType = typeof HitType[keyof typeof HitType];
