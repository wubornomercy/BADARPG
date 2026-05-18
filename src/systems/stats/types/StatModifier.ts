import type { StatType } from './StatType.js';
import type { ModifierType } from './ModifierType.js';
import type { SourceType } from './SourceType.js';
import type { ModifierCondition } from './ModifierCondition.js';

/**
 * StatModifier — a single delta applied to a stat by the pipeline.
 *
 * `id`        — assigned by ModifierManager.add() if empty; opaque to callers.
 * `value`     — for FLAT: absolute additive.
 *               for INCREASED: percentage (35 means +35%).
 *               for MORE: percentage (30 means *1.30).
 *               for OVERRIDE: the final value to use.
 * `tags`      — when non-empty, the modifier only applies if ALL its tags
 *               are present in the query's contextTags.
 * `duration`  — milliseconds remaining; undefined = permanent. ModifierManager
 *               decrements this on tick() and removes the mod when it hits 0.
 * `condition` — when present, the modifier only applies if the condition
 *               evaluates true given the owning StatManager's condition state.
 */
export interface StatModifier {
  id: string;
  stat: StatType;
  modifierType: ModifierType;
  value: number;
  sourceType: SourceType;
  sourceId: string;
  tags?: string[];
  duration?: number;
  condition?: ModifierCondition;
}
