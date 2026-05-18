/**
 * BAD ARPG — Monster Ecosystem V1 (public barrel).
 *
 * Architecture invariants (do NOT break):
 *   - All monster damage flows through DamagePipeline (no monster-
 *     specific combat math).
 *   - All stat changes (incl. elite modifiers) go through StatManager
 *     via the standard modifier path with stable sourceId tracking.
 *   - AI is decoupled from rendering — the host owns Pixi and supplies
 *     the entity factory; the AI module never touches Pixi.
 *   - Monsters can only carry ONE elite modifier in V1 (spec patch 5).
 *   - Director owns spawn pacing + composition; spawner owns single-
 *     monster creation; both honour the 5-unit player distance safety.
 */
export { MonsterRole, ROLE_SEPARATION_STRENGTH } from './types/MonsterRole.js';
export { MonsterArchetype } from './types/MonsterArchetype.js';
export type { MonsterDefinition } from './types/MonsterDefinition.js';
export type { SpawnContext } from './types/SpawnContext.js';
export type { SpawnWave } from './types/SpawnWave.js';
export type { EliteModifier } from './types/EliteModifier.js';

export { MonsterEventType } from './events/MonsterEventType.js';
export type { MonsterEvent } from './events/MonsterEvent.js';

export { MonsterAI, AI_THINK_INTERVAL_MS } from './ai/AIBase.js';
export type { MonsterRuntime, AIContext } from './ai/AIBase.js';
export { MeleeChaseAI } from './ai/MeleeChaseAI.js';
export { RangedKiteAI } from './ai/RangedKiteAI.js';
export { ChargerAI } from './ai/ChargerAI.js';
export { SuicideAI } from './ai/SuicideAI.js';
export { SummonerAI } from './ai/SummonerAI.js';

export { MonsterManager } from './core/MonsterManager.js';
export { AggroManager, AGGRO_DURATION_MS } from './core/AggroManager.js';
export {
  EliteManager,
  ELITE_CHANCE, ELITE_XP_BONUS_MULT, ELITE_LOOT_BONUS_MULT, MAX_ELITE_MODIFIERS_V1,
} from './core/EliteManager.js';
export { MonsterSpawner } from './core/MonsterSpawner.js';
export type { MonsterFactory } from './core/MonsterSpawner.js';
export { MonsterDirector, LOCAL_DENSITY_CAP, NEARBY_RADIUS_PX } from './core/MonsterDirector.js';
export type { DirectorConfig } from './core/MonsterDirector.js';
export { MonsterProjectileManager } from './core/MonsterProjectileManager.js';
export type { MonsterProjectileEntity } from './core/MonsterProjectileManager.js';
export {
  levelMultiplier, computeXPReward, computeLootMultiplier, requiredXPForLevel,
} from './core/RewardCalculator.js';

export {
  STARTER_MONSTERS,
  MONSTER_ROTLING, MONSTER_PLAGUE_HOUND, MONSTER_BLIGHT_ARCHER,
  MONSTER_FESTERLING, MONSTER_CORRUPT_BROODMOTHER,
} from './data/monsterDefinitions.js';
export {
  ELITE_MODIFIERS,
  ELITE_TOXIC, ELITE_FRENZIED, ELITE_TITANIC, ELITE_VOLATILE,
} from './data/eliteModifiers.js';
export { STARTER_WAVES, COMPOSITION_TARGETS } from './data/spawnTables.js';

export { MonsterDebugPanel } from './debug/MonsterDebugPanel.js';
