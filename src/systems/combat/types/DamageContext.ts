import type { DamageType } from './DamageType.js';

/**
 * DamageContext — the full input to DamagePipeline.resolve().
 *
 * The caller (skill, projectile, contact handler, DOT tick) is responsible
 * for assembling this; the pipeline never invents context. Anything not
 * supplied falls back to the spec's safe default (e.g. no penetration,
 * no conversion, crit allowed).
 *
 * NOTE on flags:
 *   - `canBeBlocked` / `canBeDodged` let skills opt out (unblockable AOE,
 *     undodgeable spell). Spec V1 uses defaults of true for normal hits.
 *   - `isDOT` flips the entire hit-check path off; only resistance and
 *     damage-taken modifiers apply. Crit is also disabled unless
 *     `metadata.allowDOTCrit === true` per spec.
 *
 * NOTE on conversion:
 *   `conversion` keys are the *target* damage types (the type the
 *   converted chunk becomes). Values are percentages (0-100) of the
 *   original baseDamage that gets moved from `damageType` to that target.
 *   Per spec the converted chunk retains the original source tags and
 *   gains the new damage-type tag automatically.
 */
export interface DamageContext {
  sourceEntityId: string;
  targetEntityId: string;

  /** Tags carried by the *source action* (e.g. ['projectile','bow','attack']). */
  sourceTags: string[];

  /** Base damage before any pipeline stage. */
  baseDamage: number;

  /** Primary damage type of the hit. */
  damageType: DamageType;

  canCrit:      boolean;
  canBeBlocked: boolean;
  canBeDodged:  boolean;

  /** Additive bonus to source's critChance (percent points, 0-100). */
  bonusCritChance?:     number;
  /** Additive bonus to source's critMultiplier (percent points, e.g. 50 = +50). */
  bonusCritMultiplier?: number;

  /** Penetration applied to target resists (per-hit). Spec: reduces resist BEFORE cap. */
  penetration?: number;

  /** Partial conversion table — see file header for semantics. */
  conversion?: Partial<Record<DamageType, number>>;

  /** Damage over time tick. Skips hit check, disables crit (unless metadata.allowDOTCrit). */
  isDOT?: boolean;

  /** Free-form per-skill data — see spec for `allowDOTCrit`, future hooks. */
  metadata?: Record<string, any>;
}
