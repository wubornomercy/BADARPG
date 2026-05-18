import type { SkillBehavior, SkillCaster, BehaviorContext } from '../core/SkillExecutor.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import { TILE_PX } from '../types/SkillProjectileConfig.js';
import { DamageType } from '../../combat/types/DamageType.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';
import { SkillEventType } from '../events/SkillEventType.js';

/**
 * BeamBehavior — continuous directional damage with a tick interval.
 *
 * Spec defaults:
 *   - Tick rate: 0.12 seconds (120 ms)
 *   - Beam DOT cannot crit by default (canCrit=false, isDOT=true)
 *
 * Behavior config knobs:
 *   - length:        world units (default 8)
 *   - halfWidth:     world units (default 0.6)
 *   - duration:      seconds (default 0.6)  — number of ticks = duration / interval
 *   - tickInterval:  seconds (default 0.12)
 *
 * Architecture: schedules a ScheduledEffect that re-samples enemies
 * along the beam line each tick. No starter skill uses BEAM in V1, so
 * this is the architecture-only implementation per spec.
 */
const DEFAULT_BEAM_LEN_UNITS    = 8;
const DEFAULT_BEAM_WIDTH_UNITS  = 0.6;
const DEFAULT_BEAM_DURATION_SEC = 0.6;
const DEFAULT_BEAM_TICK_SEC     = 0.12;

export class BeamBehavior implements SkillBehavior {
  execute(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, bctx: BehaviorContext): void {
    const lenUnits  = (skill.behaviorConfig?.length       as number | undefined) ?? DEFAULT_BEAM_LEN_UNITS;
    const widthUnit = (skill.behaviorConfig?.halfWidth    as number | undefined) ?? DEFAULT_BEAM_WIDTH_UNITS;
    const duration  = (skill.behaviorConfig?.duration     as number | undefined) ?? DEFAULT_BEAM_DURATION_SEC;
    const tickSec   = (skill.behaviorConfig?.tickInterval as number | undefined) ?? DEFAULT_BEAM_TICK_SEC;

    const lenPx     = lenUnits * TILE_PX;
    const widthPx   = widthUnit * TILE_PX;
    const tickMs    = tickSec * 1000;
    const damageType = skill.damageType ?? DamageType.LIGHTNING;
    const baseDamage = skill.baseDamage ?? 0;
    const tags = [...skill.tags, ...ctx.runtimeTags];

    let dx = ctx.direction.x, dy = ctx.direction.y;
    const mag = Math.hypot(dx, dy) || 1;
    dx /= mag; dy /= mag;

    const dropTick = (now: number) => {
      // Sample 4 points along the beam, take all enemies within widthPx.
      const seen = new Set<string>();
      for (let i = 1; i <= 4; i++) {
        const sx = caster.x + dx * (lenPx * (i / 4));
        const sy = caster.y + dy * (lenPx * (i / 4));
        for (const t of bctx.world.enemiesInRadius(sx, sy, widthPx)) {
          if (!t.alive || seen.has(t.id)) continue;
          seen.add(t.id);
          const c: DamageContext = {
            sourceEntityId: caster.id,
            targetEntityId: t.id,
            sourceTags:     tags,
            baseDamage,
            damageType,
            // Spec: beam tick is DOT, no crit by default.
            canCrit:        skill.canCrit === true,
            canBeBlocked:   false,
            canBeDodged:    false,
            isDOT:          true,
            metadata: { sourceSkillId: skill.id, dirX: dx, dirY: dy, hitX: t.x, hitY: t.y },
          };
          const result = bctx.pipeline.resolve(caster, t, c);
          if (!result.wasDodged) {
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
    };

    bctx.schedule({
      alive: true,
      nextTickAt: bctx.now,                        // immediate first tick
      endAt:      bctx.now + duration * 1000,
      tickIntervalMs: tickMs,
      onTick: dropTick,
    });
  }
}
