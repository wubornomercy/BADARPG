/**
 * BuildManager — owns the player's active BuildPreset.
 *
 * Public API:
 *   - registerAll(presets)   register the starter set at boot
 *   - get(id)                lookup
 *   - getActive()            currently-applied preset (or null)
 *   - applyBuild(id, sm)     register the build's stat modifiers against
 *                            the given StatManager. Idempotent: clears any
 *                            previously-applied build first.
 *   - clearBuild(sm)         remove all currently-applied modifiers.
 *
 * Modifier sourceIds follow `build_<id>` so ModifierManager.removeBySource
 * sweeps them in one call.
 */
import type { BuildPreset, BuildId } from '../types/BuildPreset.js';
import type { StatManager } from '../../stats/core/StatManager.js';
import { SourceType } from '../../stats/types/SourceType.js';

export class BuildManager {
  private readonly registry: Map<string, BuildPreset> = new Map();
  private activeId: BuildId | null = null;

  registerAll(presets: ReadonlyArray<BuildPreset>): void {
    for (const p of presets) this.registry.set(p.id, p);
  }

  get(id: string): BuildPreset | undefined { return this.registry.get(id); }
  list(): BuildPreset[] { return Array.from(this.registry.values()); }
  getActive(): BuildPreset | null {
    return this.activeId ? this.registry.get(this.activeId) ?? null : null;
  }
  getActiveId(): BuildId | null { return this.activeId; }

  /** Apply `id`. Clears any previously-applied build first. */
  applyBuild(id: BuildId, sm: StatManager): boolean {
    const preset = this.registry.get(id);
    if (!preset) return false;
    if (this.activeId) this.clearBuild(sm);
    const sourceId = sourceIdOf(id);
    for (const m of preset.modifiers) {
      sm.modifiers.add({
        id:           '',
        stat:         m.stat,
        modifierType: m.modifierType,
        value:        m.value,
        sourceType:   SourceType.PASSIVE,
        sourceId,
        tags:         m.tags ? [...m.tags] : undefined,
      });
    }
    this.activeId = id;
    return true;
  }

  /** Remove every modifier the active build added. */
  clearBuild(sm: StatManager): void {
    if (!this.activeId) return;
    sm.modifiers.removeBySource(sourceIdOf(this.activeId));
    this.activeId = null;
  }
}

function sourceIdOf(id: BuildId): string { return 'build_' + id; }

// Public re-exports for ergonomic imports in main.ts
export type { BuildPreset, BuildId } from '../types/BuildPreset.js';
