import type { ItemDefinition } from '../types/ItemDefinition.js';
import type { ItemBaseType } from '../types/ItemBaseType.js';
import { RARITY_COLOR, ItemRarity } from '../types/ItemRarity.js';
import { ItemManager } from './ItemManager.js';
import { AffixManager } from './AffixManager.js';

/**
 * TooltipBuilder — builds a structured tooltip view-model from a rolled
 * item. UI layer (HTML overlay, debug panel) does the actual rendering.
 *
 * Spec priority: readability > visuals. We emit plain strings with one
 * piece of structured metadata (rarity color) so any consumer can paint
 * them however it likes.
 */
export interface TooltipLine {
  text: string;
  /** 'name' / 'header' / 'implicit' / 'affix' / 'meta' */
  kind: 'name' | 'header' | 'implicit' | 'affix' | 'meta';
}

export interface TooltipView {
  rarityColor: string;
  name: string;
  baseName: string;
  rarity: ItemRarity;
  itemLevel: number;
  lines: TooltipLine[];
}

export class TooltipBuilder {
  static build(item: ItemDefinition, items: ItemManager, affixes: AffixManager): TooltipView {
    const base = items.get(item.baseTypeId);
    const baseName = base?.name ?? item.baseTypeId;

    const lines: TooltipLine[] = [];

    // Name line — affix-derived prefix/suffix labels could be added here
    // later; V1 just shows the base name with rarity colour.
    lines.push({ kind: 'name', text: baseName });

    // Implicits (always shown when present)
    if (base && base.implicitModifiers.length > 0) {
      lines.push({ kind: 'header', text: '── 隐含 ──' });
      for (const imp of base.implicitModifiers) {
        lines.push({
          kind: 'implicit',
          text: formatImplicit(imp.stat, imp.modifierType, imp.value),
        });
      }
    }

    if (item.prefixes.length > 0 || item.suffixes.length > 0) {
      lines.push({ kind: 'header', text: '── 词缀 ──' });
      for (const r of item.prefixes) {
        const def = affixes.get(r.affixId);
        if (!def) continue;
        lines.push({
          kind: 'affix',
          text: `[T${r.tier}] ` + formatAffix(def.displayFormat, def.name, r.rolledValue),
        });
      }
      for (const r of item.suffixes) {
        const def = affixes.get(r.affixId);
        if (!def) continue;
        lines.push({
          kind: 'affix',
          text: `[T${r.tier}] ` + formatAffix(def.displayFormat, def.name, r.rolledValue),
        });
      }
    }

    lines.push({ kind: 'meta', text: `物品等级 ${item.itemLevel}` });

    return {
      rarityColor: RARITY_COLOR[item.rarity],
      name: baseName,
      baseName,
      rarity: item.rarity,
      itemLevel: item.itemLevel,
      lines,
    };
  }

  /** Render the tooltip as a plain text block (newline-separated). */
  static asText(view: TooltipView): string {
    return view.lines.map((l) => l.text).join('\n');
  }
}

function formatAffix(template: string | undefined, name: string, value: number): string {
  if (template) {
    return `${name}  ${template.replace('{v}', formatNumber(value))}`;
  }
  return `${name}  +${formatNumber(value)}`;
}

function formatImplicit(_stat: string, _modType: string, value: number): string {
  return `+${formatNumber(value)}`;
}

function formatNumber(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toString();
  return n.toFixed(1);
}
