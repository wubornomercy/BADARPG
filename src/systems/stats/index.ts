/**
 * BAD ARPG — Stat System V1 (public barrel).
 *
 * Consumers should import from this module:
 *   import { StatManager, StatType, ModifierType } from '@/systems/stats';
 *
 * Architecture invariants (do NOT break):
 *   - All entity stat reads go through StatManager.getFinalStat().
 *   - All stat changes go through ModifierManager (or setBase for true
 *     base-value changes such as level-up grants).
 *   - The stat system has zero dependencies on rendering, UI framework,
 *     animation, VFX, or networking. Only StatDebugPanel touches the DOM,
 *     and it's an optional dev-only consumer.
 */

export { StatType, PRIMARY_STATS, RESIST_STATS } from './types/StatType.js';
export { ModifierType } from './types/ModifierType.js';
export { SourceType } from './types/SourceType.js';
export type { StatModifier } from './types/StatModifier.js';
export type { ModifierCondition } from './types/ModifierCondition.js';

export { StatManager } from './core/StatManager.js';
export type { StatBreakdown } from './core/StatManager.js';
export { defaultConditionEvaluator } from './core/StatManager.js';
export { ModifierManager, nextModifierId } from './core/ModifierManager.js';
export { DerivedStatCalculator } from './core/DerivedStatCalculator.js';
export type { DerivedContribution } from './core/DerivedStatCalculator.js';
export { TagManager, STANDARD_TAGS } from './core/TagManager.js';
export type { StandardTag } from './core/TagManager.js';

export { StatCache } from './cache/StatCache.js';
export { StatDebugPanel } from './debug/StatDebugPanel.js';

export { CAPS, clampStat } from './caps.js';
export { PLAYER_LEVEL_1_BASE, getBaselineValue } from './baseline.js';
