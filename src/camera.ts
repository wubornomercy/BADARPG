/**
 * Camera — pixel-snap follow with no smoothing (per Phase 2A spec:
 * "hard pixel movement, no camera lag").
 *
 * The camera tracks a world-space target point. To position the world
 * container in screen space, call getCameraOffset() each frame.
 */
import { CANVAS_W, CANVAS_H, WORLD_W, WORLD_H } from './tokens.js';

let cameraX = WORLD_W / 2;
let cameraY = WORLD_H / 2;

export function follow(targetX: number, targetY: number) {
  cameraX = targetX;
  cameraY = targetY;
}

/** Returns the worldRoot.position offset that centers the camera on the target. */
export function getCameraOffset(): { x: number, y: number } {
  // Half-viewport-centered, clamped so world edge never reveals void.
  const halfW = CANVAS_W / 2;
  const halfH = CANVAS_H / 2;
  const cx = Math.max(halfW, Math.min(WORLD_W - halfW, cameraX));
  const cy = Math.max(halfH, Math.min(WORLD_H - halfH, cameraY));
  return {
    x: Math.round(-cx + halfW),
    y: Math.round(-cy + halfH),
  };
}

/** Convert screen coords (e.g. mouse) to world coords given current camera. */
export function screenToWorld(sx: number, sy: number): { x: number, y: number } {
  const off = getCameraOffset();
  return { x: sx - off.x, y: sy - off.y };
}
