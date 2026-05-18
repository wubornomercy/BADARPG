import { StatType, PRIMARY_STATS } from '../types/StatType.js';
import { ModifierType } from '../types/ModifierType.js';
import type { StatModifier } from '../types/StatModifier.js';
import type { ModifierCondition } from '../types/ModifierCondition.js';
import { ModifierManager } from './ModifierManager.js';
import { DerivedStatCalculator } from './DerivedStatCalculator.js';
import { StatCache } from '../cache/StatCache.js';
import { clampStat } from '../caps.js';

/**
 * StatBreakdown — full audit trail of a single getFinalStat() evaluation.
 * Produced by recompute(); consumed by tests and StatDebugPanel.
 */
export interface StatBreakdown {
  stat: StatType;
  base: number;
  flatMods: StatModifier[];
  flatDerived: number;
  totalFlat: number;
  increasedMods: StatModifier[];
  /** Derived INCREASED contribution as a fraction (0.15 = +15%). */
  increasedDerived: number;
  /** Sum of all INCREASED contributions as a fraction. */
  totalIncreased: number;
  moreMods: StatModifier[];
  overrideMods: StatModifier[];
  beforeClamp: number;
  final: number;
}

/**
 * StatManager — single source of truth for a single entity's final stat
 * values. Holds:
 *   - base values (per stat)
 *   - the ModifierManager (active StatModifiers)
 *   - the condition state map (drives ModifierCondition.type)
 *   - the final-value cache (Map<StatType, number>)
 *
 * Pipeline (executed by recompute() on cache miss):
 *   Base → FLAT (mods + derived) → INCREASED (mods + derived) → MORE
 *        → OVERRIDE (last wins) → clamp → final
 *
 * The cache is invalidated automatically on:
 *   - modifier add / remove / bulk-remove
 *   - modifier duration expiry
 *   - condition state change (for stats with conditional mods)
 *   - primary attribute change (propagates to derived targets)
 *   - explicit setBase()
 *
 * Tag-filtered queries (`getFinalStat(stat, ['projectile'])`) bypass the
 * cache because the result depends on caller-provided context.
 */
export class StatManager {
  private readonly base: Map<StatType, number> = new Map();
  private readonly cache: StatCache = new StatCache();
  readonly modifiers: ModifierManager;

  private readonly conditionState: Map<string, unknown> = new Map();
  private readonly conditionEvaluator: (cond: ModifierCondition) => boolean;

  /**
   * @param customConditionEvaluator override the default evaluator (which
   *   handles the spec's standard condition types). Custom evaluators can
   *   layer on top via fallthrough to the default.
   */
  constructor(customConditionEvaluator?: (
    cond: ModifierCondition,
    getState: (k: string) => unknown,
  ) => boolean) {
    const getState = (k: string) => this.conditionState.get(k);
    this.conditionEvaluator = customConditionEvaluator
      ? (cond) => customConditionEvaluator(cond, getState)
      : (cond) => defaultConditionEvaluator(cond, getState);

    this.modifiers = new ModifierManager(
      (affected) => this.onModifiersChanged(affected),
      (cond) => this.conditionEvaluator(cond),
    );
  }

  // -----------------------------------------------------------------------
  // Base values
  // -----------------------------------------------------------------------

  setBase(stat: StatType, value: number): void {
    const prev = this.base.get(stat);
    if (prev === value) return;
    this.base.set(stat, value);
    this.invalidateStatAndDependents(stat);
  }

  /** Bulk seed — used by Player.constructor() to load the level-1 baseline. */
  setBases(entries: Iterable<[StatType, number]>): void {
    for (const [s, v] of entries) this.base.set(s, v);
    this.cache.invalidateAll();
  }

  getBase(stat: StatType): number { return this.base.get(stat) ?? 0; }

  // -----------------------------------------------------------------------
  // Condition state
  // -----------------------------------------------------------------------

  /**
   * Update a condition key. Triggers cache invalidation for every stat
   * that has at least one conditional modifier — the cheapest correct
   * behavior; finer-grained tracking can be added later if it proves
   * necessary.
   */
  setCondition(key: string, value: unknown): void {
    const prev = this.conditionState.get(key);
    if (prev === value) return;
    this.conditionState.set(key, value);
    this.modifiers.notifyConditionChange();
  }

  getCondition(key: string): unknown { return this.conditionState.get(key); }

  getConditionStateSnapshot(): Record<string, unknown> {
    return Object.fromEntries(this.conditionState);
  }

  // -----------------------------------------------------------------------
  // Public stat queries
  // -----------------------------------------------------------------------

  /**
   * Returns the final value of `stat` after running the full pipeline.
   * If `contextTags` is supplied, tag-gated modifiers participate. The
   * cache is bypassed for tag-filtered queries.
   */
  getFinalStat(stat: StatType, contextTags?: readonly string[]): number {
    if (contextTags && contextTags.length > 0) {
      return this.recompute(stat, contextTags).final;
    }
    const cached = this.cache.get(stat);
    if (cached !== undefined) return cached;
    const result = this.recompute(stat);
    this.cache.set(stat, result.final);
    return result.final;
  }

  /**
   * Run the full pipeline and return every term. Always recomputes (no
   * cache read) — callers use it for tests and debug rendering where the
   * intermediate values matter.
   */
  recompute(stat: StatType, contextTags?: readonly string[]): StatBreakdown {
    const base = this.getBase(stat);
    const activeMods = this.modifiers.activeFor(stat, contextTags);

    const flatMods:      StatModifier[] = [];
    const increasedMods: StatModifier[] = [];
    const moreMods:      StatModifier[] = [];
    const overrideMods:  StatModifier[] = [];
    for (const m of activeMods) {
      switch (m.modifierType) {
        case ModifierType.FLAT:      flatMods.push(m); break;
        case ModifierType.INCREASED: increasedMods.push(m); break;
        case ModifierType.MORE:      moreMods.push(m); break;
        case ModifierType.OVERRIDE:  overrideMods.push(m); break;
      }
    }

    // Derived contributions are NOT applied to primary attributes — those
    // are the inputs, not the outputs, of the derivation table. Skipping
    // them here also guarantees no recursion when getPrimary() reads back
    // through this same StatManager.
    const isPrimary = PRIMARY_STATS.has(stat);
    const derived = isPrimary
      ? { flat: 0, increased: 0 }
      : DerivedStatCalculator.getDerivedContribution(stat, (p) => this.getFinalStat(p));

    const totalFlat = sumMod(flatMods) + derived.flat;
    // INCREASED is stored as percent (35 → +35%) on modifiers; derived is
    // already a fraction. Convert mods to fraction and sum.
    const totalIncreased = sumMod(increasedMods) / 100 + derived.increased;

    let v = (base + totalFlat) * (1 + totalIncreased);
    for (const m of moreMods) v *= 1 + m.value / 100;

    // OVERRIDE: highest priority — last write wins.
    if (overrideMods.length > 0) {
      v = overrideMods[overrideMods.length - 1].value;
    }

    const beforeClamp = v;
    const final = clampStat(stat, v, base);

    return {
      stat, base,
      flatMods, flatDerived: derived.flat, totalFlat,
      increasedMods, increasedDerived: derived.increased, totalIncreased,
      moreMods, overrideMods,
      beforeClamp, final,
    };
  }

  /** Stat is dirty when it's not currently cached. */
  isDirty(stat: StatType): boolean { return this.cache.isDirty(stat); }

  /** All known base-value stats — primarily for debug rendering. */
  knownBaseStats(): StatType[] { return Array.from(this.base.keys()); }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private onModifiersChanged(affected: ReadonlySet<StatType>): void {
    for (const s of affected) this.invalidateStatAndDependents(s);
  }

  private invalidateStatAndDependents(stat: StatType): void {
    this.cache.invalidate(stat);
    if (PRIMARY_STATS.has(stat)) {
      for (const t of DerivedStatCalculator.getTargetsFor(stat)) {
        this.cache.invalidate(t);
      }
    }
  }
}

function sumMod(list: StatModifier[]): number {
  let s = 0;
  for (const m of list) s += m.value;
  return s;
}

/**
 * Default condition evaluator. Handles the standard condition types
 * listed in the spec; unknown types fall back to "conditionState[type]
 * is truthy" (or matches `cond.value` if provided).
 */
export function defaultConditionEvaluator(
  cond: ModifierCondition,
  getState: (key: string) => unknown,
): boolean {
  switch (cond.type) {
    case 'whileMoving':      return getState('isMoving') === true;
    case 'whileStationary':  return getState('isMoving') === false;
    case 'onLowLife':        return getState('onLowLife') === true;
    case 'againstPoisoned':  return getState('targetPoisoned') === true;
    case 'withBowEquipped':  return getState('equippedWeaponType') === 'bow';
    case 'dualWielding':     return getState('dualWielding') === true;
    case 'nearbyEnemiesGte': {
      const v = Number(getState('nearbyEnemyCount') ?? 0);
      const need = Number(cond.value ?? 0);
      return v >= need;
    }
    default: {
      const state = getState(cond.type);
      if (cond.value === undefined) return state === true;
      return state === cond.value;
    }
  }
}
