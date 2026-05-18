/**
 * DamageType — exhaustive damage classifications per spec.
 *
 * Used as the primary axis for the conversion / increased / more /
 * resistance pipeline. Each piece of damage is tagged with exactly one
 * DamageType at any point in the pipeline.
 */
export const DamageType = {
  PHYSICAL:  'physical',
  FIRE:      'fire',
  COLD:      'cold',
  LIGHTNING: 'lightning',
  POISON:    'poison',
} as const;

export type DamageType = typeof DamageType[keyof typeof DamageType];

/** Iteration order used by the pipeline when summing across types. */
export const DAMAGE_TYPES: readonly DamageType[] = [
  DamageType.PHYSICAL,
  DamageType.FIRE,
  DamageType.COLD,
  DamageType.LIGHTNING,
  DamageType.POISON,
];

/** Subset of damage types that consult elemental/ailment resistance. */
export const RESISTED_TYPES: readonly DamageType[] = [
  DamageType.FIRE,
  DamageType.COLD,
  DamageType.LIGHTNING,
  DamageType.POISON,
];

/** Internal per-damage-type bucket. Allocation-friendly (5 keys). */
export type DamageBundle = Partial<Record<DamageType, number>>;
