import type { SkillBehavior, SkillCaster, BehaviorContext } from '../core/SkillExecutor.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import { TILE_PX } from '../types/SkillProjectileConfig.js';

const DEFAULT_DASH_DISTANCE_UNITS = 4.5;
const DEFAULT_DASH_DURATION_SEC   = 0.18;

/**
 * Caster extension for DASH — must expose the dodge / i-frame slot the
 * player already uses for the Space-bar roll. Setting `dodgeUntil` is
 * what makes `Player.isInvulnerable(now)` return true; main.ts gates
 * incoming damage by that, granting the spec-mandated "100% dodge
 * chance during movement window".
 */
interface DashCapableCaster extends SkillCaster {
  dodgeUntil: number;
  dodgeReadyAt: number;
  dodgeDir: { x: number; y: number };
  /** Overrides the default TUNE.DODGE_SPEED_MULT for this dash window. */
  dodgeSpeedOverride: number;
}

function isDashCapable(c: SkillCaster): c is DashCapableCaster {
  return typeof (c as DashCapableCaster).dodgeUntil === 'number';
}

/**
 * DashBehavior — drives the caster forward by overriding the existing
 * dodge state on Player. Reuses Player.update()'s dodge movement path so
 * we get one source of truth for "fast directional travel + i-frames".
 *
 * Distance / duration are configurable via skill.behaviorConfig:
 *   - distance: world units (default 4.5)
 *   - duration: seconds (default 0.18)
 *
 * No damage. Architecture supports future "damage on dash through" via
 * an optional behaviorConfig.damageOnContact knob (not implemented V1).
 */
export class DashBehavior implements SkillBehavior {
  execute(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, bctx: BehaviorContext): void {
    if (!isDashCapable(caster)) return;
    const distanceUnits = (skill.behaviorConfig?.distance as number | undefined) ?? DEFAULT_DASH_DISTANCE_UNITS;
    const durationSec   = (skill.behaviorConfig?.duration as number | undefined) ?? DEFAULT_DASH_DURATION_SEC;

    const distancePx = distanceUnits * TILE_PX;
    const durationMs = durationSec * 1000;

    let dx = ctx.direction.x;
    let dy = ctx.direction.y;
    const mag = Math.hypot(dx, dy);
    if (mag < 0.0001) { dx = 1; dy = 0; }
    else { dx /= mag; dy /= mag; }

    caster.dodgeDir = { x: dx, y: dy };
    caster.dodgeUntil = bctx.now + durationMs;
    // Dash gets its own speed so the spec's exact distance lands inside
    // exact duration regardless of the global DODGE_SPEED_MULT.
    caster.dodgeSpeedOverride = distancePx / durationSec;
  }
}
