import type { SkillEvent } from '../events/SkillEvent.js';
import type { SkillEventType } from '../events/SkillEventType.js';

export type SkillEventListener = (event: SkillEvent) => void;

/**
 * SkillEventDispatcher — typed event bus mirroring DamageEventDispatcher.
 * Used by SkillExecutor / behaviors / projectile manager to emit
 * ON_SKILL_CAST / HIT / CRIT / KILL / TRIGGER events.
 */
export class SkillEventDispatcher {
  private readonly listeners: Map<SkillEventType, SkillEventListener[]> = new Map();

  on(type: SkillEventType, fn: SkillEventListener): () => void {
    let arr = this.listeners.get(type);
    if (!arr) { arr = []; this.listeners.set(type, arr); }
    arr.push(fn);
    return () => this.off(type, fn);
  }

  off(type: SkillEventType, fn: SkillEventListener): void {
    const arr = this.listeners.get(type);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  emit(event: SkillEvent): void {
    const arr = this.listeners.get(event.type);
    if (!arr || arr.length === 0) return;
    const snapshot = arr.slice();
    for (let i = 0; i < snapshot.length; i++) snapshot[i](event);
  }

  countFor(type: SkillEventType): number {
    return this.listeners.get(type)?.length ?? 0;
  }

  clear(): void { this.listeners.clear(); }
}
