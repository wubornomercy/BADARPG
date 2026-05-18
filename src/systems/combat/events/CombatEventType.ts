/**
 * CombatEventType — the canonical set of combat-pipeline events.
 *
 * The pipeline emits these in the following order per resolved hit:
 *   ON_DODGE  (mutually exclusive — short-circuits the rest)
 *   ON_BLOCK  (fires alongside the normal/crit chain)
 *   ON_CRIT   (fires before ON_HIT for the same instance)
 *   ON_HIT
 *   ON_DAMAGE_TAKEN
 *   ON_KILL   (if hp transitions to ≤ 0)
 */
export const CombatEventType = {
  ON_HIT:           'ON_HIT',
  ON_CRIT:          'ON_CRIT',
  ON_BLOCK:         'ON_BLOCK',
  ON_DODGE:         'ON_DODGE',
  ON_KILL:          'ON_KILL',
  ON_DAMAGE_TAKEN:  'ON_DAMAGE_TAKEN',
} as const;

export type CombatEventType = typeof CombatEventType[keyof typeof CombatEventType];
