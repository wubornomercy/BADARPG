import type { ItemDefinition, RolledAffix } from '../types/ItemDefinition.js';
import type { ItemBaseType } from '../types/ItemBaseType.js';
import type { LootContext } from '../types/LootContext.js';
import { ItemRarity, RARITY_AFFIX_LIMITS } from '../types/ItemRarity.js';
import { AffixType } from '../types/AffixDefinition.js';
import { BASE_RARITY_WEIGHTS } from '../data/rarityTables.js';
import { WeightResolver } from '../generation/WeightResolver.js';
import { AffixRoller } from '../generation/AffixRoller.js';
import { ItemManager } from './ItemManager.js';
import { AffixManager } from './AffixManager.js';

let instanceCounter = 0;

/**
 * LootGenerator — orchestrates the spec's full drop flow:
 *
 *   Enemy death → itemLevel → base selection → rarity roll → affix
 *   generation → tier rolls → final item assembly.
 *
 * Output is a fully-rolled ItemDefinition with persistent values. Items
 * NEVER re-roll: callers store the returned ItemDefinition on the
 * LootDrop entity and persist it through pickup / equip / inventory.
 *
 * Determinism: pass `ctx.rng` for tests; defaults to Math.random.
 */
export interface LootGenerationTrace {
  itemLevel: number;
  baseId: string;
  rarity: ItemRarity;
  prefixRolls: RolledAffix[];
  suffixRolls: RolledAffix[];
  prefixCount: number;
  suffixCount: number;
}

export class LootGenerator {
  private lastTrace: LootGenerationTrace | null = null;
  private readonly recentItems: ItemDefinition[] = [];
  private static readonly RECENT_CAP = 32;

  constructor(
    private readonly items:   ItemManager,
    private readonly affixes: AffixManager,
  ) {}

  generate(ctx: LootContext): ItemDefinition | null {
    const rng = ctx.rng ?? Math.random;
    const itemLevel = Math.max(1, ctx.itemLevel);

    // ----- Base selection -----
    let base: ItemBaseType | null = null;
    if (ctx.forcedBaseId) {
      base = this.items.get(ctx.forcedBaseId) ?? null;
    } else {
      const pool = this.items.eligible(itemLevel)
        .map((b) => ({ base: b, weight: b.dropWeight }));
      const pick = WeightResolver.pick(pool, rng);
      if (pick) base = pick.base;
    }
    if (!base) return null;

    // ----- Rarity roll -----
    const rarity: ItemRarity = ctx.forcedRarity
      ?? WeightResolver.pick(BASE_RARITY_WEIGHTS, rng)?.rarity
      ?? ItemRarity.NORMAL;

    // ----- Affix counts -----
    const limits = RARITY_AFFIX_LIMITS[rarity];
    let prefixCount = 0, suffixCount = 0;
    if (rarity === ItemRarity.MAGIC) {
      // Pick: prefix only / suffix only / both — uniform across the 3 outcomes.
      const roll = rng();
      if      (roll < 1 / 3) { prefixCount = 1; suffixCount = 0; }
      else if (roll < 2 / 3) { prefixCount = 0; suffixCount = 1; }
      else                   { prefixCount = 1; suffixCount = 1; }
    } else if (rarity === ItemRarity.RARE) {
      prefixCount = WeightResolver.randInt(limits.minPrefix, limits.maxPrefix, rng);
      suffixCount = WeightResolver.randInt(limits.minSuffix, limits.maxSuffix, rng);
    }

    // ----- Affix rolls -----
    const usedIds = new Set<string>();
    const prefixes = AffixRoller.roll(this.affixes, AffixType.PREFIX, prefixCount, itemLevel, usedIds, rng);
    const suffixes = AffixRoller.roll(this.affixes, AffixType.SUFFIX, suffixCount, itemLevel, usedIds, rng);

    // ----- Item assembly -----
    const item: ItemDefinition = {
      instanceId: `${Date.now().toString(36)}_${++instanceCounter}`,
      baseTypeId: base.id,
      rarity,
      itemLevel,
      prefixes,
      suffixes,
    };

    this.lastTrace = { itemLevel, baseId: base.id, rarity, prefixRolls: prefixes, suffixRolls: suffixes, prefixCount, suffixCount };
    this.recentItems.push(item);
    if (this.recentItems.length > LootGenerator.RECENT_CAP) this.recentItems.shift();

    return item;
  }

  lastGeneration(): LootGenerationTrace | null { return this.lastTrace; }
  recent(): readonly ItemDefinition[] { return this.recentItems; }
}
