import type { MonsterRuntime } from '../ai/AIBase.js';
import type { MonsterDefinition } from '../types/MonsterDefinition.js';
import { ROLE_SEPARATION_STRENGTH } from '../types/MonsterRole.js';
import { StatManager } from '../../stats/core/StatManager.js';
import { StatType } from '../../stats/types/StatType.js';

let monsterSeq = 0;

/** Minimal MonsterRuntime fixture for tests (no Pixi). */
export function makeMonster(
  def: MonsterDefinition,
  level: number = 1,
  opts: Partial<MonsterRuntime> = {},
): MonsterRuntime {
  const sm = new StatManager();
  sm.setBase(StatType.MAX_HP,     def.baseHP);
  sm.setBase(StatType.MOVE_SPEED, def.moveSpeed);
  return {
    id: opts.id ?? `m_${++monsterSeq}`,
    hp: opts.hp ?? def.baseHP,
    hpMax: def.baseHP,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    alive: opts.alive ?? true,
    statManager: sm,
    definition: def,
    level,
    aggroUntil: 0,
    nextThinkAt: 0,
    aiState: {},
    summonerId: opts.summonerId ?? null,
    eliteModifierIds: [],
    separationStrength: ROLE_SEPARATION_STRENGTH[def.role],
    lastAttackAt: 0,
  };
}
