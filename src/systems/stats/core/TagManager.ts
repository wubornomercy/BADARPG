/**
 * TagManager — registry of valid tags plus the modifier⇄context matcher.
 *
 * The matcher is the canonical rule for tag-based modifier application:
 *   - A modifier with no tags applies unconditionally (untagged = global).
 *   - A modifier with tags applies iff EVERY one of its tags appears in the
 *     query's context tag set.
 *
 * Standard tags listed below are mandated by the spec; downstream modules
 * (items, affixes, skills) may register additional project-specific tags
 * via TagManager.register().
 */
export const STANDARD_TAGS = [
  'physical',
  'fire',
  'cold',
  'lightning',
  'poison',
  'projectile',
  'melee',
  'spell',
  'aoe',
  'movement',
  'crit',
  'dot',
  'summon',
  'trap',
  'minion',
] as const;

export type StandardTag = typeof STANDARD_TAGS[number];

export class TagManager {
  private readonly tags: Set<string> = new Set(STANDARD_TAGS);

  register(tag: string): void { this.tags.add(tag); }
  has(tag: string): boolean { return this.tags.has(tag); }
  list(): string[] { return Array.from(this.tags); }

  /**
   * Static matcher used by the stat pipeline. Kept static so callers don't
   * need an instance to evaluate gate logic (and so tests can call it
   * directly without setting up a registry).
   */
  static matches(
    modTags: readonly string[] | undefined,
    contextTags: readonly string[] | undefined,
  ): boolean {
    if (!modTags || modTags.length === 0) return true;
    if (!contextTags || contextTags.length === 0) return false;
    for (const t of modTags) {
      if (!contextTags.includes(t)) return false;
    }
    return true;
  }
}
