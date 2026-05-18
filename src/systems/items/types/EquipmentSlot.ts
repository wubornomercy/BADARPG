/**
 * EquipmentSlot — all valid slot identifiers.
 *
 * `RING` is a base-spec category only: an item base says "this is a
 * ring" and EquipmentManager resolves the concrete target slot
 * (RING_LEFT or RING_RIGHT) at equip time. Player-side state never
 * holds 'ring' as a key — it uses the two ring-side keys directly.
 */
export const EquipmentSlot = {
  WEAPON:     'weapon',
  HELMET:     'helmet',
  CHEST:      'chest',
  GLOVES:     'gloves',
  BOOTS:      'boots',
  AMULET:     'amulet',
  RING_LEFT:  'ringLeft',
  RING_RIGHT: 'ringRight',
  /** Base-category meta — never used as a player.equippedItems key. */
  RING:       'ring',
} as const;

export type EquipmentSlot = typeof EquipmentSlot[keyof typeof EquipmentSlot];

/** Subtype: the actual slots a player can physically equip into. */
export type PlayerEquipmentSlot = Exclude<EquipmentSlot, 'ring'>;

export const PLAYER_SLOTS: readonly PlayerEquipmentSlot[] = [
  EquipmentSlot.WEAPON,
  EquipmentSlot.HELMET,
  EquipmentSlot.CHEST,
  EquipmentSlot.GLOVES,
  EquipmentSlot.BOOTS,
  EquipmentSlot.AMULET,
  EquipmentSlot.RING_LEFT,
  EquipmentSlot.RING_RIGHT,
];

/** Resolve a base-spec slot category into target player slots in equip-priority order. */
export function resolvePlayerSlots(baseSlot: EquipmentSlot): PlayerEquipmentSlot[] {
  if (baseSlot === EquipmentSlot.RING) {
    return [EquipmentSlot.RING_LEFT, EquipmentSlot.RING_RIGHT];
  }
  return [baseSlot as PlayerEquipmentSlot];
}
