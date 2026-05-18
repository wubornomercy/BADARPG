import type { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';

/**
 * SkillCooldownManager — tracks per-skill cooldown expiry times for a
 * single caster (Player). For NPCs each one would own its own instance.
 *
 * Effective cooldown formula (spec):
 *   effectiveCD = baseCD / (1 + cooldownReduction / 100)
 *
 * CDR is read via StatManager so passive tree / item modifiers flow
 * through automatically. Clamping happens inside StatManager (cap 75%).
 */
export class SkillCooldownManager {
  private readonly readyAt: Map<string, number> = new Map();

  /** True when the skill is still on cooldown at `now`. */
  isOnCooldown(skillId: string, now: number): boolean {
    const t = this.readyAt.get(skillId);
    return t !== undefined && now < t;
  }

  /** Remaining cooldown in milliseconds (>= 0). */
  remaining(skillId: string, now: number): number {
    const t = this.readyAt.get(skillId);
    if (t === undefined) return 0;
    return Math.max(0, t - now);
  }

  /**
   * Start the cooldown for `skill`, scaled by source CDR.
   * No-op when baseCD is 0 (instant-reuse skills like Corrupt Bolt).
   */
  start(skill: SkillDefinition, sourceSM: StatManager | undefined, now: number): void {
    if (skill.cooldown <= 0) return;
    const cdrPct = sourceSM ? sourceSM.getFinalStat(StatType.COOLDOWN_REDUCTION) : 0;
    const scaled = (skill.cooldown * 1000) / (1 + cdrPct / 100);
    this.readyAt.set(skill.id, now + scaled);
  }

  /** Internal — used by tests and resets. */
  clear(skillId?: string): void {
    if (skillId === undefined) this.readyAt.clear();
    else this.readyAt.delete(skillId);
  }

  /** Snapshot for debug rendering: skillId → ms remaining. */
  snapshot(now: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [id, t] of this.readyAt) {
      const r = t - now;
      if (r > 0) out[id] = r;
    }
    return out;
  }
}
