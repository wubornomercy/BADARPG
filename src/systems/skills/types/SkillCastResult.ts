/**
 * SkillCastResult — verdict returned by SkillExecutor.cast().
 *
 * `ok = true` means the cast was accepted (it may still be in its
 * cast-time window — see `pending`). The caller should not retry on
 * `ok = false`; check `reason` to surface UI feedback (greyed slot,
 * "out of mana" tooltip, etc.).
 */
export const CastFailReason = {
  COOLDOWN:               'COOLDOWN',
  INSUFFICIENT_MANA:      'INSUFFICIENT_MANA',
  INSUFFICIENT_HP:        'INSUFFICIENT_HP',
  CASTER_DEAD:            'CASTER_DEAD',
  STILL_CASTING:          'STILL_CASTING',
  TRIGGER_PROTECTED:      'TRIGGER_PROTECTED',
  CHAIN_DEPTH_EXCEEDED:   'CHAIN_DEPTH_EXCEEDED',
  UNKNOWN_BEHAVIOR:       'UNKNOWN_BEHAVIOR',
  UNKNOWN_SKILL:          'UNKNOWN_SKILL',
} as const;
export type CastFailReason = typeof CastFailReason[keyof typeof CastFailReason];

export interface SkillCastResult {
  ok:        boolean;
  /** True if the cast was accepted but is still in its cast-time window. */
  pending?:  boolean;
  /** Populated when ok = false. */
  reason?:   CastFailReason;
  /** Set when the executor immediately fired the skill (no cast time / triggered). */
  firedAt?:  number;
}
