import type { AffixTier } from './AffixTier.js';
import type { StatType } from '../../stats/types/StatType.js';
import type { ModifierType } from '../../stats/types/ModifierType.js';

/**
 * AffixType — prefix or suffix.
 */
export const AffixType = {
  PREFIX: 'PREFIX',
  SUFFIX: 'SUFFIX',
} as const;
export type AffixType = typeof AffixType[keyof typeof AffixType];

/**
 * AffixDefinition — pure data template for a rolling affix.
 *
 * Stat mapping (`statTarget` / `modifierType`) is kept on the definition
 * so generation produces a `RolledAffix` that ItemStatApplier can
 * turn into a real StatModifier with no per-affix branching.
 *
 * `tags` flow into the produced modifier's tag list — drives tag-based
 * scaling in the damage pipeline (e.g. Vicious + projectile → its
 * projectile-damage bonus only applies to projectile attacks).
 *
 * `displayFormat` is a template for tooltip rendering. `{v}` is replaced
 * with the rolled value, `{prefix/suffix label}` is implicit by affix
 * type.
 */
export interface AffixDefinition {
  id: string;
  name: string;
  affixType: AffixType;

  /** Tags that flow onto the produced StatModifier (and into tooltip categorization). */
  tags: string[];

  /** Minimum item level required for this affix to be eligible at all. */
  minItemLevel: number;

  /** Selection weight at the "which affix?" stage (affix vs affix pool). */
  weight: number;

  tiers: AffixTier[];

  // ---- Stat application ----
  statTarget: StatType;
  modifierType: ModifierType;
  /**
   * Optional display label override; otherwise the engine builds one
   * from name + value (e.g. "+22% increased projectile damage").
   */
  displayFormat?: string;
}
