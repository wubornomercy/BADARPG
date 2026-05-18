import { MonsterAI, type MonsterRuntime, type AIContext } from './AIBase.js';
import { StatType } from '../../stats/types/StatType.js';

/**
 * MeleeChaseAI — SWARM behavior.
 *
 * Direct chase, full aggression once aggro is acquired. Minimal spacing,
 * overlap allowed (per-role separation strength 0.35 lets swarm clump).
 * Idle monsters wait passively; aggro radius check pulls them in.
 */
export class MeleeChaseAI extends MonsterAI {
  readonly id = 'melee_chase';

  protected decide(m: MonsterRuntime, ctx: AIContext): void {
    const dist = this.distToPlayer(m, ctx);
    if (dist <= m.definition.aggroRadius * 32) {
      m.aggroUntil = Math.max(m.aggroUntil, ctx.now + 6000);
    }
  }

  protected applyMovement(m: MonsterRuntime, ctx: AIContext): void {
    const aggroed = ctx.now < m.aggroUntil;
    if (!aggroed) {
      m.vx = 0; m.vy = 0;
      return;
    }
    const moveSpeedFinal = m.statManager
      ? m.statManager.getFinalStat(StatType.MOVE_SPEED)
      : m.definition.moveSpeed;
    const speedPxPerSec = moveSpeedFinal * 32;
    const dir = this.toPlayer(m, ctx);
    m.vx = dir.x * speedPxPerSec;
    m.vy = dir.y * speedPxPerSec;
  }
}
