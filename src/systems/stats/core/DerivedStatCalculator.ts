import { StatType } from '../types/StatType.js';
import { ModifierType } from '../types/ModifierType.js';

/**
 * DerivedStatCalculator — translates primary attribute values into
 * contributions to downstream stats per the spec scaling table.
 *
 * Rules are declared as data, not procedural code, so future systems
 * (passive tree, transformations) can extend the table without touching
 * the pipeline.
 *
 *  STRENGTH:  +4 maxHP, +1 armor (FLAT), +0.5% meleeDamage (INCREASED)
 *  DEXTERITY: +2 evasion, +1 accuracy (FLAT), +0.15% attackSpeed (INCREASED)
 *  INT:       +5 maxMana (FLAT), +0.5% spellDamage, +0.2% manaRegen (INCREASED)
 *  VITALITY:  +8 maxHP, +0.4 hpRegen (FLAT), +0.1% ailmentResist (INCREASED)
 */

/** A single per-point scaling rule. */
interface DerivedRule {
  source: StatType;                                                   // primary attribute
  target: StatType;                                                   // stat that receives the contribution
  perPoint: number;                                                   // amount per point of source
  modifierType: typeof ModifierType.FLAT | typeof ModifierType.INCREASED;
}

const DERIVED_RULES: ReadonlyArray<DerivedRule> = [
  // STRENGTH
  { source: StatType.STRENGTH,     target: StatType.MAX_HP,         perPoint: 4,    modifierType: ModifierType.FLAT },
  { source: StatType.STRENGTH,     target: StatType.ARMOR,          perPoint: 1,    modifierType: ModifierType.FLAT },
  { source: StatType.STRENGTH,     target: StatType.MELEE_DAMAGE,   perPoint: 0.5,  modifierType: ModifierType.INCREASED },

  // DEXTERITY
  { source: StatType.DEXTERITY,    target: StatType.EVASION,        perPoint: 2,    modifierType: ModifierType.FLAT },
  { source: StatType.DEXTERITY,    target: StatType.ACCURACY,       perPoint: 1,    modifierType: ModifierType.FLAT },
  { source: StatType.DEXTERITY,    target: StatType.ATTACK_SPEED,   perPoint: 0.15, modifierType: ModifierType.INCREASED },

  // INTELLIGENCE
  { source: StatType.INTELLIGENCE, target: StatType.MAX_MANA,       perPoint: 5,    modifierType: ModifierType.FLAT },
  { source: StatType.INTELLIGENCE, target: StatType.SPELL_DAMAGE,   perPoint: 0.5,  modifierType: ModifierType.INCREASED },
  { source: StatType.INTELLIGENCE, target: StatType.MANA_REGEN,     perPoint: 0.2,  modifierType: ModifierType.INCREASED },

  // VITALITY
  { source: StatType.VITALITY,     target: StatType.MAX_HP,         perPoint: 8,    modifierType: ModifierType.FLAT },
  { source: StatType.VITALITY,     target: StatType.HP_REGEN,       perPoint: 0.4,  modifierType: ModifierType.FLAT },
  { source: StatType.VITALITY,     target: StatType.AILMENT_RESIST, perPoint: 0.1,  modifierType: ModifierType.INCREASED },
];

/**
 * Auto-injected contribution to a derived stat from primary attribute totals.
 * `increased` is stored as a multiplier fraction (0.15 = +15%), NOT the
 * percent integer used by StatModifier.value (which would be 15). This
 * mirrors how the pipeline mixes it into the INCREASED bucket downstream.
 */
export interface DerivedContribution {
  flat: number;
  increased: number;
}

export class DerivedStatCalculator {
  /** Lookup for: given target stat, what does it derive (if anything)? */
  static getDerivedContribution(
    stat: StatType,
    getPrimary: (s: StatType) => number,
  ): DerivedContribution {
    let flat = 0;
    let increased = 0;
    for (const rule of DERIVED_RULES) {
      if (rule.target !== stat) continue;
      const points = getPrimary(rule.source);
      if (rule.modifierType === ModifierType.FLAT) {
        flat += points * rule.perPoint;
      } else {
        // Spec gives "+0.5% per point" — divide by 100 to convert into the
        // fractional multiplier the pipeline expects.
        increased += (points * rule.perPoint) / 100;
      }
    }
    return { flat, increased };
  }

  /** Reverse lookup: stats that depend on a given primary attribute. */
  static getTargetsFor(primary: StatType): StatType[] {
    return DERIVED_RULES.filter(r => r.source === primary).map(r => r.target);
  }

  /** Read-only view for debug panel rendering. */
  static rules(): ReadonlyArray<DerivedRule> { return DERIVED_RULES; }
}
