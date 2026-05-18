import type { SkillEventType } from './SkillEventType.js';
import type { SkillDefinition } from '../types/SkillDefinition.js';
import type { SkillContext } from '../types/SkillContext.js';
import type { CombatEntity } from '../../combat/types/CombatEntity.js';
import type { DamageResult } from '../../combat/types/DamageResult.js';

/**
 * SkillEvent — payload for every skill-pipeline event. Future systems
 * (cast-on-crit, cast-on-kill, trigger chains, proc builds, legendary
 * affixes, passive tree nodes) hang off these.
 *
 *  - `caster` is always populated.
 *  - `target` / `result` are populated for HIT / CRIT / KILL events.
 *  - `triggerSource` carries the source skill id when this skill was
 *    invoked by a trigger effect. `chainDepth` records nesting.
 *  - `projectileSource` is the projectile entity id when the damage
 *    came from a PROJECTILE skill (for chain / fork inheritance).
 *
 * Listeners must treat all references as read-only — mutating the event
 * payload from a listener invites subtle ordering bugs.
 */
export interface SkillEvent {
  type:             SkillEventType;
  caster:           CombatEntity;
  skill:            SkillDefinition;
  context:          SkillContext;
  tags:             readonly string[];

  target?:          CombatEntity;
  result?:          DamageResult;

  triggerSource?:   string;
  chainDepth:       number;
  projectileSource?: string;
}
