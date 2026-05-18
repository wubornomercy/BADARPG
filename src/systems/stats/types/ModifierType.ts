/**
 * ModifierType — exactly 4 kinds, per spec.
 *
 * Pipeline order is fixed:
 *   Base → FLAT → INCREASED → MORE → OVERRIDE → clamp
 *
 * FLAT       — additive to base (e.g. +20 maxHP)
 * INCREASED  — additive percentage; all INCREASED stack in one sum (e.g. +35% damage)
 * MORE       — multiplicative percentage; each MORE multiplies independently
 * OVERRIDE   — final value replacement (highest priority, last-write-wins)
 */
export const ModifierType = {
  FLAT:      'FLAT',
  INCREASED: 'INCREASED',
  MORE:      'MORE',
  OVERRIDE:  'OVERRIDE',
} as const;

export type ModifierType = typeof ModifierType[keyof typeof ModifierType];
