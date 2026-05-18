import type { SkillBehavior, SkillCaster, BehaviorContext } from '../core/SkillExecutor.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import { PROJECTILE_DEFAULTS } from '../types/SkillProjectileConfig.js';
import { ProjectileEntity } from '../projectiles/ProjectileEntity.js';
import { DamageType } from '../../combat/types/DamageType.js';

/**
 * ProjectileBehavior — spawns a single moving hit-box that routes its
 * collisions through ProjectileManager / DamagePipeline. The actual
 * movement / collision / event emission lives in ProjectileManager.
 *
 * Spawn position: caster center plus a small forward offset so the
 * projectile graphic starts in front of the body, not inside it.
 */
export class ProjectileBehavior implements SkillBehavior {
  execute(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, bctx: BehaviorContext): void {
    const src = skill.projectile;
    const dirX = ctx.direction.x;
    const dirY = ctx.direction.y;
    const mag = Math.hypot(dirX, dirY);
    if (mag < 0.0001) return;
    const nx = dirX / mag;
    const ny = dirY / mag;

    const SPAWN_OFFSET_PX = 20;
    const entity = new ProjectileEntity({
      ownerId:       caster.id,
      sourceSkillId: skill.id,
      tags:          [...skill.tags, ...ctx.runtimeTags],
      x:             caster.x + nx * SPAWN_OFFSET_PX,
      y:             caster.y + ny * SPAWN_OFFSET_PX,
      dirX:          nx,
      dirY:          ny,
      cfg: {
        speed:          src?.speed        ?? PROJECTILE_DEFAULTS.speed,
        radius:         src?.radius       ?? PROJECTILE_DEFAULTS.radius,
        maxDistance:    src?.maxDistance  ?? PROJECTILE_DEFAULTS.maxDistance,
        pierceCount:    src?.pierceCount  ?? PROJECTILE_DEFAULTS.pierceCount,
        chainCount:     src?.chainCount   ?? PROJECTILE_DEFAULTS.chainCount,
        forkCount:      src?.forkCount    ?? PROJECTILE_DEFAULTS.forkCount,
        returnToCaster: src?.returnToCaster,
        shotgunGroup:   src?.shotgunGroup,
        hitCooldown:    src?.hitCooldown  ?? PROJECTILE_DEFAULTS.hitCooldown,
      },
      damageType:    skill.damageType ?? DamageType.PHYSICAL,
      baseDamage:    skill.baseDamage ?? 0,
      canCrit:       skill.canCrit ?? true,
      now:           bctx.now,
    });
    bctx.projectiles.spawn(entity);
  }
}
