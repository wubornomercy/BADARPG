/**
 * SkillProjectileConfig — knobs for a projectile-behavior skill.
 *
 * Spec values are in ABSTRACT WORLD UNITS (1 unit ≈ 32 px in BAD ARPG).
 * Conversion happens in ProjectileEntity at spawn time; downstream code
 * stays unit-agnostic.
 *
 * Defaults (when omitted by the SkillDefinition):
 *   speed:       14
 *   radius:      0.2
 *   maxDistance: 12
 *   pierceCount: 0
 *   chainCount:  0
 *   forkCount:   0
 *   hitCooldown: 0.15  (seconds — prevents repeat hits on same target)
 *
 * `shotgunGroup` ties multi-projectile shots so a single target counts
 * as one hit across the group (architecture hook — V1 does not enforce).
 */
export interface SkillProjectileConfig {
  speed:        number;
  radius:       number;
  maxDistance:  number;
  pierceCount:  number;
  chainCount:   number;
  forkCount:    number;
  returnToCaster?: boolean;
  shotgunGroup?:   string;
  hitCooldown?:    number;
}

export const PROJECTILE_DEFAULTS = {
  speed:       14,
  radius:      0.2,
  maxDistance: 12,
  pierceCount: 0,
  chainCount:  0,
  forkCount:   0,
  hitCooldown: 0.15,
} as const;

/** Pixel scale: 1 world unit = TILE_PX pixels (matches game's existing scale). */
export const TILE_PX = 32;
