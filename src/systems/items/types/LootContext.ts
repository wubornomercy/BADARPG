/**
 * LootContext — input to LootGenerator.generate().
 *
 *  itemLevel    — Drives base eligibility and affix eligibility. Spec rule:
 *                 item level = monster level. Callers compute this from
 *                 the source enemy.
 *  sourceTags   — Tags carried by the kill event. Reserved for future
 *                 "this monster type drops these affixes more often"
 *                 weighting; V1 ignores them.
 *  position     — World position to drop the item (if the host renders).
 *  forcedRarity — Debug / cheat hatch for tests and the debug panel.
 *  forcedBaseId — Debug / cheat hatch for tests and the debug panel.
 *  rng          — Injectable randomness for deterministic tests.
 */
export interface LootContext {
  itemLevel: number;
  sourceTags?: string[];
  position?: { x: number; y: number };
  forcedRarity?: import('./ItemRarity.js').ItemRarity;
  forcedBaseId?: string;
  rng?: () => number;
}
