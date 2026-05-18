/**
 * StatType — exhaustive enumeration of all stats the StatManager can track.
 *
 * Declared as a frozen object + matching type alias so we get both:
 *   - value access:  StatType.MAX_HP === 'maxHP'
 *   - type guarding: function (s: StatType) { ... }
 *
 * String values are stable IDs used in cache keys, modifier payloads,
 * debug panel labels, and (later) item / affix data files.
 */
export const StatType = {
  // ---- Primary attributes ------------------------------------------------
  STRENGTH:      'strength',
  DEXTERITY:     'dexterity',
  INTELLIGENCE:  'intelligence',
  VITALITY:      'vitality',

  // ---- Offensive ---------------------------------------------------------
  PHYSICAL_DAMAGE:        'physicalDamage',
  FIRE_DAMAGE:            'fireDamage',
  COLD_DAMAGE:            'coldDamage',
  LIGHTNING_DAMAGE:       'lightningDamage',
  POISON_DAMAGE:          'poisonDamage',
  SPELL_DAMAGE:           'spellDamage',
  PROJECTILE_DAMAGE:      'projectileDamage',
  MELEE_DAMAGE:           'meleeDamage',
  DOT_DAMAGE:             'dotDamage',
  CRIT_CHANCE:            'critChance',
  CRIT_MULTIPLIER:        'critMultiplier',
  ATTACK_SPEED:           'attackSpeed',
  CAST_SPEED:             'castSpeed',
  ACCURACY:               'accuracy',
  ARMOR_PENETRATION:      'armorPenetration',
  ELEMENTAL_PENETRATION:  'elementalPenetration',
  LIFE_STEAL:             'lifeSteal',

  // ---- Defensive ---------------------------------------------------------
  MAX_HP:             'maxHP',
  MAX_MANA:           'maxMana',
  ARMOR:              'armor',
  EVASION:            'evasion',
  BLOCK_CHANCE:       'blockChance',
  FIRE_RESIST:        'fireResist',
  COLD_RESIST:        'coldResist',
  LIGHTNING_RESIST:   'lightningResist',
  POISON_RESIST:      'poisonResist',
  HP_REGEN:           'hpRegen',
  MANA_REGEN:         'manaRegen',
  DAMAGE_REDUCTION:   'damageReduction',
  // VIT scales ailmentResist per spec; added here for forward compatibility.
  AILMENT_RESIST:     'ailmentResist',

  // ---- Utility -----------------------------------------------------------
  MOVE_SPEED:           'moveSpeed',
  COOLDOWN_REDUCTION:   'cooldownReduction',
  PICKUP_RADIUS:        'pickupRadius',
  GOLD_FIND:            'goldFind',
  RARITY_FIND:          'rarityFind',
} as const;

export type StatType = typeof StatType[keyof typeof StatType];

/** Primary attributes — feed the DerivedStatCalculator, NOT subject to derived contributions themselves. */
export const PRIMARY_STATS: ReadonlySet<StatType> = new Set<StatType>([
  StatType.STRENGTH,
  StatType.DEXTERITY,
  StatType.INTELLIGENCE,
  StatType.VITALITY,
]);

/** Resistance stats — share a single hard cap. */
export const RESIST_STATS: ReadonlySet<StatType> = new Set<StatType>([
  StatType.FIRE_RESIST,
  StatType.COLD_RESIST,
  StatType.LIGHTNING_RESIST,
  StatType.POISON_RESIST,
]);
