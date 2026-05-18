import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import type { SkillCastResult } from '../types/SkillCastResult.js';
import { CastFailReason } from '../types/SkillCastResult.js';
import { SkillCooldownManager } from './SkillCooldownManager.js';
import { SkillResourceManager } from './SkillResourceManager.js';
import { SkillEventDispatcher } from './SkillEventDispatcher.js';
import { SkillExecutor, type SkillCaster, type SkillBehavior } from './SkillExecutor.js';
import { ProjectileManager } from '../projectiles/ProjectileManager.js';
import type { SkillWorld } from './SkillWorld.js';
import type { DamagePipeline } from '../../combat/core/DamagePipeline.js';

/**
 * SkillManager — top-level facade. Wires together the cooldown / resource /
 * event / executor / projectile manager pieces and exposes a small public
 * surface for main.ts to consume:
 *
 *   - register(def)              — populate the skill registry
 *   - get(id) / has(id)          — registry lookup
 *   - cast(caster, id, ctx, now) — direct cast entry
 *   - trigger(caster, id, ...)   — invoked from event listeners
 *   - update(now, dtSec)         — frame tick (pending casts + projectiles)
 *
 * Behaviors are registered via registerBehavior(type, instance) at boot.
 */
export class SkillManager {
  readonly cooldowns:    SkillCooldownManager;
  readonly resources:    SkillResourceManager;
  readonly events:       SkillEventDispatcher;
  readonly projectiles:  ProjectileManager;
  readonly executor:     SkillExecutor;
  private  readonly pipeline: DamagePipeline;
  private  readonly world:    SkillWorld;
  private  readonly registry: Map<string, SkillDefinition> = new Map();
  /** Most recent context per cast — used by ProjectileManager to enrich events. */
  private  readonly lastContext: Map<string, SkillContext> = new Map();
  /** Caster lookup for ProjectileManager — keyed on caster.id. */
  private  readonly casterRegistry: Map<string, SkillCaster> = new Map();

  /** World bounds in pixels — passed to ProjectileManager.update for cull. */
  worldBounds = { minX: -20, minY: -20, maxX: 32_768, maxY: 32_768 };

  constructor(pipeline: DamagePipeline, world: SkillWorld) {
    this.pipeline    = pipeline;
    this.world       = world;
    this.cooldowns   = new SkillCooldownManager();
    this.resources   = new SkillResourceManager();
    this.events      = new SkillEventDispatcher();
    this.projectiles = new ProjectileManager();
    this.executor    = new SkillExecutor(
      this.cooldowns, this.resources, this.events,
      this.pipeline,  this.projectiles, this.world,
    );
  }

  registerBehavior(type: string, beh: SkillBehavior): void {
    this.executor.registerBehavior(type, beh);
  }

  register(def: SkillDefinition): void { this.registry.set(def.id, def); }
  registerAll(defs: SkillDefinition[]): void { for (const d of defs) this.register(d); }
  get(id: string): SkillDefinition | undefined { return this.registry.get(id); }
  has(id: string): boolean { return this.registry.has(id); }
  list(): SkillDefinition[] { return Array.from(this.registry.values()); }

  /** Track a caster so the projectile manager can resolve ownerId → entity. */
  trackCaster(c: SkillCaster): void { this.casterRegistry.set(c.id, c); }

  /** Direct cast — call from input handlers. */
  cast(caster: SkillCaster, skillId: string, ctx: SkillContext, now: number): SkillCastResult {
    const def = this.get(skillId);
    if (!def) return { ok: false, reason: CastFailReason.UNKNOWN_SKILL };
    this.trackCaster(caster);
    this.lastContext.set(skillId, ctx);
    return this.executor.cast(caster, def, ctx, now);
  }

  /** Trigger cast — call from event listeners (cast-on-crit, etc.). */
  trigger(
    caster: SkillCaster,
    skillId: string,
    ctx: Omit<SkillContext, 'triggeredBy' | 'chainDepth'> & {
      triggeredBy: string;
      chainDepth: number;
    },
    now: number,
  ): SkillCastResult {
    const def = this.get(skillId);
    if (!def) return { ok: false, reason: CastFailReason.UNKNOWN_SKILL };
    if (def.canTrigger === false) return { ok: false, reason: CastFailReason.TRIGGER_PROTECTED };
    this.lastContext.set(skillId, ctx);
    return this.executor.cast(caster, def, ctx, now);
  }

  /**
   * Per-frame tick. `dtSec` is the world delta-time in seconds (NOT ms)
   * so projectile movement obeys the spec's "delta-time movement" rule.
   */
  update(now: number, dtSec: number): void {
    this.executor.update(now);
    this.projectiles.update(
      dtSec, now, this.world, this.pipeline,
      (ownerId) => this.casterRegistry.get(ownerId),
      (skillId) => this.registry.get(skillId),
      (skillId) => this.lastContext.get(skillId),
      this.events,
      this.worldBounds,
    );
  }
}
