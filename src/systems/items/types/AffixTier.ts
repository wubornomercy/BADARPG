/**
 * AffixTier — one tier of an affix.
 *
 * Spec rule: lower tier number = stronger. T1 is the strongest, T3 the
 * weakest. Tier weight is what makes higher tiers significantly rarer:
 * within an eligible affix, the AffixRoller picks a tier via weighted
 * selection (T1 has the lowest weight).
 *
 * `minValue` / `maxValue` are inclusive bounds for the uniform roll on
 * the rolled value persisted on the item.
 *
 * `minItemLevel` is optional and gates the tier independently of the
 * affix's own minItemLevel — future use; V1 starter tiers leave it
 * undefined.
 */
export interface AffixTier {
  tier: number;
  minValue: number;
  maxValue: number;
  weight: number;
  minItemLevel?: number;
}
