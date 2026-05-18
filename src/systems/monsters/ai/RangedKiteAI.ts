import { MonsterAI, type MonsterRuntime, type AIContext } from './AIBase.js';
import { StatType } from '../../stats/types/StatType.js';
import { DamageType } from '../../combat/types/DamageType.js';

/**
 * RangedKiteAI — RANGED behavior.
 *
 * Maintains a preferred distance from the player, fires projectiles on
 * a fixed cooldown. Retreats when the player closes in, advances when
 * the player is out of comfortable range.
 *
 * Reads `behaviorConfig`:
 *   - preferredDistance  (world units)
 *   - projectileDamage   (flat physical damage)
 *   - projectileSpeed    (world units / sec)
 *   - attackCooldown     (seconds)
 */
const RETREAT_THRESHOLD = 0.85; // fraction of preferredDistance
const ADVANCE_THRESHOLD = 1.30;
const TILE_PX = 32;

export class RangedKiteAI extends MonsterAI {
  readonly id = 'ranged_kite';

  protected decide(m: MonsterRuntime, ctx: AIContext): void {
    const cfg = m.definition.behaviorConfig ?? {};
    const dist = this.distToPlayer(m, ctx);
    const preferred = (cfg.preferredDistance as number) * TILE_PX;
    if (dist <= m.definition.aggroRadius * TILE_PX) {
      m.aggroUntil = Math.max(m.aggroUntil, ctx.now + 6000);
    }
    if (ctx.now >= m.aggroUntil) return;

    // Fire when roughly inside preferred range (with some flex).
    const cooldownMs = (cfg.attackCooldown as number) * 1000;
    if (ctx.now - m.lastAttackAt >= cooldownMs && dist <= preferred * 1.5) {
      const dir = this.toPlayer(m, ctx);
      ctx.spawnProjectile(m as any, { x: m.x, y: m.y }, dir, {
        speed:       (cfg.projectileSpeed as number),
        damage:      (cfg.projectileDamage as number),
        damageType:  DamageType.PHYSICAL,
        tags:        ['projectile', 'enemy_attack'],
        radius:      0.25,
        maxDistance: 16,
      });
      m.lastAttackAt = ctx.now;
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
      // Too close — retreat directly away.
      m.vx = -dir.x * speedPx;
      m.vy = -dir.y * speedPx;
    } else if (dist > preferred * ADVANCE_THRESHOLD) {
      // Too far — close to firing range at half speed (so the kite reads as cautious).
      m.vx = dir.x * speedPx * 0.5;
      m.vy = dir.y * speedPx * 0.5;
    } else {
      // In the pocket — hold ground, soft strafe.
      m.vx *= 0.85; m.vy *= 0.85;
    }
  }
}
