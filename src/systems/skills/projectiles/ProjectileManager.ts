import { ProjectileEntity } from './ProjectileEntity.js';
import type { CombatEntity } from '../../combat/types/CombatEntity.js';
import type { DamagePipeline } from '../../combat/core/DamagePipeline.js';
import type { DamageContext } from '../../combat/types/DamageContext.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import type { SkillWorld } from '../core/SkillWorld.js';
import { SkillEventType } from '../events/SkillEventType.js';
import type { SkillEventDispatcher } from '../core/SkillEventDispatcher.js';

/**
 * ProjectileManager — owns the active projectile list, ticks them each
 * frame, runs collision against the world's enemies via SkillWorld, and
 * routes every confirmed hit into the DamagePipeline.
 *
 * Visual rendering is OUT of scope — main.ts subscribes to the spawn /
 * die callbacks and attaches its own Graphics. The manager keeps a
 * stable list + ProjectileEntity.renderHandle slot for that to hang off.
 */
export type ProjectileSpawnListener = (entity: ProjectileEntity) => void;
export type ProjectileDeathListener = (entity: ProjectileEntity) => void;

export class ProjectileManager {
  private readonly list: ProjectileEntity[] = [];
  private onSpawn: ProjectileSpawnListener | null = null;
  private onDeath: ProjectileDeathListener | null = null;

  setOnSpawn(fn: ProjectileSpawnListener | null): void { this.onSpawn = fn; }
  setOnDeath(fn: ProjectileDeathListener | null): void { this.onDeath = fn; }

  /** Currently-alive projectiles. */
  all(): readonly ProjectileEntity[] { return this.list; }

  /** Count alive — cheap for the debug overlay. */
  count(): number { return this.list.length; }

  /** Register a new projectile. */
  spawn(entity: ProjectileEntity): void {
    this.list.push(entity);
    if (this.onSpawn) this.onSpawn(entity);
  }

  /**
   * Tick every projectile by `dtSec` seconds, resolve collisions against
   * enemies provided by `world`, route hits through `pipeline`, and emit
   * ON_SKILL_HIT / ON_SKILL_CRIT / ON_SKILL_KILL events.
   *
   * Required arguments:
   *   - caster      — the projectile's owner (for damage source)
   *   - skillReg    — lookup from sourceSkillId → SkillDefinition (for events)
   *   - skillCtxs   — lookup from sourceSkillId → SkillContext at cast time
   *
   * For V1 each projectile carries enough of its definition (damage,
   * type, tags) inline; the registry / context lookups feed event
   * payloads only.
   */
  update(
    dtSec: number,
    now: number,
    world: SkillWorld,
    pipeline: DamagePipeline,
    casterLookup: (ownerId: string) => CombatEntity | undefined,
    skillLookup:  (skillId: string) => SkillDefinition | undefined,
    contextLookup: (skillId: string) => SkillContext | undefined,
    events: SkillEventDispatcher,
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number },
  ): void {
    for (let pi = 0; pi < this.list.length; pi++) {
      const p = this.list[pi];
      if (!p.alive) continue;

      p.step(dtSec);
      if (!p.alive) continue;

      // Out-of-world kill.
      if (p.x < worldBounds.minX || p.x > worldBounds.maxX ||
          p.y < worldBounds.minY || p.y > worldBounds.maxY) {
        p.alive = false;
        continue;
      }

      const targets = world.enemiesInRadius(p.x, p.y, p.radius + 16); // 16 = enemy body half-extent
      if (targets.length === 0) continue;

      const caster = casterLookup(p.ownerId);
      if (!caster) continue;

      for (let ti = 0; ti < targets.length; ti++) {
        const t = targets[ti];
        if (!t.alive) continue;
        if (!p.canHit(t.id, now)) continue;

        const ctx: DamageContext = {
          sourceEntityId: caster.id,
          targetEntityId: t.id,
          sourceTags:     [...p.tags],
          baseDamage:     p.baseDamage,
          damageType:     p.damageType,
          canCrit:        p.canCrit,
          canBeBlocked:   true,
          canBeDodged:    true,
          metadata: {
            sourceSkillId: p.sourceSkillId,
            projectileId:  p.id,
            dirX: p.dirX,
            dirY: p.dirY,
            hitX: p.x,
            hitY: p.y,
          },
        };
        const result = pipeline.resolve(caster, t, ctx);

        // Emit skill events. Tied to the original SkillDefinition + context
        // so listeners (cast-on-crit, cast-on-kill) can re-cast.
        const def = skillLookup(p.sourceSkillId);
        const skillCtx = contextLookup(p.sourceSkillId);
        if (def && skillCtx) {
          if (result.wasCrit && !result.wasDodged) {
            events.emit({
              type:    SkillEventType.ON_SKILL_CRIT,
              caster, skill: def, context: skillCtx,
              tags:    p.tags,
              target:  t, result,
              chainDepth: skillCtx.chainDepth ?? 0,
              projectileSource: p.id,
            });
          }
          if (!result.wasDodged) {
            events.emit({
              type:    SkillEventType.ON_SKILL_HIT,
              caster, skill: def, context: skillCtx,
              tags:    p.tags,
              target:  t, result,
              chainDepth: skillCtx.chainDepth ?? 0,
              projectileSource: p.id,
            });
          }
          if (result.targetKilled) {
            events.emit({
              type:    SkillEventType.ON_SKILL_KILL,
              caster, skill: def, context: skillCtx,
              tags:    p.tags,
              target:  t, result,
              chainDepth: skillCtx.chainDepth ?? 0,
              projectileSource: p.id,
            });
          }
        }

        const expired = p.recordHit(t.id, now);
        if (expired) { p.alive = false; break; }
      }
    }

    // Sweep dead. Emit onDeath callbacks; main.ts uses them to drop
    // the corresponding Graphics from the scene.
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!this.list[i].alive) {
        if (this.onDeath) this.onDeath(this.list[i]);
        this.list.splice(i, 1);
      }
    }
  }

  /** Drop everything — scene-reset hook. */
  clear(): void {
    for (const p of this.list) {
      p.alive = false;
      if (this.onDeath) this.onDeath(p);
    }
    this.list.length = 0;
  }
}
