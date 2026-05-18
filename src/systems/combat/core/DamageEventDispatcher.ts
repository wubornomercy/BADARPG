import type { CombatEventType } from '../events/CombatEventType.js';
import type { CombatEvent } from '../events/CombatEvent.js';

export type CombatEventListener = (event: CombatEvent) => void;

/**
 * DamageEventDispatcher — minimal typed event bus owned by the
 * DamagePipeline.
 *
 * Listeners register per event type. Emission iterates a private array
 * captured at emit-time so listeners can safely register / unregister
 * themselves during their callback. The dispatcher is hot-path: keep it
 * alloc-light.
 */
export class DamageEventDispatcher {
  private readonly listeners: Map<CombatEventType, CombatEventListener[]> = new Map();

  /** Subscribe to a combat event. Returns an unsubscribe handle. */
  on(type: CombatEventType, fn: CombatEventListener): () => void {
    let arr = this.listeners.get(type);
    if (!arr) {
      arr = [];
      this.listeners.set(type, arr);
    }
    arr.push(fn);
    return () => this.off(type, fn);
  }

  off(type: CombatEventType, fn: CombatEventListener): void {
    const arr = this.listeners.get(type);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  emit(event: CombatEvent): void {
    const arr = this.listeners.get(event.type);
    if (!arr || arr.length === 0) return;
    // Snapshot so a listener that mutates `arr` (e.g. unsubscribes itself)
    // doesn't desync the iteration.
    const snapshot = arr.slice();
    for (let i = 0; i < snapshot.length; i++) snapshot[i](event);
  }

  /** Drop every listener — for test teardown / scene resets. */
  clear(): void { this.listeners.clear(); }

  countFor(type: CombatEventType): number {
    return this.listeners.get(type)?.length ?? 0;
  }
}
