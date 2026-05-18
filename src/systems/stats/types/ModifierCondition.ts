/**
 * ModifierCondition — gates a modifier on runtime state.
 *
 * Evaluated by StatManager against a key/value `conditionState` map.
 * Standard condition types supported by the default evaluator:
 *   - whileMoving
 *   - whileStationary
 *   - onLowLife
 *   - againstPoisoned
 *   - withBowEquipped
 *   - dualWielding
 *   - nearbyEnemiesGte   (value: required threshold)
 *
 * Unknown `type` values fall back to a simple equality check against
 * `conditionState[type]` (value === true if `value` is undefined).
 */
export interface ModifierCondition {
  type: string;
  value?: any;
}
