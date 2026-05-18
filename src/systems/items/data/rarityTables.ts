import { ItemRarity } from '../types/ItemRarity.js';

/**
 * Base rarity drop weights per spec.
 *   NORMAL: 72%
 *   MAGIC:  23%
 *   RARE:   5%
 *
 * Future systems (rarity-find affixes, magic-find buffs, league
 * modifiers) will scale these on top — keep the table here as the
 * single source of truth.
 */
export const BASE_RARITY_WEIGHTS: ReadonlyArray<{ rarity: ItemRarity; weight: number }> = [
  { rarity: ItemRarity.NORMAL, weight: 72 },
  { rarity: ItemRarity.MAGIC,  weight: 23 },
  { rarity: ItemRarity.RARE,   weight:  5 },
];
