import type { StatModifier } from '../types/StatModifier.js';
import type { ModifierCondition } from '../types/ModifierCondition.js';
import type { StatType } from '../types/StatType.js';
import { TagManager } from './TagManager.js';

export type ModifierChangeListener = (affected: ReadonlySet<StatType>) => void;
export type ConditionEvaluator = (cond: ModifierCondition) => boolean;

let modifierIdSeq = 0;
/** Generates a process-unique modifier ID. Used when caller omits `id`. */
export function nextModifierId(prefix: string = 'mod'): string {
  return `${prefix}_${++modifierIdSeq}`;
}

/**
 * ModifierManager — owns the list of active modifiers, validates their
 * conditions, ticks their durations, and signals affected stats up the
 * stack so the StatManager cache can invalidate.
 *
 * It does NOT do arithmetic. It only decides which modifiers are active
 * for a query; arithmetic lives in StatManager.recompute().
 */
export class ModifierManager {
  private readonly mods: Map<string, StatModifier> = new Map();
  private readonly onChange: ModifierChangeListener;
  private readonly conditionEval: ConditionEvaluator;

  constructor(onChange: ModifierChangeListener, conditionEval: ConditionEvaluator) {
    this.onChange = onChange;
    this.conditionEval = conditionEval;
  }

  /** Add a modifier. Assigns `id` if empty. Returns the final id. */
  add(mod: StatModifier): string {
    if (!mod.id) mod.id = nextModifierId('mod');
    this.mods.set(mod.id, mod);
    this.onChange(new Set([mod.stat]));
    return mod.id;
  }

  /** Remove a modifier by id. Returns true if removed. */
  remove(id: string): boolean {
    const m = this.mods.get(id);
    if (!m) return false;
    this.mods.delete(id);
    this.onChange(new Set([m.stat]));
    return true;
  }

  /**
   * Bulk-remove every modifier belonging to a given source. Useful when
   * unequipping an item or canceling an aura.
   */
  removeBySource(sourceId: string): number {
    const affected = new Set<StatType>();
    let count = 0;
    for (const [id, m] of this.mods) {
      if (m.sourceId === sourceId) {
        affected.add(m.stat);
        this.mods.delete(id);
        count++;
      }
    }
    if (count > 0) this.onChange(affected);
    return count;
  }

  get(id: string): StatModifier | undefined { return this.mods.get(id); }
  all(): StatModifier[] { return Array.from(this.mods.values()); }

  forStat(stat: StatType): StatModifier[] {
    const out: StatModifier[] = [];
    for (const m of this.mods.values()) if (m.stat === stat) out.push(m);
    return out;
  }

  /**
   * Returns modifiers for `stat` that pass BOTH the condition gate and
   * the tag gate against the provided context tags.
   */
  activeFor(stat: StatType, contextTags?: readonly string[]): StatModifier[] {
    const out: StatModifier[] = [];
    for (const m of this.mods.values()) {
      if (m.stat !== stat) continue;
      if (!this.isActive(m, contextTags)) continue;
      out.push(m);
    }
    return out;
  }

  /** Pure predicate — does this modifier apply right now? */
  isActive(m: StatModifier, contextTags?: readonly string[]): boolean {
    if (m.condition && !this.conditionEval(m.condition)) return false;
    if (!TagManager.matches(m.tags, contextTags)) return false;
    return true;
  }

  /** Advance time. Expired durations trigger removal + change notify. */
  tick(dtMs: number): void {
    if (this.mods.size === 0) return;
    const affected = new Set<StatType>();
    const toDelete: string[] = [];
    for (const [id, m] of this.mods) {
      if (m.duration === undefined) continue;
      m.duration -= dtMs;
      if (m.duration <= 0) {
        affected.add(m.stat);
        toDelete.push(id);
      }
    }
    for (const id of toDelete) this.mods.delete(id);
    if (affected.size > 0) this.onChange(affected);
  }

  /**
   * Re-evaluate condition gates and emit a change for every stat that has
   * at least one conditional modifier. Called when StatManager's condition
   * state mutates — cheaper than per-mod individual checks because we
   * don't know which mod was previously active or not.
   */
  notifyConditionChange(): void {
    if (this.mods.size === 0) return;
    const affected = new Set<StatType>();
    for (const m of this.mods.values()) {
      if (m.condition) affected.add(m.stat);
    }
    if (affected.size > 0) this.onChange(affected);
  }

  size(): number { return this.mods.size; }
}
