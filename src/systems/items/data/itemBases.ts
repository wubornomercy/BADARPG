import { EquipmentSlot } from '../types/EquipmentSlot.js';
import type { ItemBaseType } from '../types/ItemBaseType.js';
import { StatType } from '../../stats/types/StatType.js';
import { ModifierType } from '../../stats/types/ModifierType.js';
import { SourceType } from '../../stats/types/SourceType.js';
import type { StatModifier } from '../../stats/types/StatModifier.js';

/**
 * Starter item bases — 9 entries per spec.
 *
 * Implicit modifiers use placeholder `id` / `sourceId` strings; the
 * ItemStatApplier substitutes per-instance values at equip time so
 * unequip can remove them via removeBySource('item_<instanceId>').
 *
 * Numeric values, tags, and slot names are spec-exact.
 */

/** Helper: build an implicit StatModifier template. */
function implicit(stat: StatType, modType: typeof ModifierType[keyof typeof ModifierType], value: number, tags?: string[]): StatModifier {
  return {
    id: '',
    stat,
    modifierType: modType,
    value,
    sourceType: SourceType.ITEM,
    sourceId: '',
    tags,
  };
}

// ===== WEAPONS =====

export const BASE_RUSTBLADE_DAGGER: ItemBaseType = {
  id: 'base_rustblade_dagger',
  name: '锈裂匕首',
  slot: EquipmentSlot.WEAPON,
  tags: ['weapon', 'dagger', 'melee'],
  implicitModifiers: [implicit(StatType.CRIT_CHANCE, ModifierType.FLAT, 5)],
  itemLevel: 1,
  dropWeight: 100,
};

export const BASE_BLIGHTWOOD_WAND: ItemBaseType = {
  id: 'base_blightwood_wand',
  name: '腐木魔杖',
  slot: EquipmentSlot.WEAPON,
  tags: ['weapon', 'wand', 'spell'],
  implicitModifiers: [implicit(StatType.SPELL_DAMAGE, ModifierType.FLAT, 12)],
  itemLevel: 1,
  dropWeight: 100,
};

export const BASE_ROTFANG_BOW: ItemBaseType = {
  id: 'base_rotfang_bow',
  name: '腐牙之弓',
  slot: EquipmentSlot.WEAPON,
  tags: ['weapon', 'bow', 'projectile'],
  implicitModifiers: [implicit(StatType.PROJECTILE_DAMAGE, ModifierType.FLAT, 10)],
  itemLevel: 1,
  dropWeight: 100,
};

// ===== ARMOR =====

export const BASE_TATTERED_HOOD: ItemBaseType = {
  id: 'base_tattered_hood',
  name: '残破兜帽',
  slot: EquipmentSlot.HELMET,
  tags: ['armor', 'helmet'],
  implicitModifiers: [implicit(StatType.MAX_HP, ModifierType.FLAT, 12)],
  itemLevel: 1,
  dropWeight: 100,
};

export const BASE_DISEASED_VEST: ItemBaseType = {
  id: 'base_diseased_vest',
  name: '病疫胸甲',
  slot: EquipmentSlot.CHEST,
  tags: ['armor', 'chest'],
  implicitModifiers: [implicit(StatType.ARMOR, ModifierType.FLAT, 18)],
  itemLevel: 1,
  dropWeight: 100,
};

export const BASE_BONEGRIP_GLOVES: ItemBaseType = {
  id: 'base_bonegrip_gloves',
  name: '骨握手套',
  slot: EquipmentSlot.GLOVES,
  tags: ['armor', 'gloves'],
  implicitModifiers: [implicit(StatType.ATTACK_SPEED, ModifierType.INCREASED, 4)],
  itemLevel: 1,
  dropWeight: 100,
};

export const BASE_CARRION_BOOTS: ItemBaseType = {
  id: 'base_carrion_boots',
  name: '腐肉之靴',
  slot: EquipmentSlot.BOOTS,
  tags: ['armor', 'boots'],
  implicitModifiers: [implicit(StatType.MOVE_SPEED, ModifierType.INCREASED, 6)],
  itemLevel: 1,
  dropWeight: 100,
};

// ===== JEWELRY =====

export const BASE_ROTBONE_AMULET: ItemBaseType = {
  id: 'base_rotbone_amulet',
  name: '腐骨护符',
  slot: EquipmentSlot.AMULET,
  tags: ['jewelry', 'amulet'],
  implicitModifiers: [implicit(StatType.MAX_MANA, ModifierType.FLAT, 14)],
  itemLevel: 1,
  dropWeight: 100,
};

export const BASE_WORMCOIL_RING: ItemBaseType = {
  id: 'base_wormcoil_ring',
  name: '虫蜷之戒',
  slot: EquipmentSlot.RING, // base-spec category — equips to ringLeft or ringRight
  tags: ['jewelry', 'ring'],
  implicitModifiers: [implicit(StatType.POISON_DAMAGE, ModifierType.FLAT, 8)],
  itemLevel: 1,
  dropWeight: 100,
};

export const STARTER_BASES: ItemBaseType[] = [
  BASE_RUSTBLADE_DAGGER, BASE_BLIGHTWOOD_WAND, BASE_ROTFANG_BOW,
  BASE_TATTERED_HOOD, BASE_DISEASED_VEST, BASE_BONEGRIP_GLOVES, BASE_CARRION_BOOTS,
  BASE_ROTBONE_AMULET, BASE_WORMCOIL_RING,
];
