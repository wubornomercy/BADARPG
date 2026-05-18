/**
 * Combat Feel utilities — screen shake, hit stop coordinator.
 * Pure math; the container being shaken is supplied by caller (worldRoot
 * in main.ts), HUD layer stays unshaken.
 */
import { Container } from 'pixi.js';

interface ShakeReq {
  amplitude: number;
  endsAt: number;
  startedAt: number;
  duration: number;
}

const shakes: ShakeReq[] = [];

/**
 * Request a screen shake.
 * @param amplitude max pixel offset
 * @param durationMs how long
 */
export function requestShake(amplitude: number, durationMs: number, now: number) {
  // De-dupe: if there's already a stronger active shake, ignore weaker request
  // to avoid stutter-spam during dense combat.
  for (const s of shakes) {
    if (s.endsAt > now && s.amplitude >= amplitude) return;
  }
  shakes.push({ amplitude, durationMs, endsAt: now + durationMs, startedAt: now, duration: durationMs } as any);
}

/**
 * Compute current shake offset for this frame. Returns int pixels.
 * Caller decides where to apply it (combines with camera offset etc.).
 */
export function computeShake(now: number): { x: number, y: number } {
  // Remove ended shakes
  for (let i = shakes.length - 1; i >= 0; i--) {
    if (shakes[i].endsAt <= now) shakes.splice(i, 1);
  }
  if (shakes.length === 0) return { x: 0, y: 0 };
  let amp = 0;
  for (const s of shakes) {
    const t = (now - s.startedAt) / s.duration;
    const falloff = Math.max(0, 1 - t);
    if (s.amplitude * falloff > amp) amp = s.amplitude * falloff;
  }
  return {
    x: Math.round((Math.random() * 2 - 1) * amp),
    y: Math.round((Math.random() * 2 - 1) * amp),
  };
}

/** Convenience: applies shake directly to a container (legacy callers). */
export function applyShake(container: Container, now: number) {
  const o = computeShake(now);
  container.x = o.x;
  container.y = o.y;
}

export function clearShake() {
  shakes.length = 0;
}

// =========================================================================
// Hit Stop coordinator — single global "freeze world" timer
// =========================================================================
let hitStopEndsAt = 0;

export function requestHitStop(durationMs: number, now: number) {
  // Take the later of "current" and "this request" so longer freezes win
  const newEnd = now + durationMs;
  if (newEnd > hitStopEndsAt) hitStopEndsAt = newEnd;
}
export function isInHitStop(now: number): boolean {
  return now < hitStopEndsAt;
}
