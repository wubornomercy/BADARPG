import type { ItemDefinition } from '../types/ItemDefinition.js';
import type { ItemBaseType } from '../types/ItemBaseType.js';
import { EquipmentSlot, type PlayerEquipmentSlot, resolvePlayerSlots, PLAYER_SLOTS } from '../types/EquipmentSlot.js';
import type { StatManager } from '../../stats/core/StatManager.js';
import { ItemStatApplier } from './ItemStatApplier.js';
import { ItemManager } from './ItemManager.js';
import { AffixManager } from './AffixManager.js';

/**
 * EquippedSet — a player's slot → item map. We export the alias so call
 * sites can type their state cleanly without re-importing PlayerEquipmentSlot.
 */
export type EquippedSet = Partial<Record<PlayerEquipmentSlot, ItemDefinition | null>>;

export interface EquipResult {
  ok: boolean;
  /** Item that was unequipped to make room (may be null). */
  unequipped: ItemDefinition | null;
  /** Slot the item ended up in. */
  slot: PlayerEquipmentSlot | null;
  reason?: 'UNKNOWN_BASE' | 'INVALID_SLOT' | 'NO_TARGET_SLOT';
}

/**
 * EquipmentManager — owns the equip / unequip flow.
 *
 * Responsibilities:
 *   - Validate slot compatibility (resolves ring → ringLeft/Right).
 *   - Route modifier application / removal through ItemStatApplier.
 *   - Maintain the player's slot map.
 *
 * It does NOT own the inventory list — that lives on the Player. The
 * caller is expected to remove the item from inventory after a successful
 * equip and to return any displaced item to inventory.
 */
export class EquipmentManager {
  constructor(
    private readonly items:   ItemManager,
    private readonly affixes: AffixManager,
    private readonly stats:   StatManager,
  ) {}

  /**
   * Equip `item` into `target` (or the first compatible slot if omitted).
   * Returns the displaced item (if any) for the caller to push back into
   * inventory.
   */
  equip(item: ItemDefinition, slots: EquippedSet, target?: PlayerEquipmentSlot): EquipResult {
    const base = this.items.get(item.baseTypeId);
    if (!base) return { ok: false, unequipped: null, slot: null, reason: 'UNKNOWN_BASE' };

    const candidateSlots = resolvePlayerSlots(base.slot);
    let chosen: PlayerEquipmentSlot | null = null;

    if (target) {
      if (!candidateSlots.includes(target)) {
        return { ok: false, unequipped: null, slot: null, reason: 'INVALID_SLOT' };
      }
      chosen = target;
    } else {
      // Pick the first empty candidate; if all full, the first one.
      for (const s of candidateSlots) {
        if (!slots[s]) { chosen = s; break; }
      }
      if (!chosen) chosen = candidateSlots[0] ?? null;
    }
    if (!chosen) return { ok: false, unequipped: null, slot: null, reason: 'NO_TARGET_SLOT' };

    const prev = slots[chosen] ?? null;
    if (prev) ItemStatApplier.remove(prev, this.stats);

    slots[chosen] = item;
    ItemStatApplier.apply(item, base, this.affixes, this.stats);
    return { ok: true, unequipped: prev, slot: chosen };
  }

  /**
   * Unequip whatever lives in `slot`. Returns the removed item (or null).
   */
  unequip(slots: EquippedSet, slot: PlayerEquipmentSlot): ItemDefinition | null {
    const item = slots[slot];
    if (!item) return null;
    ItemStatApplier.remove(item, this.stats);
    slots[slot] = null;
    return item;
  }

  /** Wipe and unequip every slot. */
  unequipAll(slots: EquippedSet): ItemDefinition[] {
    const removed: ItemDefinition[] = [];
    for (const s of PLAYER_SLOTS) {
      const item = slots[s];
      if (!item) continue;
      ItemStatApplier.remove(item, this.stats);
      slots[s] = null;
      removed.push(item);
    }
    return removed;
  }
}
