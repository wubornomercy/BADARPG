import type { EquipmentSlot } from './EquipmentSlot.js';
import type { StatModifier } from '../../stats/types/StatModifier.js';

/**
 * ItemBaseType — pure data template for a base item.
 *
 * Spec requires exactly this shape. `implicitModifiers` are StatModifier
 * templates: ItemStatApplier substitutes per-instance id and sourceId at
 * equip time so unequip can clean up via removeBySource.
 *
 * `baseRequirements` is V1-architecture-only; the spec lists it for
 * future passes (e.g. dexterity gating to wield a bow) — we never
 * enforce it in V1 but the field exists so callers can read it.
 *
 * `dropWeight` feeds the weighted base-type selection in LootGenerator.
 * Zero or negative weights effectively disable a base in the loot pool.
 */
export interface ItemBaseType {
  id: string;
  name: string;
  slot: EquipmentSlot;
  tags: string[];

  /** Static modifiers that apply whenever this base is equipped, regardless of rarity / affixes. */
  implicitModifiers: StatModifier[];

  baseRequirements?: {
    strength?:     number;
    dexterity?:    number;
    intelligence?: number;
  };

  /** Lowest monster level at which this base can drop. */
  itemLevel: number;
  /** Weight in the weighted base-type lottery. */
  dropWeight: number;
}
