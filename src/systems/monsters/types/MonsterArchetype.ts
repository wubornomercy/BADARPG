/**
 * MonsterArchetype — string ids of the starter monsters. Used as the key
 * type for SpawnWave / MonsterManager lookups so callers get autocomplete
 * for the known starter set while still allowing data-loaded ids at
 * runtime (just widen to `string`).
 */
export const MonsterArchetype = {
  ROTLING:            'rotling',
  PLAGUE_HOUND:       'plague_hound',
  BLIGHT_ARCHER:      'blight_archer',
  FESTERLING:         'festerling',
  CORRUPT_BROODMOTHER:'corrupt_broodmother',
} as const;

export type MonsterArchetype = typeof MonsterArchetype[keyof typeof MonsterArchetype];
