import { AffixType, type AffixDefinition } from '../types/AffixDefinition.js';
import { StatType } from '../../stats/types/StatType.js';
import { ModifierType } from '../../stats/types/ModifierType.js';

/**
 * Starter affixes — exactly 4 prefixes + 4 suffixes per spec.
 *
 * Tier weights enforce the spec's "higher tier = rarer" requirement.
 * Stat targets match the StatManager conventions established in earlier
 * specs (damage % stats get FLAT mods, percent-point stats get FLAT
 * mods, multiplier stats get INCREASED mods).
 *
 * All affixes default to minItemLevel 1 — the starter pool is meant to
 * roll for any drop. Future affixes will gate by minItemLevel for tier
 * progression at higher monster levels.
 */

// ===== PREFIXES =====

export const AFFIX_VICIOUS: AffixDefinition = {
  id: 'pfx_vicious',
  name: '凶残',
  affixType: AffixType.PREFIX,
  tags: ['projectile'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.PROJECTILE_DAMAGE,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v}% 投射物伤害',
  tiers: [
    { tier: 1, minValue: 18, maxValue: 24, weight: 40 },
    { tier: 2, minValue: 10, maxValue: 17, weight: 80 },
    { tier: 3, minValue: 4,  maxValue: 9,  weight: 120 },
  ],
};

export const AFFIX_VENOMOUS: AffixDefinition = {
  id: 'pfx_venomous',
  name: '剧毒',
  affixType: AffixType.PREFIX,
  tags: ['poison'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.POISON_DAMAGE,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v}% 毒素伤害',
  tiers: [
    { tier: 1, minValue: 20, maxValue: 28, weight: 40 },
    { tier: 2, minValue: 12, maxValue: 19, weight: 80 },
    { tier: 3, minValue: 5,  maxValue: 11, weight: 120 },
  ],
};

export const AFFIX_MYSTIC: AffixDefinition = {
  id: 'pfx_mystic',
  name: '秘法',
  affixType: AffixType.PREFIX,
  tags: ['spell'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.SPELL_DAMAGE,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v}% 法术伤害',
  tiers: [
    { tier: 1, minValue: 18, maxValue: 24, weight: 40 },
    { tier: 2, minValue: 10, maxValue: 17, weight: 80 },
    { tier: 3, minValue: 4,  maxValue: 9,  weight: 120 },
  ],
};

export const AFFIX_MASSIVE: AffixDefinition = {
  id: 'pfx_massive',
  name: '巨硕',
  affixType: AffixType.PREFIX,
  tags: [],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.MAX_HP,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v} 最大生命',
  tiers: [
    { tier: 1, minValue: 70, maxValue: 90, weight: 25 },
    { tier: 2, minValue: 45, maxValue: 69, weight: 60 },
    { tier: 3, minValue: 20, maxValue: 44, weight: 120 },
  ],
};

// ===== SUFFIXES =====

export const AFFIX_SWIFTNESS: AffixDefinition = {
  id: 'sfx_swiftness',
  name: '迅捷',
  affixType: AffixType.SUFFIX,
  tags: ['movement'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.MOVE_SPEED,
  modifierType: ModifierType.INCREASED,
  displayFormat: '+{v}% 移动速度',
  tiers: [
    { tier: 1, minValue: 12, maxValue: 16, weight: 35 },
    { tier: 2, minValue: 7,  maxValue: 11, weight: 80 },
    { tier: 3, minValue: 3,  maxValue: 6,  weight: 140 },
  ],
};

export const AFFIX_PRECISION: AffixDefinition = {
  id: 'sfx_precision',
  name: '精准',
  affixType: AffixType.SUFFIX,
  tags: ['crit'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.CRIT_CHANCE,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v}% 暴击几率',
  tiers: [
    { tier: 1, minValue: 8, maxValue: 12, weight: 30 },
    { tier: 2, minValue: 4, maxValue: 7,  weight: 80 },
    { tier: 3, minValue: 2, maxValue: 3,  weight: 140 },
  ],
};

export const AFFIX_VENOM_WARD: AffixDefinition = {
  id: 'sfx_venom_ward',
  name: '毒抗',
  affixType: AffixType.SUFFIX,
  tags: ['poison'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.POISON_RESIST,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v}% 毒素抗性',
  tiers: [
    { tier: 1, minValue: 28, maxValue: 35, weight: 40 },
    { tier: 2, minValue: 16, maxValue: 27, weight: 80 },
    { tier: 3, minValue: 6,  maxValue: 15, weight: 140 },
  ],
};

export const AFFIX_FROST_WARD: AffixDefinition = {
  id: 'sfx_frost_ward',
  name: '冰抗',
  affixType: AffixType.SUFFIX,
  tags: ['cold'],
  minItemLevel: 1,
  weight: 100,
  statTarget: StatType.COLD_RESIST,
  modifierType: ModifierType.FLAT,
  displayFormat: '+{v}% 冰冷抗性',
  tiers: [
    { tier: 1, minValue: 28, maxValue: 35, weight: 40 },
    { tier: 2, minValue: 16, maxValue: 27, weight: 80 },
    { tier: 3, minValue: 6,  maxValue: 15, weight: 140 },
  ],
};

export const STARTER_AFFIXES: AffixDefinition[] = [
  AFFIX_VICIOUS, AFFIX_VENOMOUS, AFFIX_MYSTIC, AFFIX_MASSIVE,
  AFFIX_SWIFTNESS, AFFIX_PRECISION, AFFIX_VENOM_WARD, AFFIX_FROST_WARD,
];
