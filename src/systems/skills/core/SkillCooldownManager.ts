import type { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';

/**
 * SkillCooldownManager — tracks per-skill cooldown expiry times for a
 * single caster (Player). For NPCs each one would own its own instance.
 *
 * Effective cooldown formula:
 *   effectiveCD = (baseCD / (1 + cooldownReduction / 100)) / attackSpeedMult
 *
 * `cooldownReduction` is always applied. `attackSpeedMult` is applied
 * only when the skill opts in via `attackSpeedScaled: true` — used for
 * basic-attack-style skills (Corrupt Bolt) so +attack speed gear
 * actually speeds up the spam, not just locked spells.
 *
 * Both stats are read via StatManager so passive tree / item modifiers
 * flow through automatically. CDR is clamped to 75% inside StatManager.
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
   * Start the cooldown for `skill`, scaled by source CDR + (optionally)
   * attack speed. No-op when baseCD is 0.
   */
  start(skill: SkillDefinition, sourceSM: StatManager | undefined, now: number): void {
    if (skill.cooldown <= 0) return;
    const cdrPct = sourceSM ? sourceSM.getFinalStat(StatType.COOLDOWN_REDUCTION) : 0;
    let scaled = (skill.cooldown * 1000) / (1 + cdrPct / 100);
    if (skill.attackSpeedScaled && sourceSM) {
      const as = Math.max(0.01, sourceSM.getFinalStat(StatType.ATTACK_SPEED));
      scaled /= as;
    }
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
