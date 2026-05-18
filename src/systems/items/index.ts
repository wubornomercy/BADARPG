/**
 * BAD ARPG — Itemization Core V1 (public barrel).
 *
 * Architecture invariants (do NOT break):
 *   - Item generation is data-driven. Adding a new affix or base is editing
 *     `data/affixes.ts` or `data/itemBases.ts` — never new TS classes.
 *   - All stat changes from items flow through ItemStatApplier → StatManager.
 *     No module directly mutates Player stats on behalf of an item.
 *   - Rolled values persist for the lifetime of the item instance. Pickup
 *     never re-rolls; equip never re-rolls.
 *   - Future legendary / unique / set items plug in by extending ItemRarity
 *     and authoring new AffixDefinition / ItemBaseType data — no refactor.
 */

export { ItemRarity, RARITY_COLOR, RARITY_AFFIX_LIMITS, MAX_TOTAL_AFFIXES } from './types/ItemRarity.js';
export { EquipmentSlot, PLAYER_SLOTS, resolvePlayerSlots } from './types/EquipmentSlot.js';
export type { PlayerEquipmentSlot } from './types/EquipmentSlot.js';
export type { AffixTier } from './types/AffixTier.js';
export { AffixType } from './types/AffixDefinition.js';
export type { AffixDefinition } from './types/AffixDefinition.js';
export type { ItemBaseType } from './types/ItemBaseType.js';
export type { ItemDefinition, RolledAffix } from './types/ItemDefinition.js';
export type { LootContext } from './types/LootContext.js';

export { WeightResolver } from './generation/WeightResolver.js';
export { ItemLevelCalculator } from './generation/ItemLevelCalculator.js';
export { AffixRoller } from './generation/AffixRoller.js';

export { ItemManager } from './core/ItemManager.js';
export { AffixManager } from './core/AffixManager.js';
export { LootGenerator } from './core/LootGenerator.js';
export type { LootGenerationTrace } from './core/LootGenerator.js';
export { ItemStatApplier } from './core/ItemStatApplier.js';
export { EquipmentManager } from './core/EquipmentManager.js';
export type { EquippedSet, EquipResult } from './core/EquipmentManager.js';
export { TooltipBuilder } from './core/TooltipBuilder.js';
export type { TooltipView, TooltipLine } from './core/TooltipBuilder.js';

export { STARTER_BASES,
  BASE_RUSTBLADE_DAGGER, BASE_BLIGHTWOOD_WAND, BASE_ROTFANG_BOW,
  BASE_TATTERED_HOOD, BASE_DISEASED_VEST, BASE_BONEGRIP_GLOVES, BASE_CARRION_BOOTS,
  BASE_ROTBONE_AMULET, BASE_WORMCOIL_RING,
} from './data/itemBases.js';
export { STARTER_AFFIXES,
  AFFIX_VICIOUS, AFFIX_VENOMOUS, AFFIX_MYSTIC, AFFIX_MASSIVE,
  AFFIX_SWIFTNESS, AFFIX_PRECISION, AFFIX_VENOM_WARD, AFFIX_FROST_WARD,
} from './data/affixes.js';
export { BASE_RARITY_WEIGHTS } from './data/rarityTables.js';

export { ItemDebugPanel } from './debug/ItemDebugPanel.js';
