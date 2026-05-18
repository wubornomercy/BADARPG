import type { SkillBehavior, SkillCaster, BehaviorContext } from '../core/SkillExecutor.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import { SkillEventType } from '../events/SkillEventType.js';
import { TILE_PX } from '../types/SkillProjectileConfig.js';
import { DamageType } from '../../combat/types/DamageType.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';

/** Default nova radius (world units → pixels) per spec. */
const DEFAULT_NOVA_RADIUS_UNITS = 3.5;

/**
 * NovaBehavior — instantaneous circular AOE centered on the caster.
 * Walks every enemy in range and routes a damage instance through the
 * combat pipeline. Emits ON_SKILL_HIT / CRIT / KILL per affected target.
 */
export class NovaBehavior implements SkillBehavior {
  execute(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, bctx: BehaviorContext): void {
    const radiusUnits = (skill.behaviorConfig?.radius as number | undefined) ?? DEFAULT_NOVA_RADIUS_UNITS;
    const radiusPx    = radiusUnits * TILE_PX;
    const baseDamage  = skill.baseDamage ?? 0;
    const damageType  = skill.damageType ?? DamageType.PHYSICAL;
    const tags        = [...skill.tags, ...ctx.runtimeTags];

    const targets = bctx.world.enemiesInRadius(caster.x, caster.y, radiusPx);
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.x - caster.x;
      const dy = t.y - caster.y;
      const dist = Math.hypot(dx, dy) || 1;
      const dmgCtx: DamageContext = {
        sourceEntityId: caster.id,
        targetEntityId: t.id,
        sourceTags:     tags,
        baseDamage,
        damageType,
        canCrit:        skill.canCrit ?? true,
        canBeBlocked:   true,
        canBeDodged:    true,
        metadata: {
          sourceSkillId: skill.id,
          dirX: dx / dist,
          dirY: dy / dist,
          hitX: t.x,
          hitY: t.y,
        },
      };
      const result = bctx.pipeline.resolve(caster, t, dmgCtx);

      if (!result.wasDodged) {
        if (result.wasCrit) {
          bctx.events.emit({
            type: SkillEventType.ON_SKILL_CRIT,
            caster, skill, context: ctx, tags,
            target: t, result,
            chainDepth: ctx.chainDepth ?? 0,
          });
        }
        bctx.events.emit({
          type: SkillEventType.ON_SKILL_HIT,
          caster, skill, context: ctx, tags,
          target: t, result,
          chainDepth: ctx.chainDepth ?? 0,
        });
        if (result.targetKilled) {
          bctx.events.emit({
            type: SkillEventType.ON_SKILL_KILL,
            caster, skill, context: ctx, tags,
            target: t, result,
            chainDepth: ctx.chainDepth ?? 0,
          });
        }
      }
    }
  }
}
