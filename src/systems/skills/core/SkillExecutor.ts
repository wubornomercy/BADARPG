import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import { CastFailReason, type SkillCastResult } from '../types/SkillCastResult.js';
import type { CombatEntity } from '../../combat/types/CombatEntity.js';
import type { DamagePipeline } from '../../combat/core/DamagePipeline.js';
import type { SkillWorld } from './SkillWorld.js';
import { SkillEventType } from '../events/SkillEventType.js';
import type { SkillEventDispatcher } from './SkillEventDispatcher.js';
import type { ProjectileManager } from '../projectiles/ProjectileManager.js';
import type { SkillCooldownManager } from './SkillCooldownManager.js';
import type { SkillResourceManager, ResourceCaster } from './SkillResourceManager.js';

/** Caster contract for the skill system. Player satisfies it structurally. */
export interface SkillCaster extends CombatEntity, ResourceCaster {
  /** Time (perf-clock ms) until current cast-time window ends. 0 = not casting. */
  castingUntil: number;
  /** Optional ground position — falls back to (x,y) for entities without separate pos. */
  /** Used by SELF_CENTERED / DIRECTIONAL skills as the cast origin. */
}

/** Hard cap on trigger-chain depth — spec mandate. */
export const MAX_TRIGGER_CHAIN_DEPTH = 16;

/**
 * SkillBehavior — runs the actual game effect for a behavior type. Behaviors
 * are pure logic: they call the pipeline, spawn projectiles, schedule ground
 * patches, etc. They MUST NOT render, play sound, or apply VFX directly.
 */
export interface SkillBehavior {
  execute(
    caster:  SkillCaster,
    skill:   SkillDefinition,
    ctx:     SkillContext,
    bctx:    BehaviorContext,
  ): void;
}

/** Shared services every behavior needs. */
export interface BehaviorContext {
  now:         number;
  pipeline:    DamagePipeline;
  projectiles: ProjectileManager;
  world:       SkillWorld;
  events:      SkillEventDispatcher;
  /** Scheduling hook — behaviors register ground-AOE ticks via this. */
  schedule:    (effect: ScheduledEffect) => void;
  /** Re-entrant cast (used by triggered effects). */
  executor:    SkillExecutor;
}

/** Used by GROUND_AOE / BEAM to keep ticking after the initial cast. */
export interface ScheduledEffect {
  alive: boolean;
  nextTickAt: number;
  endAt: number;
  tickIntervalMs: number;
  onTick: (now: number) => void;
  onEnd?: () => void;
}

/**
 * Active cast in the cast-time queue. The executor fires them once
 * their `fireAt` elapses (via the host's frame-by-frame `update()` call).
 */
interface ActiveCast {
  caster:  SkillCaster;
  skill:   SkillDefinition;
  ctx:     SkillContext;
  fireAt:  number;
  fired:   boolean;
}

/**
 * SkillExecutor — single chokepoint for skill execution.
 *
 * Cast flow (locked by spec, do NOT reorder):
 *
 *   Input → Validation → Cooldown Check → Resource Check → Cast Start
 *     → Cast Time → Skill Execute → Damage Pipeline → Event Dispatch
 *     → Cooldown Apply
 *
 * Triggered casts (ctx.triggeredBy / chainDepth > 0):
 *   - skip cast time         (fire immediately)
 *   - skip resource cost     (no mana / hp drain)
 *   - still respect cooldown
 *   - still respect trigger protection
 *   - still respect chain-depth cap (16)
 */
export class SkillExecutor {
  private readonly behaviors: Map<string, SkillBehavior> = new Map();
  private readonly active: ActiveCast[] = [];
  private readonly scheduled: ScheduledEffect[] = [];
  private fireCounter = 0;

  constructor(
    private readonly cooldowns:   SkillCooldownManager,
    private readonly resources:   SkillResourceManager,
    private readonly events:      SkillEventDispatcher,
    private readonly pipeline:    DamagePipeline,
    private readonly projectiles: ProjectileManager,
    private readonly world:       SkillWorld,
  ) {}

  registerBehavior(type: string, behavior: SkillBehavior): void {
    this.behaviors.set(type, behavior);
  }

  cast(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, now: number): SkillCastResult {
    // -- 1. Validation -----------------------------------------------------
    if (!caster.alive) return fail(CastFailReason.CASTER_DEAD);

    const triggered = !!ctx.triggeredBy;
    const chainDepth = ctx.chainDepth ?? 0;

    if (chainDepth > MAX_TRIGGER_CHAIN_DEPTH) {
      return fail(CastFailReason.CHAIN_DEPTH_EXCEEDED);
    }
    if (skill.triggerProtection && ctx.chainHistory?.has(skill.id)) {
      return fail(CastFailReason.TRIGGER_PROTECTED);
    }

    // Direct casts wait for any in-progress cast to finish; triggered casts
    // bypass the wait (the trigger source may itself still be casting).
    if (!triggered && caster.castingUntil > now) {
      return fail(CastFailReason.STILL_CASTING);
    }

    // -- 2. Cooldown -------------------------------------------------------
    if (this.cooldowns.isOnCooldown(skill.id, now)) {
      return fail(CastFailReason.COOLDOWN);
    }

    // -- 3. Resource (skipped for triggered) -------------------------------
    if (!triggered) {
      if (!this.resources.canPay(caster, skill)) {
        return fail(
          caster.mana < skill.manaCost
            ? CastFailReason.INSUFFICIENT_MANA
            : CastFailReason.INSUFFICIENT_HP,
        );
      }
      this.resources.pay(caster, skill);
    }

    // -- 4. Cast Start / Cast Time -----------------------------------------
    if (!this.behaviors.has(skill.behaviorType)) {
      return fail(CastFailReason.UNKNOWN_BEHAVIOR);
    }

    // Cooldown is started UP FRONT for direct casts (spec implies it applies
    // alongside resource debit on cast start; this also prevents spamming
    // a skill during its own cast-time window).
    this.cooldowns.start(skill, caster.statManager, now);

    if (!triggered && skill.castTime > 0) {
      const fireAt = now + skill.castTime * 1000;
      caster.castingUntil = fireAt;
      this.active.push({ caster, skill, ctx, fireAt, fired: false });
      return { ok: true, pending: true };
    }

    // Instant cast / triggered: fire now.
    this.fire(caster, skill, ctx, now);
    return { ok: true, firedAt: now };
  }

  /**
   * Per-frame tick — fires pending casts whose cast-time window has
   * elapsed, runs scheduled effects (ground AOE, beam ticks), and
   * sweeps dead entries.
   */
  update(now: number): void {
    // Pending casts.
    for (let i = 0; i < this.active.length; i++) {
      const a = this.active[i];
      if (a.fired) continue;
      if (now >= a.fireAt) {
        a.fired = true;
        this.fire(a.caster, a.skill, a.ctx, now);
      }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].fired) this.active.splice(i, 1);
    }

    // Scheduled tick effects.
    for (const eff of this.scheduled) {
      if (!eff.alive) continue;
      while (eff.alive && eff.nextTickAt <= now) {
        eff.onTick(now);
        eff.nextTickAt += eff.tickIntervalMs;
      }
      if (now >= eff.endAt) {
        eff.alive = false;
        if (eff.onEnd) eff.onEnd();
      }
    }
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      if (!this.scheduled[i].alive) this.scheduled.splice(i, 1);
    }
  }

  /** Active cast count — debug overlay reads this. */
  activeCastCount(): number {
    let n = 0;
    for (const a of this.active) if (!a.fired) n++;
    return n;
  }
  /** Currently-ticking effect count. */
  scheduledCount(): number { return this.scheduled.length; }

  // ----- Internals ---------------------------------------------------------

  private fire(caster: SkillCaster, skill: SkillDefinition, ctx: SkillContext, now: number): void {
    const beh = this.behaviors.get(skill.behaviorType);
    if (!beh) return;

    // Build chain history snapshot for any nested triggers.
    const history = new Set<string>(ctx.chainHistory ?? []);
    history.add(skill.id);
    const enriched: SkillContext = { ...ctx, chainHistory: history };

    const bctx: BehaviorContext = {
      now,
      pipeline:    this.pipeline,
      projectiles: this.projectiles,
      world:       this.world,
      events:      this.events,
      schedule:    (e) => this.scheduled.push(e),
      executor:    this,
    };

    // ON_SKILL_CAST emitted BEFORE behavior runs so listeners can read the
    // cast intent (target lock, position) even if the behavior bails.
    this.fireCounter++;
    this.events.emit({
      type: SkillEventType.ON_SKILL_CAST,
      caster, skill, context: enriched,
      tags: skill.tags,
      chainDepth: enriched.chainDepth ?? 0,
    });
    if (enriched.triggeredBy) {
      this.events.emit({
        type: SkillEventType.ON_SKILL_TRIGGER,
        caster, skill, context: enriched,
        tags: skill.tags,
        triggerSource: enriched.triggeredBy,
        chainDepth: enriched.chainDepth ?? 0,
      });
    }

    beh.execute(caster, skill, enriched, bctx);

    // Cast-time lock clears here too (host code can still respect
    // castingUntil but the executor doesn't enforce afterwards).
    if (caster.castingUntil <= now) caster.castingUntil = 0;
  }
}

function fail(reason: CastFailReason): SkillCastResult {
  return { ok: false, reason };
}
