/**
 * BuildPreset — declarative description of a "build archetype".
 *
 * Per COMBAT_FOUNDATION_V1 spec, Phase 2 V1 ships exactly 3 archetypes:
 *   VENOM RICOCHET / CRIT TRIGGER / CORRUPTION HUNTER
 *
 * A preset bundles:
 *   - identity:   ui label + design tags
 *   - modifiers:  stat modifiers to register against the player's
 *                 StatManager when the build is active. Each obeys the
 *                 standard Phase 1 modifier shape (BASE / INCREASED /
 *                 MORE / FLAT_LAST plus optional condition tags).
 *   - flags:      semantic toggles for behaviors that aren't pure stat
 *                 changes (granted ricochet count, trigger eligibility,
 *                 corruption gain rate multiplier).
 *
 * The intent is that mid-development we can change "what a build feels
 * like" by editing one data record here, without touching gameplay
 * code. The BuildManager applies/clears the modifiers as a single batch.
 */
import type { StatType } from '../../stats/types/StatType.js';
import type { ModifierType } from '../../stats/types/ModifierType.js';

export type BuildId = 'venom' | 'crit' | 'corruption';

export interface BuildModifier {
  stat:         StatType;
  modifierType: ModifierType;
  value:        number;
  /** Conditional tags — only applies when context.tags includes one of these. */
  tags?:        string[];
}

export interface BuildPreset {
  /** Stable id used by SkillManager triggers / BuildManager registry. */
  id:           BuildId;
  /** UI label, Chinese. */
  label:        string;
  /** Short pitch shown under the label. */
  tagline:      string;
  /** Designer-readable mechanic list for the right-side panel. */
  mechanics:    readonly string[];
  /** Stat modifiers to register (or unregister) on apply / clear. */
  modifiers:    readonly BuildModifier[];
  /** Per-build feature flags. */
  flags: {
    /** Extra ricochet bounces granted to player projectiles. */
    ricochetBonus?:        number;
    /** Per-skill trigger eligibility — when true and the trigger event
     *  fires (e.g. ON_CRIT), the build's onTriggerSkillId fires. */
    triggerEnabled?:       boolean;
    /** Which skill is fired on a trigger event. */
    onTriggerSkillId?:     string;
    /** Multiplier on corruption gain (e.g. 1.5 → Corruption Hunter gets
     *  +1.5 per elite kill instead of +1). */
    corruptionGainMult?:   number;
    /** Apply poison stacks on any direct damage hit. */
    appliesPoisonOnHit?:   boolean;
  };
}
