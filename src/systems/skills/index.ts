/**
 * BAD ARPG — Skill System V1 (public barrel).
 *
 * Consumers (main.ts, future trigger / passive systems) import from here:
 *   import { SkillManager, SKILL_CORRUPT_BOLT } from '@/systems/skills';
 *
 * Architecture invariants (do NOT break):
 *   - All skill casts go through SkillExecutor (via SkillManager.cast()).
 *   - All damage produced by skills goes through DamagePipeline.
 *   - All offensive scaling reads through StatManager (via the damage pipeline).
 *   - Skill data is a row in a table (SkillDefinition) — never a class.
 *   - The skill system has zero rendering / VFX / animation imports.
 *     Visual reactions subscribe via SkillEvent + CombatEvent.
 */

export { SkillBehaviorType } from './types/SkillBehaviorType.js';
export { SkillTargetingType } from './types/SkillTargetingType.js';
export type { SkillProjectileConfig } from './types/SkillProjectileConfig.js';
export { PROJECTILE_DEFAULTS, TILE_PX } from './types/SkillProjectileConfig.js';
export type { SkillDefinition } from './types/SkillDefinition.js';
export type { SkillContext } from './types/SkillContext.js';
export type { SkillCastResult } from './types/SkillCastResult.js';
export { CastFailReason } from './types/SkillCastResult.js';

export { SkillEventType } from './events/SkillEventType.js';
export type { SkillEvent } from './events/SkillEvent.js';

export { SkillManager } from './core/SkillManager.js';
export { SkillExecutor, MAX_TRIGGER_CHAIN_DEPTH } from './core/SkillExecutor.js';
export type { SkillCaster, SkillBehavior, BehaviorContext, ScheduledEffect } from './core/SkillExecutor.js';
export { SkillCooldownManager } from './core/SkillCooldownManager.js';
export { SkillResourceManager } from './core/SkillResourceManager.js';
export type { ResourceCaster } from './core/SkillResourceManager.js';
export { SkillEventDispatcher } from './core/SkillEventDispatcher.js';
export type { SkillEventListener } from './core/SkillEventDispatcher.js';
export type { SkillWorld } from './core/SkillWorld.js';

export { ProjectileEntity } from './projectiles/ProjectileEntity.js';
export { ProjectileManager } from './projectiles/ProjectileManager.js';

export { ProjectileBehavior } from './behaviors/ProjectileBehavior.js';
export { NovaBehavior } from './behaviors/NovaBehavior.js';
export { DashBehavior } from './behaviors/DashBehavior.js';
export { BeamBehavior } from './behaviors/BeamBehavior.js';
export { GroundAOEBehavior } from './behaviors/GroundAOEBehavior.js';

export {
  STARTER_SKILLS,
  SKILL_CORRUPT_BOLT,
  SKILL_VENOM_NOVA,
  SKILL_SHADOW_DASH,
  SKILL_CORRUPTION_FIELD,
} from './data/starterSkills.js';

export { SkillDebugPanel } from './debug/SkillDebugPanel.js';
