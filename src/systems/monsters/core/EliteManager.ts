import type { EliteModifier } from '../types/EliteModifier.js';
import type { MonsterRuntime } from '../ai/AIBase.js';
import { ELITE_MODIFIERS } from '../data/eliteModifiers.js';
import type { StatManager } from '../../stats/core/StatManager.js';

/**
 * EliteManager — applies / removes / picks elite modifiers.
 *
 * Per spec patches 1 and 5:
 *   - All modifiers attach with sourceId `elite_<monsterId>` so they
 *     unwind cleanly via `removeBySource` on death / despawn.
 *   - V1 hard-enforces exactly ONE elite modifier per monster. Calls to
 *     apply() against an already-elite monster are no-ops.
 *
 * Elite chance + XP / loot bonus live here too as named constants so
 * MonsterDirector + reward computation share one source of truth.
 */
export const ELITE_CHANCE = 0.08;
export const ELITE_XP_BONUS_MULT   = 1.6; // +60% XP per spec
export const ELITE_LOOT_BONUS_MULT = 1.8; // +80% loot multiplier per spec
export const MAX_ELITE_MODIFIERS_V1 = 1;  // patch 5

export class EliteManager {
  private readonly registry: Map<string, EliteModifier> = new Map();

  constructor(initialMods: EliteModifier[] = ELITE_MODIFIERS) {
    for (const m of initialMods) this.registry.set(m.id, m);
  }

  get(id: string): EliteModifier | undefined { return this.registry.get(id); }
  all(): EliteModifier[] { return Array.from(this.registry.values()); }

  /** Returns a random modifier id from the registry. */
  pickRandom(rng: () => number = Math.random): string {
    const arr = Array.from(this.registry.values());
    return arr[Math.floor(rng() * arr.length) % arr.length].id;
  }

  /**
   * Attach `modifierId` to `monster`. Replaces stat-modifier sourceIds
   * with the canonical `elite_<instanceId>` token, attaches render
   * hints, and stamps the modifier id onto the monster's tracker.
   *
   * V1: silently no-op if the monster already has an elite modifier
   * (per spec patch 5 — max 1).
   */
  applyTo(monster: MonsterRuntime, modifierId: string, statManager?: StatManager): boolean {
    if (monster.eliteModifierIds.length >= MAX_ELITE_MODIFIERS_V1) return false;
    const def = this.registry.get(modifierId);
    if (!def) return false;
    const sm = statManager ?? monster.statManager;
    if (!sm) return false;

    const sourceId = EliteManager.sourceIdFor(monster);
    for (const tmpl of def.statModifiers) {
      sm.modifiers.add({
        id: '',
        stat: tmpl.stat,
        modifierType: tmpl.modifierType,
        value: tmpl.value,
        sourceType: tmpl.sourceType,
        sourceId,
        tags: tmpl.tags ? [...tmpl.tags] : undefined,
      });
    }
    monster.eliteModifierIds.push(def.id);
    return true;
  }

  /** Sweep elite modifiers off a monster on death / despawn. */
  removeFrom(monster: MonsterRuntime, statManager?: StatManager): void {
    const sm = statManager ?? monster.statManager;
    if (!sm) return;
    sm.modifiers.removeBySource(EliteManager.sourceIdFor(monster));
    monster.eliteModifierIds.length = 0;
  }

  static sourceIdFor(monster: MonsterRuntime): string {
    return `elite_${monster.id}`;
  }
}
