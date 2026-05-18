/**
 * MonsterEventType — events the monster ecosystem emits.
 *
 *   ON_MONSTER_SPAWN   — every monster (including summons + elites).
 *   ON_MONSTER_AGGRO   — first transition from idle → aggroed.
 *   ON_MONSTER_DEATH   — monster hp reached 0 (paired with combat ON_KILL).
 *   ON_MONSTER_SUMMON  — emitted by SummonerAI before/after a summon spawn.
 *   ON_ELITE_SPAWN     — elite-flagged spawn; fires alongside ON_MONSTER_SPAWN.
 */
export const MonsterEventType = {
  ON_MONSTER_SPAWN:   'ON_MONSTER_SPAWN',
  ON_MONSTER_AGGRO:   'ON_MONSTER_AGGRO',
  ON_MONSTER_DEATH:   'ON_MONSTER_DEATH',
  ON_MONSTER_SUMMON:  'ON_MONSTER_SUMMON',
  ON_ELITE_SPAWN:     'ON_ELITE_SPAWN',
} as const;

export type MonsterEventType = typeof MonsterEventType[keyof typeof MonsterEventType];
