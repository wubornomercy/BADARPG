/**
 * SkillTargetingType — how the input layer resolves a cast direction or
 * target before the executor runs.
 *
 *  DIRECTIONAL    — cast direction = vector from caster to cursor
 *  GROUND_TARGET  — cast position = cursor world point (AOE on ground)
 *  SELF_CENTERED  — cast position = caster position; direction irrelevant
 *  AUTO_TARGET    — system picks nearest valid enemy (or sticks to caster)
 */
export const SkillTargetingType = {
  DIRECTIONAL:   'DIRECTIONAL',
  GROUND_TARGET: 'GROUND_TARGET',
  SELF_CENTERED: 'SELF_CENTERED',
  AUTO_TARGET:   'AUTO_TARGET',
} as const;

export type SkillTargetingType = typeof SkillTargetingType[keyof typeof SkillTargetingType];
