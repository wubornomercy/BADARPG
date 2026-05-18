import type { ItemRarity } from './ItemRarity.js';

/**
 * RolledAffix — per-item-instance affix state.
 *
 * The exact rolled value (uniform in [tier.minValue, tier.maxValue]) is
 * persisted here. Item rolls NEVER regenerate on pickup, equip, or
 * world reload — once an item exists its numbers are fixed for life.
 */
export interface RolledAffix {
  affixId: string;
  tier: number;
  rolledValue: number;
}

/**
 * ItemDefinition — concrete per-pickup item instance.
 *
 * Spec calls this "ItemDefinition" but it's a per-instance object, not
 * the base template (ItemBaseType is the template). Renaming would
 * violate the spec wording, so we keep the name and document the
 * distinction here.
 *
 * `instanceId` is the stable id used as the StatManager modifier
 * sourceId prefix (`item_<instanceId>`). All modifiers from this item
 * carry that sourceId so EquipmentManager can remove them with one
 * removeBySource call on unequip.
 */
export interface ItemDefinition {
  instanceId: string;
  baseTypeId: string;
  rarity: ItemRarity;
  itemLevel: number;
  prefixes: RolledAffix[];
  suffixes: RolledAffix[];
}
