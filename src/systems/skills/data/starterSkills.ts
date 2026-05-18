import type { SkillDefinition } from '../types/SkillDefinition.js';
import { SkillBehaviorType } from '../types/SkillBehaviorType.js';
import { SkillTargetingType } from '../types/SkillTargetingType.js';
import { DamageType } from '../../combat/types/DamageType.js';

/**
 * Starter skills — exactly 4, per spec, in the exact slot order.
 *   Q  →  CORRUPT_BOLT     (PROJECTILE, instant-reuse)
 *   W  →  VENOM_NOVA       (NOVA, 4s CD)
 *   E  →  SHADOW_DASH      (DASH, 3s CD)
 *   R  →  CORRUPTION_FIELD (GROUND_AOE, 8s CD)
 */
export const SKILL_CORRUPT_BOLT: SkillDefinition = {
  id:            'corrupt_bolt',
  name:          '腐蚀箭',
  description:   '低费快速毒素弹道，建立毒素层。',
  icon:          '↟',
  tags:          ['projectile', 'spell', 'poison'],
  behaviorType:  SkillBehaviorType.PROJECTILE,
  targetingType: SkillTargetingType.DIRECTIONAL,
  castTime:      0.25,
  cooldown:      0,
  manaCost:      6,
  baseDamage:    18,
  damageType:    DamageType.POISON,
  canCrit:       true,
  projectile: {
    speed:        16,
    radius:       0.22,
    maxDistance:  14,
    pierceCount:  0,
    chainCount:   0,
    forkCount:    0,
    hitCooldown:  0.15,
  },
};

export const SKILL_VENOM_NOVA: SkillDefinition = {
  id:            'venom_nova',
  name:          '蛇毒绽放',
  description:   '环身爆发，向周围所有目标释放剧毒冲击。',
  icon:          '✸',
  tags:          ['aoe', 'poison', 'spell'],
  behaviorType:  SkillBehaviorType.NOVA,
  targetingType: SkillTargetingType.SELF_CENTERED,
  castTime:      0.5,
  cooldown:      4,
  manaCost:      18,
  baseDamage:    32,
  damageType:    DamageType.POISON,
  canCrit:       true,
  behaviorConfig: {
    radius: 3.5,
  },
};

export const SKILL_SHADOW_DASH: SkillDefinition = {
  id:            'shadow_dash',
  name:          '影刃突进',
  description:   '向所指方向疾冲，疾冲期间无敌。',
  icon:          '»',
  tags:          ['movement'],
  behaviorType:  SkillBehaviorType.DASH,
  targetingType: SkillTargetingType.DIRECTIONAL,
  castTime:      0,
  cooldown:      3,
  manaCost:      12,
  canCrit:       false,
  behaviorConfig: {
    distance: 4.5,  // world units
    duration: 0.18, // seconds
  },
};

export const SKILL_CORRUPTION_FIELD: SkillDefinition = {
  id:            'corruption_field',
  name:          '腐蚀领域',
  description:   '在地面留下持续腐蚀池，定期对内部敌人造成毒素伤害。',
  icon:          '⌖',
  tags:          ['aoe', 'dot', 'poison'],
  behaviorType:  SkillBehaviorType.GROUND_AOE,
  targetingType: SkillTargetingType.GROUND_TARGET,
  castTime:      0.5,
  cooldown:      8,
  manaCost:      22,
  baseDamage:    12,
  damageType:    DamageType.POISON,
  canCrit:       false, // DOT can't crit
  behaviorConfig: {
    radius:       3.0,
    duration:     4,
    tickInterval: 0.25,
  },
};

export const STARTER_SKILLS: SkillDefinition[] = [
  SKILL_CORRUPT_BOLT,
  SKILL_VENOM_NOVA,
  SKILL_SHADOW_DASH,
  SKILL_CORRUPTION_FIELD,
];
