/**
 * SkillContext — per-cast runtime data assembled by the input layer (or
 * a trigger source) before SkillExecutor runs the skill.
 *
 *  castPosition   — world point where the cast originates. For most
 *                   skills this is the caster's position; ground-target
 *                   skills use the cursor world point.
 *  direction      — unit vector. Required for DIRECTIONAL skills; ignored
 *                   by SELF_CENTERED.
 *  targetIds      — explicit target list (AUTO_TARGET pre-resolved).
 *  runtimeTags    — extra tags merged with the skill's static tags
 *                   (e.g. "fromTrigger", "withBowEquipped").
 *  triggeredBy    — non-empty when this cast was fired by a trigger
 *                   effect; the value is the source skill id. Drives
 *                   trigger-protection and free-cast (no resource / no
 *                   cast time) behavior.
 *  chainDepth     — current depth in the trigger chain. Hard-capped at
 *                   16 by the executor to prevent runaway loops.
 *  chainHistory   — set of skill ids already fired in this chain; used
 *                   to enforce per-skill triggerProtection.
 */
export interface SkillContext {
  casterId:     string;
  skillId:      string;
  castPosition: { x: number; y: number };
  direction:    { x: number; y: number };
  targetIds?:   string[];
  runtimeTags:  string[];
  triggeredBy?: string;
  chainDepth?:  number;
  /** Internal — populated by the executor; never set by the caller. */
  chainHistory?: ReadonlySet<string>;
}
