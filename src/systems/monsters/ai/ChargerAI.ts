import { MonsterAI, type MonsterRuntime, type AIContext } from './AIBase.js';
import { StatType } from '../../stats/types/StatType.js';
import { DamageType } from '../../combat/types/DamageType.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';

/**
 * ChargerAI — CHARGER behavior.
 *
 * State machine (per-monster, stored on aiState):
 *
 *   IDLE       — chase player at normal speed (CombatPressure: closing).
 *   WINDUP     — froze in place for chargeWindup seconds, telegraphing the dash.
 *   DASH       — high-speed burst toward locked-in dashDir for ~0.25 s.
 *   COOLDOWN   — chase at normal speed but cannot windup again until cd ready.
 *
 * Contact damage uses behaviorConfig.contactDamage during IDLE/COOLDOWN
 * and chargeDamage during DASH (host applies via existing contact path).
 *
 * V1: damage application is wired by the host's contact-damage loop;
 * this AI only manages motion + state.
 */
type ChargeState = 'idle' | 'windup' | 'dash' | 'cooldown';
const TILE_PX = 32;
const DASH_DURATION_MS = 250;
const DASH_SPEED_MULT  = 3.5; // burst factor applied to base move speed

export class ChargerAI extends MonsterAI {
  readonly id = 'charger';

  protected decide(m: MonsterRuntime, ctx: AIContext): void {
    const cfg = m.definition.behaviorConfig ?? {};
    const dist = this.distToPlayer(m, ctx);

    if (dist <= m.definition.aggroRadius * TILE_PX) {
      m.aggroUntil = Math.max(m.aggroUntil, ctx.now + 6000);
    }
    if (ctx.now >= m.aggroUntil) return;

    const state = (m.aiState as { phase?: ChargeState }).phase ?? 'idle';
    const phaseEnd: number = (m.aiState as any).phaseEndAt ?? 0;
    const chargeCooldownMs = (cfg.chargeCooldown as number) * 1000;
    const chargeWindupMs   = (cfg.chargeWindup as number) * 1000;
    const chargeRangePx    = (cfg.chargeRange as number) * TILE_PX;

    if (state === 'idle' && dist <= chargeRangePx && ctx.now - m.lastAttackAt >= chargeCooldownMs) {
      const dir = this.toPlayer(m, ctx);
      m.aiState = {
        phase:        'windup',
        phaseEndAt:   ctx.now + chargeWindupMs,
        dashDir:      dir,
      };
    } else if (state === 'windup' && ctx.now >= phaseEnd) {
      m.aiState.phase = 'dash';
      m.aiState.phaseEndAt = ctx.now + DASH_DURATION_MS;
      m.lastAttackAt = ctx.now;
    } else if (state === 'dash' && ctx.now >= phaseEnd) {
      m.aiState.phase = 'cooldown';
      m.aiState.phaseEndAt = ctx.now + 700;
    } else if (state === 'cooldown' && ctx.now >= phaseEnd) {
      m.aiState.phase = 'idle';
    }
  }

  protected applyMovement(m: MonsterRuntime, ctx: AIContext): void {
    if (ctx.now >= m.aggroUntil) { m.vx = 0; m.vy = 0; return; }
    const moveSpeedFinal = m.statManager?.getFinalStat(StatType.MOVE_SPEED) ?? m.definition.moveSpeed;
    const speedPx = moveSpeedFinal * TILE_PX;
    const state: ChargeState = (m.aiState as { phase?: ChargeState }).phase ?? 'idle';
    if (state === 'windup') {
      // Telegraph — stand still.
      m.vx = 0; m.vy = 0;
    } else if (state === 'dash') {
      const d = (m.aiState as any).dashDir ?? { x: 1, y: 0 };
      m.vx = d.x * speedPx * DASH_SPEED_MULT;
      m.vy = d.y * speedPx * DASH_SPEED_MULT;
    } else {
      const dir = this.toPlayer(m, ctx);
      m.vx = dir.x * speedPx;
      m.vy = dir.y * speedPx;
    }
  }

  /** Public so the host's contact handler can read whether a hit should use chargeDamage. */
  static contactDamage(m: MonsterRuntime): number {
    const cfg = m.definition.behaviorConfig ?? {};
    const state: ChargeState = (m.aiState as { phase?: ChargeState }).phase ?? 'idle';
    return state === 'dash' ? (cfg.chargeDamage as number) : (cfg.contactDamage as number);
  }
}
