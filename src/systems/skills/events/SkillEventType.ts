/**
 * SkillEventType — the canonical set of skill-pipeline events.
 *
 *   ON_SKILL_CAST     — emitted when a cast actually fires (after cast
 *                       time has elapsed). Triggered casts also emit.
 *   ON_SKILL_HIT      — emitted for each damage instance the skill
 *                       produced (every projectile hit, every nova
 *                       target, every ground-AOE tick).
 *   ON_SKILL_CRIT     — emitted alongside ON_SKILL_HIT when the hit crit.
 *   ON_SKILL_KILL     — emitted when a skill instance kills its target.
 *   ON_SKILL_TRIGGER  — emitted when a skill cast was invoked by a
 *                       trigger effect rather than direct player input.
 */
export const SkillEventType = {
  ON_SKILL_CAST:     'ON_SKILL_CAST',
  ON_SKILL_HIT:      'ON_SKILL_HIT',
  ON_SKILL_CRIT:     'ON_SKILL_CRIT',
  ON_SKILL_KILL:     'ON_SKILL_KILL',
  ON_SKILL_TRIGGER:  'ON_SKILL_TRIGGER',
} as const;

export type SkillEventType = typeof SkillEventType[keyof typeof SkillEventType];
