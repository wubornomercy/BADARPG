/**
 * SkillBehaviorType — the 5 starter behaviors mandated by spec.
 *
 * Each value maps to a concrete Behavior class in `behaviors/`. New
 * behaviors register themselves in the behavior registry — adding one
 * does NOT require changes here unless the new behavior is a permanent
 * part of the public taxonomy.
 *
 *  PROJECTILE  — spawns a moving entity that collides with targets
 *  NOVA        — instantaneous circular AOE around the caster
 *  DASH        — moves the caster rapidly; grants temporary dodge immunity
 *  BEAM        — continuous directional damage with a tick interval
 *  GROUND_AOE  — persistent ground patch that ticks while alive
 */
export const SkillBehaviorType = {
  PROJECTILE:  'PROJECTILE',
  NOVA:        'NOVA',
  DASH:        'DASH',
  BEAM:        'BEAM',
  GROUND_AOE:  'GROUND_AOE',
} as const;

export type SkillBehaviorType = typeof SkillBehaviorType[keyof typeof SkillBehaviorType];
