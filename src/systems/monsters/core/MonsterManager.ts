import type { MonsterDefinition } from '../types/MonsterDefinition.js';
import { MonsterAI } from '../ai/AIBase.js';

/**
 * MonsterManager — monster definition + AI registry.
 *
 * Two parallel registries that share a string id (`aiType`). The spawner
 * resolves a definition into an AI by looking up `definition.aiType` in
 * the AI registry.
 */
export class MonsterManager {
  private readonly defs: Map<string, MonsterDefinition> = new Map();
  private readonly ais:  Map<string, MonsterAI>         = new Map();

  registerDefinition(def: MonsterDefinition): void { this.defs.set(def.id, def); }
  registerDefinitions(defs: MonsterDefinition[]): void { for (const d of defs) this.registerDefinition(d); }
  getDefinition(id: string): MonsterDefinition | undefined { return this.defs.get(id); }
  allDefinitions(): MonsterDefinition[] { return Array.from(this.defs.values()); }

  registerAI(ai: MonsterAI): void { this.ais.set(ai.id, ai); }
  registerAIs(ais: MonsterAI[]): void { for (const a of ais) this.registerAI(a); }
  getAI(id: string): MonsterAI | undefined { return this.ais.get(id); }
  aiFor(def: MonsterDefinition): MonsterAI | undefined { return this.ais.get(def.aiType); }
}
