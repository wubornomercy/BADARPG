import { MonsterAI, type MonsterRuntime, type AIContext } from './AIBase.js';
import { StatType } from '../../stats/types/StatType.js';
import { DamageType } from '../../combat/types/DamageType.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';

/**
 * SuicideAI — SUICIDE behavior.
 *
 * Rush directly at the player. Once inside `explosionRadius * 0.8`, start
 * a short telegraph (`explosionDelay`), then detonate: the explosion
 * goes through the DamagePipeline (spec rule #2 + test 10).
 *
 * Explosion is poison-typed by default (per Festerling's spec); the
 * `explosionType` config knob picks any DamageType.
 *
 * On detonation, the monster is marked dead so the host's cleanup loop
 * can despawn it; the explosion damage is already applied at this point.
 */
type SuicideState = 'rush' | 'fuse' | 'detonated';
const TILE_PX = 32;

const TYPE_MAP: Record<string, DamageType> = {
  physical:  DamageType.PHYSICAL,
  fire:      DamageType.FIRE,
  cold:      DamageType.COLD,
  lightning: DamageType.LIGHTNING,
  poison:    DamageType.POISON,
};

export class SuicideAI extends MonsterAI {
  readonly id = 'suicide';

  protected decide(m: MonsterRuntime, ctx: AIContext): void {
    const cfg = m.definition.behaviorConfig ?? {};
    const dist = this.distToPlayer(m, ctx);
    if (dist <= m.definition.aggroRadius * TILE_PX) {
      m.aggroUntil = Math.max(m.aggroUntil, ctx.now + 6000);
    }
    if (ctx.now >= m.aggroUntil) return;

    const state: SuicideState = (m.aiState as { phase?: SuicideState }).phase ?? 'rush';
    const fuseRadius = (cfg.explosionRadius as number) * 0.8 * TILE_PX;

    if (state === 'rush' && dist <= fuseRadius) {
      m.aiState = {
        phase: 'fuse',
        detonateAt: ctx.now + (cfg.explosionDelay as number) * 1000,
      };
    } else if (state === 'fuse' && ctx.now >= (m.aiState as any).detonateAt) {
      this.detonate(m, ctx);
      m.aiState.phase = 'detonated';
    }
  }

  protected applyMovement(m: MonsterRuntime, ctx: AIContext): void {
    if (ctx.now >= m.aggroUntil) { m.vx = 0; m.vy = 0; return; }
    const moveSpeedFinal = m.statManager?.getFinalStat(StatType.MOVE_SPEED) ?? m.definition.moveSpeed;
    const speedPx = moveSpeedFinal * TILE_PX;
    const state: SuicideState = (m.aiState as { phase?: SuicideState }).phase ?? 'rush';
    if (state !== 'rush') {
      // Frozen mid-fuse — telegraph.
      m.vx = 0; m.vy = 0;
      return;
    }
    const dir = this.toPlayer(m, ctx);
    m.vx = dir.x * speedPx;
    m.vy = dir.y * speedPx;
  }

  private detonate(m: MonsterRuntime, ctx: AIContext): void {
    const cfg = m.definition.behaviorConfig ?? {};
    const radius = (cfg.explosionRadius as number) * TILE_PX;
    const damage = cfg.explosionDamage as number;
    const dmgType = TYPE_MAP[(cfg.explosionType as string) ?? 'poison'] ?? DamageType.POISON;
    const tags    = ['aoe', 'suicide', (cfg.explosionType as string) ?? 'poison'];

    // Damage the player if in range.
    const dx = ctx.player.x - m.x;
    const dy = ctx.player.y - m.y;
    if (dx * dx + dy * dy <= radius * radius && ctx.player.alive && !ctx.player.isInvulnerable(ctx.now)) {
      const dCtx: DamageContext = {
        sourceEntityId: m.id,
        targetEntityId: ctx.player.id,
        sourceTags:     tags,
        baseDamage:     damage,
        damageType:     dmgType,
        canCrit:        false,
        canBeBlocked:   false,
        canBeDodged:    false,
        metadata: { sourceMonsterId: m.definition.id, hitX: ctx.player.x, hitY: ctx.player.y, dirX: dx / (Math.hypot(dx, dy) || 1), dirY: dy / (Math.hypot(dx, dy) || 1) },
      };
      ctx.damage.resolve(m as any, { id: ctx.player.id, hp: 0, hpMax: 0, x: ctx.player.x, y: ctx.player.y, alive: true, statManager: ctx.player.statManager } as any, dCtx);
    }
    // Monster destroys itself.
    m.alive = false;
  }
}
