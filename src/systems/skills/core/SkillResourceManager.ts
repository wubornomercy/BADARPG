import type { SkillDefinition } from '../types/SkillDefinition.js';

/**
 * SkillResourceManager — validates + deducts mana / HP for a cast.
 *
 * Order per spec: mana first, HP second. Both must be available before
 * either is deducted (no partial debits).
 *
 * The caster is expected to expose mutable `mana` and `hp` fields. For
 * V1 only the Player needs this — enemies have no skills yet.
 */
export interface ResourceCaster {
  mana: number;
  maxMana: number;
  hp: number;
  hpMax: number;
}

export class SkillResourceManager {
  canPay(caster: ResourceCaster, skill: SkillDefinition): boolean {
    if (caster.mana < skill.manaCost) return false;
    const hpCost = skill.hpCost ?? 0;
    if (hpCost > 0 && caster.hp - hpCost <= 0) return false;
    return true;
  }

  /**
   * Deducts mana, then HP. Caller must have verified canPay() — pay()
   * does NOT re-validate (it's hot-path).
   */
  pay(caster: ResourceCaster, skill: SkillDefinition): void {
    caster.mana = Math.max(0, caster.mana - skill.manaCost);
    const hpCost = skill.hpCost ?? 0;
    if (hpCost > 0) caster.hp = Math.max(1, caster.hp - hpCost);
  }
}
