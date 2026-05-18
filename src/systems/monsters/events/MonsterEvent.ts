import type { MonsterEventType } from './MonsterEventType.js';
import type { MonsterRole } from '../types/MonsterRole.js';

/**
 * MonsterEvent — payload for every monster-pipeline event.
 *
 * Includes everything downstream systems need to attribute the event:
 * archetype id, role, level, elite modifier list, world position, and
 * (for deaths) the killer's entity id.
 */
export interface MonsterEvent {
  type: MonsterEventType;
  monsterId: string;          // archetype id (definition.id)
  instanceId: string;         // runtime instance id (entity.id)
  role: MonsterRole;
  level: number;
  eliteModifiers: readonly string[];
  position: { x: number; y: number };
  killerId?: string;
  summonerId?: string;
}
