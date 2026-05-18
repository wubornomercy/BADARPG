import type { SkillProjectileConfig } from '../types/SkillProjectileConfig.js';
import { TILE_PX, PROJECTILE_DEFAULTS } from '../types/SkillProjectileConfig.js';
import type { DamageType } from '../../combat/types/DamageType.js';

let projectileSeq = 0;

/**
 * ProjectileEntity — pure-logic moving hitbox. Holds NO references to
 * PixiJS. Rendering is wired separately by main.ts via lifecycle
 * callbacks on ProjectileManager.
 *
 * Ownership / source-of-damage metadata is preserved across the entire
 * lifetime so chain / fork inheritance, trigger attribution, and
 * combat-event payloads can recover provenance from a single field.
 *
 * Units: positions / radius / maxDistance / speed are stored in PIXELS
 * (converted at construction from the SkillProjectileConfig's world-unit
 * spec values).
 */
export class ProjectileEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly sourceSkillId: string;
  readonly tags: readonly string[];
  readonly creationTime: number;
  readonly damageType: DamageType;
  readonly baseDamage: number;
  readonly canCrit: boolean;

  x: number;
  y: number;
  vx: number;
  vy: number;
  dirX: number;
  dirY: number;

  /** Pixel radius. */
  radius: number;
  /** Pixel travel limit. */
  maxDistance: number;
  traveledDistance: number = 0;

  pierceLeft: number;
  chainLeft: number;
  forkLeft: number;

  /** Per-target re-hit lockout (ms). */
  hitCooldownMs: number;
  /** Map<targetId, lastHitMs>. */
  private readonly hitLog: Map<string, number> = new Map();

  alive: boolean = true;

  /** Free-form rendering attachment slot for main.ts (not touched by logic). */
  renderHandle: unknown = null;

  constructor(args: {
    ownerId:       string;
    sourceSkillId: string;
    tags:          readonly string[];
    x: number; y: number;
    dirX: number; dirY: number;
    cfg:           SkillProjectileConfig;
    damageType:    DamageType;
    baseDamage:    number;
    canCrit:       boolean;
    now:           number;
  }) {
    this.id            = `proj_${++projectileSeq}`;
    this.ownerId       = args.ownerId;
    this.sourceSkillId = args.sourceSkillId;
    this.tags          = args.tags;
    this.creationTime  = args.now;
    this.damageType    = args.damageType;
    this.baseDamage    = args.baseDamage;
    this.canCrit       = args.canCrit;

    const speedPx = args.cfg.speed * TILE_PX;
    this.x  = args.x;
    this.y  = args.y;
    this.dirX = args.dirX;
    this.dirY = args.dirY;
    this.vx = args.dirX * speedPx;
    this.vy = args.dirY * speedPx;

    this.radius      = args.cfg.radius * TILE_PX;
    this.maxDistance = args.cfg.maxDistance * TILE_PX;
    this.pierceLeft  = args.cfg.pierceCount;
    this.chainLeft   = args.cfg.chainCount;
    this.forkLeft    = args.cfg.forkCount;
    this.hitCooldownMs = (args.cfg.hitCooldown ?? PROJECTILE_DEFAULTS.hitCooldown) * 1000;
  }

  /** Advance by dt seconds. */
  step(dtSec: number): void {
    const dxStep = this.vx * dtSec;
    const dyStep = this.vy * dtSec;
    this.x += dxStep;
    this.y += dyStep;
    this.traveledDistance += Math.hypot(dxStep, dyStep);
    if (this.traveledDistance >= this.maxDistance) this.alive = false;
  }

  /** True when this projectile is allowed to deal a fresh hit to `targetId`. */
  canHit(targetId: string, now: number): boolean {
    const last = this.hitLog.get(targetId);
    if (last === undefined) return true;
    return now - last >= this.hitCooldownMs;
  }

  /** Record a hit. Returns true if the projectile should expire afterwards. */
  recordHit(targetId: string, now: number): boolean {
    this.hitLog.set(targetId, now);
    if (this.pierceLeft > 0) { this.pierceLeft--; return false; }
    // No pierce → projectile dies on this hit (chain/fork future work).
    return true;
  }
}
