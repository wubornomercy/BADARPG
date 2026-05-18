import type { EliteModifier } from '../types/EliteModifier.js';
import { StatType } from '../../stats/types/StatType.js';
import { ModifierType } from '../../stats/types/ModifierType.js';
import { SourceType } from '../../stats/types/SourceType.js';
import { DamageType } from '../../combat/types/DamageType.js';

/**
 * Elite modifiers — exactly 4 per spec.
 *
 * Stat values flow through StatManager via the standard modifier path.
 * Source ids are stamped at apply-time by EliteManager so removeBySource
 * cleans them up on death. Per-instance instantiation is in
 * EliteManager.apply() so the data template stays read-only.
 *
 * TITANIC's "+25% size scale" is render-only — no stat, just a visual
 * cue surfaced via `renderHints.scale`.
 *
 * VOLATILE's death blast is described by `onDeathExplosion` so the
 * monster manager can fire a single combat.resolve() per nearby target
 * when the carrier dies. No special-case math anywhere.
 */
function statMod(stat: StatType, modType: typeof ModifierType[keyof typeof ModifierType], value: number) {
  return {
    id: '',
    stat,
    modifierType: modType,
    value,
    sourceType: SourceType.MONSTER,
    sourceId: '', // filled by EliteManager.apply
  };
}

export const ELITE_TOXIC: EliteModifier = {
  id: 'toxic',
  name: '剧毒',
  statModifiers: [
    statMod(StatType.POISON_DAMAGE, ModifierType.FLAT,       40),
    statMod(StatType.MOVE_SPEED,    ModifierType.INCREASED,  25),
  ],
};

export const ELITE_FRENZIED: EliteModifier = {
  id: 'frenzied',
  name: '狂乱',
  statModifiers: [
    statMod(StatType.ATTACK_SPEED,        ModifierType.INCREASED, 30),
    statMod(StatType.COOLDOWN_REDUCTION,  ModifierType.FLAT,      20),
  ],
};

export const ELITE_TITANIC: EliteModifier = {
  id: 'titanic',
  name: '巨硕',
  statModifiers: [
    statMod(StatType.MAX_HP, ModifierType.INCREASED, 80),
  ],
  renderHints: {
    scale: 1.25,
  },
};

export const ELITE_VOLATILE: EliteModifier = {
  id: 'volatile',
  name: '易爆',
  statModifiers: [], // no passive boost; the payoff is death
  onDeathExplosion: {
    baseDamage: 48,
    damageType: DamageType.FIRE,
    radius:     3, // world units — 3 × 32 = 96 px
    tags:       ['aoe', 'fire', 'elite'],
  },
};

export const ELITE_MODIFIERS: EliteModifier[] = [
  ELITE_TOXIC, ELITE_FRENZIED, ELITE_TITANIC, ELITE_VOLATILE,
];
