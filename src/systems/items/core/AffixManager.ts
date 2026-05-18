import type { AffixDefinition, AffixType } from '../types/AffixDefinition.js';

/**
 * AffixManager — registry + eligibility queries for affixes.
 *
 * Held by LootGenerator + tests + the debug panel. Pure lookup — no
 * randomness lives here.
 */
export class AffixManager {
  private readonly registry: Map<string, AffixDefinition> = new Map();

  register(def: AffixDefinition): void { this.registry.set(def.id, def); }
  registerAll(defs: AffixDefinition[]): void { for (const d of defs) this.register(d); }
  get(id: string): AffixDefinition | undefined { return this.registry.get(id); }
  has(id: string): boolean { return this.registry.has(id); }
  all(): AffixDefinition[] { return Array.from(this.registry.values()); }

  /** Affixes eligible for the (itemLevel, type) combination — filtered + sorted by weight for stable iteration. */
  eligible(itemLevel: number, type: AffixType): AffixDefinition[] {
    const out: AffixDefinition[] = [];
    for (const a of this.registry.values()) {
      if (a.affixType !== type) continue;
      if (a.minItemLevel > itemLevel) continue;
      if (a.weight <= 0) continue;
      out.push(a);
    }
    return out;
  }
}
