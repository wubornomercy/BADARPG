import { DamageType, DAMAGE_TYPES, RESISTED_TYPES, DamageBundle } from '../types/DamageType.js';
import { HitType } from '../types/HitType.js';
import type { AilmentType } from '../types/AilmentType.js';
import type { DamageContext } from '../types/DamageContext.js';
import type { DamageResult } from '../types/DamageResult.js';
import type { CombatEntity } from '../types/CombatEntity.js';
import { CombatEventType } from '../events/CombatEventType.js';
import type { CombatEvent } from '../events/CombatEvent.js';
import { DamageEventDispatcher } from './DamageEventDispatcher.js';
import { HitResolver, BLOCK_DAMAGE_RETAINED } from './HitResolver.js';
import { CritResolver } from './CritResolver.js';
import { DefenseResolver } from './DefenseResolver.js';
import { ResistanceResolver } from './ResistanceResolver.js';
import { DamageConversionCalculator } from '../calculators/DamageConversionCalculator.js';
import { IncreasedDamageCalculator } from '../calculators/IncreasedDamageCalculator.js';
import { MoreDamageCalculator } from '../calculators/MoreDamageCalculator.js';
import { DamageTakenCalculator } from '../calculators/DamageTakenCalculator.js';

/**
 * RNG hook for hit / crit rolls. Injectable so tests can use a
 * deterministic stream. Default is Math.random.
 */
export type Rng = () => number;

/**
 * DamagePipeline — single entry point for every damage instance in the
 * game. Owns the event dispatcher and the pure flow logic.
 *
 * Flow (locked by spec, do NOT reorder):
 *   Attack Source → Hit Check → Base → Added → Conversion → Increased
 *     → More → Crit → Defense → Resistance → Damage Taken → Shield
 *     → HP → OnHit / OnDamageTaken → OnKill
 *
 * Block detection happens in the hit-check phase; its *0.35 reduction
 * is applied at the end (before Shield) so it scales the final mitigated
 * damage rather than the pre-mitigation base — matches the spec's
 * "final damage *= 0.35" wording.
 *
 * The pipeline NEVER touches rendering, VFX, sound, or animation. All
 * side-effects external to `target.hp` / `target.shield` / `target.alive`
 * happen via CombatEvent listeners.
 */
export class DamagePipeline {
  readonly events: DamageEventDispatcher = new DamageEventDispatcher();
  private rng: Rng;
  /** Last 64 results — fed to CombatDebugPanel and useful for analytics. */
  private readonly history: DamageResult[] = [];
  private static readonly HISTORY_CAP = 64;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
  }

  /** Swap the RNG at runtime (used by tests). */
  setRng(rng: Rng): void { this.rng = rng; }

  /** Snapshot of the most recent N results (oldest first). */
  recent(): readonly DamageResult[] { return this.history; }

  // =======================================================================
  // resolve — the entire pipeline
  // =======================================================================

  resolve(source: CombatEntity, target: CombatEntity, ctx: DamageContext): DamageResult {
    const sourceSM = source.statManager;
    const targetSM = target.statManager;
    const isDOT = ctx.isDOT === true;
    const allowDOTCrit = ctx.metadata?.allowDOTCrit === true;
    const sourceTags = ctx.sourceTags ?? [];

    // ---- 1. Hit Check (skipped entirely for DOT) ----
    let hitType: HitType   = HitType.NORMAL;
    let wasDodged: boolean = false;
    let wasBlocked: boolean = false;

    if (!isDOT) {
      if (ctx.canBeDodged) {
        const dodgeChance = HitResolver.dodgeChance(sourceSM, targetSM);
        if (dodgeChance > 0 && this.rng() < dodgeChance) {
          wasDodged = true;
          hitType   = HitType.DODGED;
        }
      }
      if (!wasDodged && ctx.canBeBlocked) {
        const blockChance = HitResolver.blockChance(targetSM);
        if (blockChance > 0 && this.rng() < blockChance) {
          wasBlocked = true;
          hitType    = HitType.BLOCKED;
        }
      }
    }

    // Short-circuit on dodge: zero damage, breakdown all zeros, fire ON_DODGE.
    if (wasDodged) {
      const result: DamageResult = {
        finalDamage: 0,
        hitType,
        damageType: ctx.damageType,
        wasCrit: false,
        wasBlocked: false,
        wasDodged: true,
        appliedAilments: [],
        targetKilled: false,
        pipelineBreakdown: emptyBreakdown(ctx.baseDamage),
      };
      this.recordHistory(result);
      this.emit(CombatEventType.ON_DODGE, source, target, ctx, result);
      return result;
    }

    // ---- 2. Base Damage + 3. Added Damage ----
    // "Added Damage" is the spec hook for future flat-added affixes
    // (e.g. "adds 5-10 fire damage to attacks"). V1 leaves the slot at
    // zero — kept in the breakdown for traceability.
    const baseDamage  = ctx.baseDamage;
    const addedDamage = 0;
    const preConversion = baseDamage + addedDamage;

    // ---- 4. Conversion ----
    const bundle: DamageBundle = DamageConversionCalculator.convert(
      preConversion, ctx.damageType, ctx.conversion,
    );
    const afterConversion = sumBundle(bundle);

    // ---- 5. Increased (per damage type, with [...sourceTags, type] tags) ----
    for (let i = 0; i < DAMAGE_TYPES.length; i++) {
      const t = DAMAGE_TYPES[i];
      const v = bundle[t];
      if (v === undefined || v === 0) continue;
      const tags = [...sourceTags, t];
      const inc = IncreasedDamageCalculator.compute(sourceSM, t, tags);
      bundle[t] = v * (1 + inc);
    }
    const afterIncreased = sumBundle(bundle);

    // ---- 6. More (per damage type, independent multiplicative layers) ----
    for (let i = 0; i < DAMAGE_TYPES.length; i++) {
      const t = DAMAGE_TYPES[i];
      const v = bundle[t];
      if (v === undefined || v === 0) continue;
      const tags  = [...sourceTags, t];
      const list  = MoreDamageCalculator.compute(sourceSM, t, tags);
      let value   = v;
      for (let j = 0; j < list.length; j++) value *= 1 + list[j];
      bundle[t] = value;
    }
    const afterMore = sumBundle(bundle);

    // ---- 7. Crit ----
    let wasCrit = false;
    let critMultiplier = 1.0;
    const critEligible = ctx.canCrit && (!isDOT || allowDOTCrit);
    if (critEligible) {
      const { chance, multiplier } = CritResolver.compute(sourceSM, ctx);
      if (chance > 0 && this.rng() < chance) {
        wasCrit = true;
        critMultiplier = multiplier;
      }
    }
    if (wasCrit) {
      for (let i = 0; i < DAMAGE_TYPES.length; i++) {
        const t = DAMAGE_TYPES[i];
        const v = bundle[t];
        if (v !== undefined && v !== 0) bundle[t] = v * critMultiplier;
      }
      // Crit visually wins unless the same hit was also blocked (rare, but
      // possible). Spec says hit types are the resolved final classification.
      if (!wasBlocked) hitType = HitType.CRIT;
    }
    const afterCrit = sumBundle(bundle);

    // ---- 8. Defense (armor: physical only) ----
    if (bundle[DamageType.PHYSICAL] && bundle[DamageType.PHYSICAL]! > 0) {
      const phys = bundle[DamageType.PHYSICAL]!;
      const reduction = DefenseResolver.physicalReduction(targetSM, phys);
      bundle[DamageType.PHYSICAL] = phys * (1 - reduction);
    }
    const afterDefense = sumBundle(bundle);

    // ---- 9. Resistance + Penetration (elemental + poison) ----
    const penetration = ctx.penetration ?? 0;
    for (let i = 0; i < RESISTED_TYPES.length; i++) {
      const t = RESISTED_TYPES[i];
      const v = bundle[t];
      if (v === undefined || v === 0) continue;
      const mult = ResistanceResolver.compute(targetSM, t, penetration);
      bundle[t] = v * mult;
    }
    const afterResistance = sumBundle(bundle);

    // ---- 10. Damage Taken Modifiers ----
    for (let i = 0; i < DAMAGE_TYPES.length; i++) {
      const t = DAMAGE_TYPES[i];
      const v = bundle[t];
      if (v === undefined || v === 0) continue;
      const dt = DamageTakenCalculator.compute(targetSM, t, sourceTags);
      if (dt !== 1.0) bundle[t] = v * dt;
    }

    // ---- Block reduction (applied at the end so it scales final damage) ----
    let finalDamageRaw = sumBundle(bundle);
    if (wasBlocked) finalDamageRaw *= BLOCK_DAMAGE_RETAINED;

    // ---- 11. Shield absorption ----
    let finalDamage = finalDamageRaw;
    if (target.shield !== undefined && target.shield > 0 && finalDamage > 0) {
      const absorbed = Math.min(target.shield, finalDamage);
      target.shield -= absorbed;
      finalDamage   -= absorbed;
    }

    // ---- 12. HP application + death check ----
    let targetKilled = false;
    if (finalDamage > 0 && target.alive) {
      target.hp = Math.max(0, target.hp - finalDamage);
      if (target.hp <= 0) {
        target.alive = false;
        targetKilled = true;
      }
    }

    const appliedAilments: AilmentType[] = []; // architecture only; populated later

    const result: DamageResult = {
      finalDamage,
      hitType,
      damageType: ctx.damageType,
      wasCrit,
      wasBlocked,
      wasDodged: false,
      appliedAilments,
      targetKilled,
      pipelineBreakdown: {
        baseDamage,
        addedDamage,
        afterConversion,
        afterIncreased,
        afterMore,
        afterCrit,
        afterDefense,
        afterResistance,
        finalDamage,
      },
    };
    this.recordHistory(result);

    // ---- 13/14. Events ----
    if (wasBlocked) this.emit(CombatEventType.ON_BLOCK,        source, target, ctx, result);
    if (wasCrit)    this.emit(CombatEventType.ON_CRIT,         source, target, ctx, result);
    this.emit(CombatEventType.ON_HIT,                          source, target, ctx, result);
    this.emit(CombatEventType.ON_DAMAGE_TAKEN,                 source, target, ctx, result);
    if (targetKilled) this.emit(CombatEventType.ON_KILL,       source, target, ctx, result);

    return result;
  }

  // =======================================================================
  // Internals
  // =======================================================================

  private emit(
    type: CombatEventType,
    source: CombatEntity,
    target: CombatEntity,
    ctx: DamageContext,
    result: DamageResult,
  ): void {
    if (this.events.countFor(type) === 0) return;
    const evt: CombatEvent = {
      type,
      source,
      target,
      finalDamage: result.finalDamage,
      damageType:  result.damageType,
      hitType:     result.hitType,
      sourceTags:  ctx.sourceTags,
      wasCrit:     result.wasCrit,
      wasBlocked:  result.wasBlocked,
      wasDodged:   result.wasDodged,
      targetKilled: result.targetKilled,
      isDOT:       ctx.isDOT === true,
      result,
    };
    this.events.emit(evt);
  }

  private recordHistory(r: DamageResult): void {
    this.history.push(r);
    if (this.history.length > DamagePipeline.HISTORY_CAP) this.history.shift();
  }
}

// =========================================================================
// helpers
// =========================================================================

function sumBundle(b: DamageBundle): number {
  let s = 0;
  for (let i = 0; i < DAMAGE_TYPES.length; i++) s += b[DAMAGE_TYPES[i]] ?? 0;
  return s;
}

function emptyBreakdown(baseDamage: number): DamageResult['pipelineBreakdown'] {
  return {
    baseDamage,
    addedDamage:     0,
    afterConversion: 0,
    afterIncreased:  0,
    afterMore:       0,
    afterCrit:       0,
    afterDefense:    0,
    afterResistance: 0,
    finalDamage:     0,
  };
}
