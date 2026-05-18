/**
 * ItemLevelCalculator — per spec V1: item level = monster level.
 *
 * Wrapped in a class so future passes (area-level floor, party-buffed
 * loot, corruption-elevated drops) plug in without touching call sites.
 */
export class ItemLevelCalculator {
  static fromMonsterLevel(monsterLevel: number): number {
    return Math.max(1, Math.floor(monsterLevel));
  }
}
