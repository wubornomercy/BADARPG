import { DamageType, DAMAGE_TYPES, DamageBundle } from '../types/DamageType.js';

/**
 * DamageConversionCalculator — applies partial conversion from a single
 * primary damage type to one or more target damage types.
 *
 * Spec rules:
 *   - Converted damage retains source tags (handled at the pipeline level).
 *   - Converted damage gains the new damage-type tag (also pipeline-level
 *     — Increased/More queries always include the chunk's current type).
 *   - Conversion occurs BEFORE increased/more.
 *
 * `conversion` keys map TARGET type → percent of base damage moved into
 * that target. The remainder of base stays on the primary type. Total
 * conversion is clamped to ≤ 100%; any excess is dropped from the over-
 * subscribed targets proportionally.
 */
export class DamageConversionCalculator {
  static convert(
    baseDamage: number,
    primaryType: DamageType,
    conversion: Partial<Record<DamageType, number>> | undefined,
  ): DamageBundle {
    const out: DamageBundle = {};
    if (!conversion) {
      out[primaryType] = baseDamage;
      return out;
    }

    // Sum + clamp the requested conversions. Self-conversion (e.g. fire →
    // fire) is treated as a no-op.
    let totalRequested = 0;
    for (const t of DAMAGE_TYPES) {
      if (t === primaryType) continue;
      const v = conversion[t];
      if (typeof v === 'number' && v > 0) totalRequested += v;
    }
    const scale = totalRequested > 100 ? 100 / totalRequested : 1;
    let actualConverted = 0;

    for (const t of DAMAGE_TYPES) {
      if (t === primaryType) continue;
      const v = conversion[t];
      if (typeof v !== 'number' || v <= 0) continue;
      const pct = v * scale;
      const amount = baseDamage * (pct / 100);
      out[t] = (out[t] ?? 0) + amount;
      actualConverted += amount;
    }

    const remainder = Math.max(0, baseDamage - actualConverted);
    out[primaryType] = (out[primaryType] ?? 0) + remainder;
    return out;
  }
}
