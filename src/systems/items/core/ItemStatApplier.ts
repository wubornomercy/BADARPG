import type { ItemDefinition } from '../types/ItemDefinition.js';
import type { ItemBaseType } from '../types/ItemBaseType.js';
import type { StatModifier } from '../../stats/types/StatModifier.js';
import { SourceType } from '../../stats/types/SourceType.js';
import type { StatManager } from '../../stats/core/StatManager.js';
import { AffixManager } from './AffixManager.js';

/**
 * ItemStatApplier — converts an ItemDefinition (+ its base + the affix
 * registry) into a flat list of StatModifier objects, and pushes them
 * through StatManager.
 *
 * All modifiers carry sourceId `item_<instanceId>` so unequip can remove
 * them with one removeBySource call. Implicit modifiers are cloned (not
 * mutated in place) so the base-data template stays clean.
 *
 * RULE: this is the ONLY path that turns item data into stat modifiers.
 * No other module should directly call StatManager.modifiers.add() on
 * behalf of an item.
 */
export class ItemStatApplier {
  static sourceIdFor(item: ItemDefinition): string {
    return `item_${item.instanceId}`;
  }

  /** Returns the full modifier list this item contributes. Cheap — no allocations beyond the returned array. */
  static buildModifiers(
    item: ItemDefinition,
    base: ItemBaseType,
    affixes: AffixManager,
  ): StatModifier[] {
    const sourceId = ItemStatApplier.sourceIdFor(item);
    const out: StatModifier[] = [];

    // Implicit modifiers — clone and stamp with per-instance sourceId.
    for (const imp of base.implicitModifiers) {
      out.push({
        id: '',
        stat: imp.stat,
        modifierType: imp.modifierType,
        value: imp.value,
        sourceType: SourceType.ITEM,
        sourceId,
        tags: imp.tags ? [...imp.tags] : undefined,
        duration: imp.duration,
        condition: imp.condition,
      });
    }

    // Rolled affixes — lookup the definition for stat target + tags.
    const all = [...item.prefixes, ...item.suffixes];
    for (const rolled of all) {
      const def = affixes.get(rolled.affixId);
      if (!def) continue;
      out.push({
        id: '',
        stat: def.statTarget,
        modifierType: def.modifierType,
        value: rolled.rolledValue,
        sourceType: SourceType.ITEM,
        sourceId,
        tags: def.tags.length > 0 ? [...def.tags] : undefined,
      });
    }
    return out;
  }

  /** Push all of an item's modifiers into the target StatManager. */
  static apply(item: ItemDefinition, base: ItemBaseType, affixes: AffixManager, statMgr: StatManager): void {
    const mods = ItemStatApplier.buildModifiers(item, base, affixes);
    for (const m of mods) statMgr.modifiers.add(m);
  }

  /** Strip an item's modifiers from a StatManager via sourceId bulk-remove. */
  static remove(item: ItemDefinition, statMgr: StatManager): number {
    return statMgr.modifiers.removeBySource(ItemStatApplier.sourceIdFor(item));
  }
}
