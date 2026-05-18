import type { StatManager } from '../../stats/core/StatManager.js';
import type { DamageType } from '../types/DamageType.js';

/**
 * DamageTakenCalculator — final multiplicative factor applied to a damage
 * chunk based on TARGET-side "damage taken" modifiers.
 *
 * Spec V1 status: ARCHITECTURE ONLY. The pipeline calls into this step
 * so the wiring is permanent, but full affix support (e.g. "20% increased
 * fire damage taken from poisoned enemies") is deferred until the item /
 * affix systems land. For now it returns 1.0 — i.e. no modification.
 *
 * Hook points for the future implementation:
 *   - target StatManager queries via a future StatType.DAMAGE_TAKEN_FIRE etc.
 *   - context-tag-aware filtering (sourceTags drive applicability)
 *   - support FLAT/INCREASED (additive) and MORE (multiplicative) splits
 *     identical to the offensive calculators.
 */
export class DamageTakenCalculator {
  static compute(
    _targetSM: StatManager | undefined,
    _damageType: DamageType,
    _sourceTags: readonly string[],
  ): number {
    return 1.0;
  }
}
