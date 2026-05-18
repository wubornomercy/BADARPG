import type { MonsterDefinition } from '../types/MonsterDefinition.js';
import type { StatManager } from '../../stats/core/StatManager.js';
import type { CombatEntity } from '../../combat/types/CombatEntity.js';
import type { DamagePipeline } from '../../combat/core/DamagePipeline.js';

/**
 * MonsterRuntime — minimum shape every AI consumes.
 *
 * The Enemy entity in `src/entities/enemy.ts` is the V1 concrete
 * implementation; this interface keeps the AI module decoupled from
 * the Pixi-bound entity class so future monster types (server-
 * authoritative, headless tests) can supply their own runtime.
 */
export interface MonsterRuntime extends CombatEntity {
  vx: number;
  vy: number;
  definition: MonsterDefinition;
  level: number;
  aggroUntil: number;
  nextThinkAt: number;
  aiState: any;
  summonerId: string | null;
  eliteModifierIds: string[];
  separationStrength: number;
  /** Last time this monster fired an offensive action (per-AI attack cooldown). */
  lastAttackAt: number;
}

/**
 * AIContext — services injected per-tick so AIs don't reach into globals.
 *
 * `spawnSummon` returns the new monster (or null if rejected — cap hit,
 * unsafe spawn position). Required for the summoner AI's cap tracking.
 */
export interface AIContext {
  now: number;
  dtSec: number;
  player: {
    id: string;
    x: number;
    y: number;
    statManager?: StatManager;
    alive: boolean;
    isInvulnerable: (now: number) => boolean;
  };
  damage: DamagePipeline;
  /** Spawn an enemy projectile aimed from origin toward dir. */
  spawnProjectile: (
    owner: CombatEntity,
    origin: { x: number; y: number },
    dir: { x: number; y: number },
    cfg: { speed: number; damage: number; damageType: import('../../combat/types/DamageType.js').DamageType; tags: string[]; radius?: number; maxDistance?: number },
  ) => void;
  /** Spawn a summon and return the runtime entity (null if rejected). */
  spawnSummon: (
    definitionId: string,
    position: { x: number; y: number },
    summonerId: string,
  ) => MonsterRuntime | null;
  /** Count of this monster's living summons (used for cap enforcement). */
  livingSummonsOf: (monsterInstanceId: string) => number;
  /** All monsters within radius (used by suicide / nova-style AOE blasts). */
  enemiesInRadius: (cx: number, cy: number, r: number) => CombatEntity[];
}

/** AI think frequency per spec (200 ms). Movement still interpolates every frame. */
export const AI_THINK_INTERVAL_MS = 200;

/**
 * MonsterAI — base class. Subclasses implement decide() (think-rate-
 * gated) and applyMovement() (every-frame interpolation).
 */
export abstract class MonsterAI {
  /** Identifier matching MonsterDefinition.aiType. */
  abstract readonly id: string;

  tick(m: MonsterRuntime, ctx: AIContext): void {
    this.applyMovement(m, ctx);
    if (ctx.now >= m.nextThinkAt) {
      m.nextThinkAt = ctx.now + AI_THINK_INTERVAL_MS;
      this.decide(m, ctx);
    }
  }

  protected abstract decide(m: MonsterRuntime, ctx: AIContext): void;
  protected abstract applyMovement(m: MonsterRuntime, ctx: AIContext): void;

  /** Helper: distance from monster to player. */
  protected distToPlayer(m: MonsterRuntime, ctx: AIContext): number {
    const dx = ctx.player.x - m.x;
    const dy = ctx.player.y - m.y;
    return Math.hypot(dx, dy);
  }

  /** Helper: unit vector from monster toward player. Falls back to (1,0) at zero distance. */
  protected toPlayer(m: MonsterRuntime, ctx: AIContext): { x: number; y: number } {
    const dx = ctx.player.x - m.x;
    const dy = ctx.player.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.0001) return { x: 1, y: 0 };
    return { x: dx / d, y: dy / d };
  }
}
