/**
 * ItemRarity — V1 scope locked to NORMAL / MAGIC / RARE per spec.
 *
 * Legendary / Unique / Set are deliberately omitted. The data shapes
 * (AffixDefinition, ItemDefinition) keep their architecture open so
 * those tiers slot in later without a refactor.
 *
 * Affix limits per rarity:
 *   NORMAL — 0 affixes
 *   MAGIC  — 1 prefix OR 1 suffix OR 1 of each
 *   RARE   — 1-3 prefixes AND 1-3 suffixes (max 6 total)
 */
export const ItemRarity = {
  NORMAL: 'NORMAL',
  MAGIC:  'MAGIC',
  RARE:   'RARE',
} as const;

export type ItemRarity = typeof ItemRarity[keyof typeof ItemRarity];

/** Tooltip color hex per spec. */
export const RARITY_COLOR: Record<ItemRarity, string> = {
  NORMAL: '#BFBFBF',
  MAGIC:  '#4DA6FF',
  RARE:   '#FFE169',
};

/** Affix-count constraints — single source of truth, used by generator + tests. */
export const RARITY_AFFIX_LIMITS = {
  NORMAL: { minPrefix: 0, maxPrefix: 0, minSuffix: 0, maxSuffix: 0 },
  MAGIC:  { minPrefix: 0, maxPrefix: 1, minSuffix: 0, maxSuffix: 1 },
  RARE:   { minPrefix: 1, maxPrefix: 3, minSuffix: 1, maxSuffix: 3 },
} as const;

/** Hard upper bound on total affixes across all rarities. */
export const MAX_TOTAL_AFFIXES = 6;
