import type { SkillBehavior, SkillCaster, BehaviorContext } from '../core/SkillExecutor.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import { TILE_PX } from '../types/SkillProjectileConfig.js';
import { DamageType } from '../../combat/types/DamageType.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';
import { SkillEventType } from '../events/SkillEventType.js';

/**
 * GroundAOEBehavior — drops a persistent ground patch that ticks every
 * `tickInterval` seconds for `duration` seconds. Each tick damages every
 * enemy currently inside the patch radius via the DamagePipeline.
 *
 * Spec defaults:
 *   - tickInterval: 0.25 s
 *   - duration:     4 s
 *   - DOT cannot crit
 *
 * behaviorConfig knobs (with defaults):
 *   - radius:       3.0 world units
 *   - duration:     4 seconds
 *   - tickInterval: 0.25 seconds
 *   - ground:       boolean (drives "follow caster" vs "stick at cast position")
 *
 * Cast position defaults to ctx.castPosition (ground-targeted skills set
 * it to cursor); SELF_CENTERED skills set it to caster position.
 */
const DEFAULT_GROUND_RADIUS_UNITS   = 3.0;
const DEFAULT_GROUND_DURATION_SEC   = 4.0;
const DEFAULT_GROUND_TICK_SEC       = 0.25;

export class GroundAOEBehavior implements SkillBehavior {
  execute(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, bctx: BehaviorContext): void {
    const radiusUnits = (skill.behaviorConfig?.radius       as number | undefined) ?? DEFAULT_GROUND_RADIUS_UNITS;
    const durationSec = (skill.behaviorConfig?.duration     as number | undefined) ?? DEFAULT_GROUND_DURATION_SEC;
    const tickSec     = (skill.behaviorConfig?.tickInterval as number | undefined) ?? DEFAULT_GROUND_TICK_SEC;

    const radiusPx = radiusUnits * TILE_PX;
    const damageType = skill.damageType ?? DamageType.POISON;
    const baseDamage = skill.baseDamage ?? 0;
    const tags = [...skill.tags, ...ctx.runtimeTags];
    const cx = ctx.castPosition.x;
    const cy = ctx.castPosition.y;

    const doTick = (now: number) => {
      const targets = bctx.world.enemiesInRadius(cx, cy, radiusPx);
      for (const t of targets) {
        if (!t.alive) continue;
        const c: DamageContext = {
          sourceEntityId: caster.id,
          targetEntityId: t.id,
          sourceTags:     tags,
          baseDamage,
          damageType,
          canCrit:        skill.canCrit === true, // DOT cannot crit by default
          canBeBlocked:   false,
          canBeDodged:    false,
          isDOT:          true,
          metadata: { sourceSkillId: skill.id, hitX: t.x, hitY: t.y },
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
    };

    bctx.schedule({
      alive: true,
      nextTickAt:    bctx.now + tickSec * 1000, // first tick after one interval (not instant)
      endAt:         bctx.now + durationSec * 1000,
      tickIntervalMs: tickSec * 1000,
      onTick:        doTick,
    });

    // Emit a CAST event tagged with patch metadata so main.ts can render
    // a persistent ground visual (purely presentational — listener spawns
    // the Graphics; behavior never touches Pixi).
    bctx.events.emit({
      type:    SkillEventType.ON_SKILL_CAST,
      caster, skill, context: ctx, tags,
      chainDepth: ctx.chainDepth ?? 0,
    });
  }
}
