/**
 * SpawnWave — director-authored bundle of monsters to spawn together.
 *
 *  - `monsters` lists archetype ids + counts. Director resolves each id
 *    through MonsterManager.get(id) at spawn time.
 *  - `eliteChance` is the per-monster roll inside this wave (0-1). The
 *    base spec value is 0.08; waves can override (boss rooms etc.).
 *  - `minimumDistanceFromPlayer` is the spawn-safety radius in PIXELS.
 *    Director rejects candidate positions inside this ring.
 */
export interface SpawnWave {
  monsters: { monsterId: string; count: number }[];
  eliteChance: number;
  minimumDistanceFromPlayer: number;
}
