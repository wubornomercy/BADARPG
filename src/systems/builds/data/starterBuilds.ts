/**
 * Starter builds — the 3 archetypes spec'd for COMBAT_FOUNDATION_V1.
 *
 * These are deliberately under-tuned for V1: enough to feel different,
 * not enough to be "balanced". Re-tune in playtest.
 */
import type { BuildPreset } from '../types/BuildPreset.js';
import { StatType } from '../../stats/types/StatType.js';
import { ModifierType } from '../../stats/types/ModifierType.js';

export const BUILD_VENOM_RICOCHET: BuildPreset = {
  id:      'venom',
  label:   '毒蚀弹射',
  tagline: 'VENOM RICOCHET — poison spread + chain pressure',
  mechanics: [
    '所有命中施加毒素叠层（最高 12 层）',
    '投射物获得 +1 弹射，弹射距离 180px',
    '毒素 DPS 缩放生效',
  ],
  modifiers: [
    // +15% poison damage  (tag-gated so it only applies to poison damage rolls)
    { stat: StatType.POISON_DAMAGE,   modifierType: ModifierType.INCREASED, value: 15, tags: ['poison'] },
    // +8% projectile damage
    { stat: StatType.PROJECTILE_DAMAGE, modifierType: ModifierType.INCREASED, value: 8, tags: ['projectile'] },
    // +1 second poison resist (so poison field doesn't kill us as fast)
    { stat: StatType.POISON_RESIST,   modifierType: ModifierType.FLAT,      value: 10 },
  ],
  flags: {
    ricochetBonus:      1,        // +1 bounce per Ricochet Range = 180px
    appliesPoisonOnHit: true,
  },
};

export const BUILD_CRIT_TRIGGER: BuildPreset = {
  id:      'crit',
  label:   '暴击触发',
  tagline: 'CRIT TRIGGER — crit burst + rapid proc chain',
  mechanics: [
    '暴击有 18% 几率触发 Venom Nova',
    '+15% 暴击率 / +30% 暴击伤害',
    '触发冷却 0.4 秒',
  ],
  modifiers: [
    { stat: StatType.CRIT_CHANCE,     modifierType: ModifierType.FLAT,      value: 15 },
    { stat: StatType.CRIT_MULTIPLIER, modifierType: ModifierType.FLAT,      value: 30 },
    { stat: StatType.ATTACK_SPEED,    modifierType: ModifierType.INCREASED, value: 10 },
  ],
  flags: {
    triggerEnabled:    true,
    onTriggerSkillId:  'venom_nova',
  },
};

export const BUILD_CORRUPTION_HUNTER: BuildPreset = {
  id:      'corruption',
  label:   '腐化弓手',
  tagline: 'CORRUPTION HUNTER — corruption stacking + risk/reward',
  mechanics: [
    '精英击杀获得 1.5 倍腐化层数',
    '+12% 全伤害',
    '受到 +50% 元素伤害（风险换收益）',
  ],
  modifiers: [
    { stat: StatType.PHYSICAL_DAMAGE,    modifierType: ModifierType.INCREASED, value: 12 },
    { stat: StatType.POISON_DAMAGE,      modifierType: ModifierType.INCREASED, value: 12 },
    // Negative resist — risk part of risk/reward
    { stat: StatType.FIRE_RESIST,        modifierType: ModifierType.FLAT,      value: -15 },
    { stat: StatType.COLD_RESIST,        modifierType: ModifierType.FLAT,      value: -15 },
    { stat: StatType.LIGHTNING_RESIST,   modifierType: ModifierType.FLAT,      value: -15 },
  ],
  flags: {
    corruptionGainMult: 1.5,
  },
};

export const STARTER_BUILDS: ReadonlyArray<BuildPreset> = [
  BUILD_VENOM_RICOCHET,
  BUILD_CRIT_TRIGGER,
  BUILD_CORRUPTION_HUNTER,
] as const;
