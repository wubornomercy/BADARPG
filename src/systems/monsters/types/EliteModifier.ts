import type { StatModifier } from '../../stats/types/StatModifier.js';

/**
 * EliteModifier — pure data template applied to an elite monster.
 *
 * Per spec patch 1: stat modifiers are registered with sourceId
 * `elite_<monsterId>` so EliteManager.remove(monster) can sweep them
 * cleanly on death / despawn via removeBySource.
 *
 * `renderHints` is a non-stat side-channel (e.g. TITANIC scales the
 * sprite by 1.25). The host applies these visually after the modifier
 * is attached.
 *
 * `onDeathExplosion` describes a damage burst the host must fire when
 * the monster dies (only VOLATILE uses this in V1). The blast travels
 * through DamagePipeline; this struct is pure data so the manager
 * stays VFX-free.
 */
export interface EliteModifier {
  id: string;
  name: string;
  /** Stat modifier templates — sourceId is replaced at apply time. */
  statModifiers: StatModifier[];
  renderHints?: {
    scale?: number;
    tint?:  number;
  };
  /** Optional on-death AOE damage payload routed through DamagePipeline. */
  onDeathExplosion?: {
    baseDamage: number;
    damageType: import('../../combat/types/DamageType.js').DamageType;
    radius: number;
    tags: string[];
  };
}
