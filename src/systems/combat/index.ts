/**
 * BAD ARPG — Damage Pipeline V1 (public barrel).
 *
 * Architecture invariants (do NOT break):
 *   - All combat damage flows through DamagePipeline.resolve().
 *   - The pipeline NEVER touches rendering, VFX, sound, or animation.
 *     Visual/audio reactions subscribe to CombatEvent via
 *     `pipeline.events.on(type, listener)`.
 *   - Stat reads go through StatManager (the only source of truth for
 *     final stat values).
 *   - Calculators are pure: same inputs → same outputs.
 *   - The RNG is injectable for deterministic testing.
 */

export { DamageType, DAMAGE_TYPES, RESISTED_TYPES } from './types/DamageType.js';
export type { DamageBundle } from './types/DamageType.js';
export { HitType } from './types/HitType.js';
export { AilmentType } from './types/AilmentType.js';
export { DamageSource } from './types/DamageSource.js';
export type { CombatEntity } from './types/CombatEntity.js';
export type { DamageContext } from './types/DamageContext.js';
export type { DamageResult } from './types/DamageResult.js';

export { CombatEventType } from './events/CombatEventType.js';
export type { CombatEvent } from './events/CombatEvent.js';

export { DamagePipeline } from './core/DamagePipeline.js';
export type { Rng } from './core/DamagePipeline.js';
export { DamageEventDispatcher } from './core/DamageEventDispatcher.js';
export type { CombatEventListener } from './core/DamageEventDispatcher.js';
export { HitResolver, BLOCK_DAMAGE_RETAINED } from './core/HitResolver.js';
export { CritResolver } from './core/CritResolver.js';
export { DefenseResolver } from './core/DefenseResolver.js';
export { ResistanceResolver, RESIST_CAP } from './core/ResistanceResolver.js';

export { DamageConversionCalculator } from './calculators/DamageConversionCalculator.js';
export { IncreasedDamageCalculator, applicableDamageStats } from './calculators/IncreasedDamageCalculator.js';
export { MoreDamageCalculator } from './calculators/MoreDamageCalculator.js';
export { DamageTakenCalculator } from './calculators/DamageTakenCalculator.js';

export { CombatDebugPanel } from './debug/CombatDebugPanel.js';
