/**
 * SourceType — origin of a modifier. Used for grouping in the debug panel
 * and for bulk removal (e.g. `ModifierManager.removeBySource('helm_42')`
 * when unequipping an item).
 */
export const SourceType = {
  ITEM:     'ITEM',
  SKILL:    'SKILL',
  BUFF:     'BUFF',
  PASSIVE:  'PASSIVE',
  MONSTER:  'MONSTER',
  AURA:     'AURA',
} as const;

export type SourceType = typeof SourceType[keyof typeof SourceType];
