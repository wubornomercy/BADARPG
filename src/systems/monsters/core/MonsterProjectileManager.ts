import type { CombatEntity } from '../../combat/types/CombatEntity.js';
import type { DamagePipeline } from '../../combat/core/DamagePipeline.js';
import type { DamageType } from '../../combat/types/DamageType.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';

/**
 * MonsterProjectileEntity — slim monster→player projectile.
 *
 * Kept separate from the player skill-projectile system because the
 * targeting flips: monster projectiles ONLY hit the player. Reusing
 * SkillManager's ProjectileManager would require dual-direction
 * targeting filters — over-engineered for V1. Promoted to a shared
 * system later if needed.
 */
export interface MonsterProjectileEntity {
  ownerId: string;
  ownerEntity: CombatEntity;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
  damageType: DamageType;
  tags: readonly string[];
  spawnAt: number;
  maxDistance: number;
  traveled: number;
  alive: boolean;
  /** Free render slot for Pixi Graphics — host populates / cleans up. */
  renderHandle: unknown;
}

const TILE_PX = 32;

export type MonsterProjectileSpawn = ((p: MonsterProjectileEntity) => void) | null;
export type MonsterProjectileDeath = ((p: MonsterProjectileEntity) => void) | null;

let projSeq = 0;

export class MonsterProjectileManager {
  private readonly list: MonsterProjectileEntity[] = [];
  private onSpawn: MonsterProjectileSpawn = null;
  private onDeath: MonsterProjectileDeath = null;

  setOnSpawn(fn: MonsterProjectileSpawn): void { this.onSpawn = fn; }
  setOnDeath(fn: MonsterProjectileDeath): void { this.onDeath = fn; }
  all(): readonly MonsterProjectileEntity[] { return this.list; }
  count(): number { return this.list.length; }

  spawn(args: {
    owner: CombatEntity;
    origin: { x: number; y: number };
    dir: { x: number; y: number };
    speed: number; // world units / sec
    damage: number;
    damageType: DamageType;
    tags: string[];
    radius?: number; // world units
    maxDistance?: number; // world units
    now: number;
  }): void {
    const mag = Math.hypot(args.dir.x, args.dir.y) || 1;
    const nx = args.dir.x / mag, ny = args.dir.y / mag;
    const speedPx = args.speed * TILE_PX;
    const entity: MonsterProjectileEntity = {
      ownerId: args.owner.id,
      ownerEntity: args.owner,
      x: args.origin.x, y: args.origin.y,
      vx: nx * speedPx, vy: ny * speedPx,
      radius: (args.radius ?? 0.25) * TILE_PX,
      damage: args.damage,
      damageType: args.damageType,
      tags: [...args.tags],
      spawnAt: args.now,
      maxDistance: (args.maxDistance ?? 16) * TILE_PX,
      traveled: 0,
      alive: true,
      renderHandle: null,
    };
    this.list.push(entity);
    if (this.onSpawn) this.onSpawn(entity);
    projSeq++;
  }

  /**
   * Tick projectiles + check collision against the player.
   * `player` is the only valid target for monster projectiles in V1.
   */
  update(args: {
    dtSec: number;
    now: number;
    pipeline: DamagePipeline;
    player: CombatEntity;
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
    isPlayerInvulnerable: (now: number) => boolean;
  }): void {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      if (!p.alive) continue;

      const dx = p.vx * args.dtSec;
      const dy = p.vy * args.dtSec;
      p.x += dx; p.y += dy;
      p.traveled += Math.hypot(dx, dy);
      if (p.traveled >= p.maxDistance) { p.alive = false; continue; }

      if (p.x < args.worldBounds.minX || p.x > args.worldBounds.maxX ||
          p.y < args.worldBounds.minY || p.y > args.worldBounds.maxY) {
        p.alive = false; continue;
      }

      // Collision vs player.
      if (!args.player.alive) continue;
      const pdx = args.player.x - p.x;
      const pdy = args.player.y - p.y;
      const minDist = p.radius + 16; // player half-extent
      if (pdx * pdx + pdy * pdy <= minDist * minDist) {
        if (!args.isPlayerInvulnerable(args.now)) {
          const ctx: DamageContext = {
            sourceEntityId: p.ownerId,
            targetEntityId: args.player.id,
            sourceTags:     [...p.tags],
            baseDamage:     p.damage,
            damageType:     p.damageType,
            canCrit:        false,
            canBeBlocked:   true,
            canBeDodged:    true,
            metadata: { sourceMonsterId: p.ownerId, hitX: p.x, hitY: p.y, dirX: p.vx, dirY: p.vy },
          };
          args.pipeline.resolve(p.ownerEntity, args.player, ctx);
        }
        p.alive = false;
      }
    }

    // Sweep dead.
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!this.list[i].alive) {
        if (this.onDeath) this.onDeath(this.list[i]);
        this.list.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.list) { p.alive = false; if (this.onDeath) this.onDeath(p); }
    this.list.length = 0;
  }
}
