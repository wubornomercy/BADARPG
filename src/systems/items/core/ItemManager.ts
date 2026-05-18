import type { ItemBaseType } from '../types/ItemBaseType.js';

/**
 * ItemManager — registry of item bases.
 *
 * Pure data store. LootGenerator queries `eligible(itemLevel)` to find
 * candidate bases for a drop; tooltips and inventory UI query `get(id)`
 * to resolve a base from an ItemDefinition's `baseTypeId`.
 */
export class ItemManager {
  private readonly bases: Map<string, ItemBaseType> = new Map();

  register(base: ItemBaseType): void { this.bases.set(base.id, base); }
  registerAll(bases: ItemBaseType[]): void { for (const b of bases) this.register(b); }
  get(id: string): ItemBaseType | undefined { return this.bases.get(id); }
  all(): ItemBaseType[] { return Array.from(this.bases.values()); }

  /** Bases whose itemLevel ≤ the drop's itemLevel and that have positive dropWeight. */
  eligible(itemLevel: number): ItemBaseType[] {
    const out: ItemBaseType[] = [];
    for (const b of this.bases.values()) {
      if (b.itemLevel > itemLevel) continue;
      if (b.dropWeight <= 0) continue;
      out.push(b);
    }
    return out;
  }
}
