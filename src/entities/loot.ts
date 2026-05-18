/**
 * Loot drop — minimal Phase 2 V1: pedestal + icon + rarity beam.
 * Mirrors the LOOT_PRESENTATION_V1 language at runtime scale.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { COLOR } from '../tokens.js';
import type { ItemDefinition } from '../systems/items/types/ItemDefinition.js';

type Rarity = 'normal' | 'magic' | 'rare';
// Loot beam DISABLED per user feedback ("光柱做的太丑了，先禁用了之后重做").
// Flip values back (e.g. magic: 40, rare: 80) to re-enable.
const BEAM_HEIGHT: Record<Rarity, number> = { normal: 0, magic: 0, rare: 0 };
const COLORS: Record<Rarity, number> = {
  normal: COLOR.rarityNormal,
  magic:  COLOR.rarityMagic,
  rare:   COLOR.rarityRare,
};
const SAMPLE_NAMES: Record<Rarity, string[]> = {
  normal: ['锈裂短弓', '残破斗篷', '锈蚀匕首', '木质护腕', '褪色护符'],
  magic:  ['精巧·活力之冠', '暴击之环', '致毒匕首'],
  rare:   ['掠夺者之锁手', '寒铁短剑', '巫约护符'],
};

export class LootDrop {
  container: Container;
  spawnAt: number;
  alive = true;
  x: number;
  y: number;
  rarity: Rarity;
  /** Rolled item bound to this drop; set externally by LootGenerator wiring. */
  item: ItemDefinition | null = null;
  /** Display name override; if set, overrides the SAMPLE_NAMES filler. */
  displayName: string | null = null;

  private beam: Graphics | null = null;

  constructor(x: number, y: number, rarity: Rarity, now: number, displayName?: string) {
    this.x = x; this.y = y;
    this.rarity = rarity;
    this.spawnAt = now;
    this.displayName = displayName ?? null;

    this.container = new Container();
    this.container.label = 'loot';

    const color = COLORS[rarity];
    const beamH = BEAM_HEIGHT[rarity];

    // Beam (only for magic+) — banded vertical column
    if (beamH > 0) {
      const beam = new Graphics();
      for (let yi = 0; yi < beamH; yi += 6) {
        const a = yi % 12 === 0 ? 0.7 : 0.3;
        beam.rect(-3, -beamH + yi, 6, 4).fill({ color, alpha: a });
      }
      this.container.addChild(beam);
      this.beam = beam;
    }

    // Pedestal — chunky pixel base (only ground marker; no big icon char
    // per user feedback "directly show the item name, no 靴/盾 big chars").
    const ped = new Graphics()
      .rect(-12, -2, 24, 4).fill(0x0A0C10)
      .rect(-12, -3, 24, 1).fill(0x2A2E35);
    this.container.addChild(ped);

    const name = displayName ?? pick(SAMPLE_NAMES[rarity]);

    // Label — sits just above the pedestal/beam, banner with rarity border
    const labelY = beamH > 0 ? -beamH - 6 : -14;
    const label = new Text({
      text: name,
      style: {
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: 13,
        fontWeight: '600',
        fill: color,
        align: 'center',
      },
    });
    label.anchor.set(0.5, 0);
    label.x = 0;
    label.y = labelY;

    // Label background
    const lbg = new Graphics();
    const padX = 6, padY = 3;
    const lw = label.width + padX * 2;
    const lh = label.height + padY * 2;
    lbg.rect(-lw / 2, label.y - padY, lw, lh).fill({ color: 0x08090E, alpha: 0.82 });
    lbg.rect(-lw / 2, label.y - padY, lw, lh).stroke({ color, width: 2 });
    this.container.addChild(lbg);
    this.container.addChild(label);

    this.container.x = Math.round(x);
    this.container.y = Math.round(y);
  }

  update(dtMs: number, now: number) {
    if (!this.alive) return;
    // Beam low-frequency pulse
    if (this.beam) {
      const t = (now - this.spawnAt) / 1000;
      this.beam.alpha = 0.7 + Math.sin(t * 2.2) * 0.15;
    }
  }
}

function pick<T>(arr: T[]): T { return arr[(Math.random() * arr.length) | 0]; }
