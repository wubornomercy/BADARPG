import { MonsterAI, type MonsterRuntime, type AIContext } from './AIBase.js';
import { StatType } from '../../stats/types/StatType.js';

/**
 * SummonerAI — SUMMONER behavior.
 *
 * Maintains preferred distance from the player and periodically spawns
 * a fresh summon (default: Rotling) up to maxActiveSummons. The summon
 * carries `summonerId = this.id` so the host can count via
 * `ctx.livingSummonsOf(this.id)`.
 *
 * Configurable knobs (behaviorConfig):
 *   - summonId            (which monster archetype to spawn)
 *   - summonCooldown      (seconds between summons)
 *   - maxActiveSummons    (cap — director / spawner enforces; AI re-checks too)
 *   - preferredDistance   (world units kite distance)
 */
const TILE_PX = 32;
const RETREAT_THRESHOLD = 0.7;
const ADVANCE_THRESHOLD = 1.4;

export class SummonerAI extends MonsterAI {
  readonly id = 'summoner';

  protected decide(m: MonsterRuntime, ctx: AIContext): void {
    const cfg = m.definition.behaviorConfig ?? {};
    if (this.distToPlayer(m, ctx) <= m.definition.aggroRadius * TILE_PX) {
      m.aggroUntil = Math.max(m.aggroUntil, ctx.now + 6000);
    }
    if (ctx.now >= m.aggroUntil) return;

    const summonCooldownMs = (cfg.summonCooldown as number) * 1000;
    const summonId         = cfg.summonId as string;
    const cap              = cfg.maxActiveSummons as number;
    const living           = ctx.livingSummonsOf(m.id);

    if (living < cap && ctx.now - m.lastAttackAt >= summonCooldownMs) {
      // Spawn near the summoner — random offset within ~3 world units.
      const angle = Math.random() * Math.PI * 2;
      const dist = (1.5 + Math.random() * 1.5) * TILE_PX;
      const pos = {
        x: m.x + Math.cos(angle) * dist,
        y: m.y + Math.sin(angle) * dist,
      };
      const child = ctx.spawnSummon(summonId, pos, m.id);
      if (child) m.lastAttackAt = ctx.now;
    }
  }

  protected applyMovement(m: MonsterRuntime, ctx: AIContext): void {
    if (ctx.now >= m.aggroUntil) { m.vx = 0; m.vy = 0; return; }
    const cfg = m.definition.behaviorConfig ?? {};
    const preferred = (cfg.preferredDistance as number) * TILE_PX;
    const dist = this.distToPlayer(m, ctx);
    const dir = this.toPlayer(m, ctx);
    const moveSpeedFinal = m.statManager?.getFinalStat(StatType.MOVE_SPEED) ?? m.definition.moveSpeed;
    const speedPx = moveSpeedFinal * TILE_PX;

    if (dist < preferred * RETREAT_THRESHOLD) {
      m.vx = -dir.x * speedPx;
      m.vy = -dir.y * speedPx;
    } else if (dist > preferred * ADVANCE_THRESHOLD) {
      m.vx = dir.x * speedPx * 0.5;
      m.vy = dir.y * speedPx * 0.5;
    } else {
      m.vx *= 0.8; m.vy *= 0.8;
    }
  }
}
