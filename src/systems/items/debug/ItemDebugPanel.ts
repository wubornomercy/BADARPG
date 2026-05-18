import type { LootGenerator } from '../core/LootGenerator.js';
import type { ItemManager } from '../core/ItemManager.js';
import type { AffixManager } from '../core/AffixManager.js';
import { TooltipBuilder } from '../core/TooltipBuilder.js';
import { RARITY_COLOR } from '../types/ItemRarity.js';

/**
 * ItemDebugPanel — F11 toggle.
 *
 * Streams the most recent generated items with their rarity, base, and
 * full affix tier breakdown. Mirrors the SkillDebugPanel / CombatDebugPanel
 * style so the three internal tools feel like a set.
 */
export class ItemDebugPanel {
  private readonly root: HTMLElement;
  private generator: LootGenerator | null = null;
  private items: ItemManager | null = null;
  private affixes: AffixManager | null = null;
  private visibleFlag = false;
  private keyListenerInstalled = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'itemDebugPanel';
    Object.assign(this.root.style, {
      position:      'fixed',
      bottom:        '12px',
      left:          '12px',
      width:         '480px',
      maxHeight:     '92vh',
      overflowY:     'auto',
      background:    'rgba(7, 9, 13, 0.94)',
      border:        '1px solid #3A4048',
      color:         '#BFC5CE',
      fontFamily:    'monospace, "Pixelify Sans"',
      fontSize:      '11px',
      lineHeight:    '1.45',
      padding:       '10px 12px',
      zIndex:        '9999',
      display:       'none',
      pointerEvents: 'auto',
    });
    document.body.appendChild(this.root);
    this.installKeyListener();
  }

  attach(generator: LootGenerator, items: ItemManager, affixes: AffixManager): void {
    this.generator = generator;
    this.items = items;
    this.affixes = affixes;
  }

  isVisible(): boolean { return this.visibleFlag; }

  toggle(): void {
    this.visibleFlag = !this.visibleFlag;
    this.root.style.display = this.visibleFlag ? 'block' : 'none';
    if (this.visibleFlag) this.render();
  }

  render(): void {
    if (!this.generator || !this.items || !this.affixes) {
      this.root.innerHTML = '<b style="color:#E1A84A">ITEM DEBUG</b><br/>Not attached.';
      return;
    }
    const recent = this.generator.recent();
    const parts: string[] = [];
    parts.push('<div style="color:#E1A84A; font-weight:700; letter-spacing:1px">ITEM DEBUG  ·  F11 to close</div>');
    parts.push(`<div style="margin:4px 0 8px 0; color:#8C9198">Generated items (latest first): ${recent.length}</div>`);

    for (let i = recent.length - 1; i >= 0; i--) {
      const item = recent[i];
      const view = TooltipBuilder.build(item, this.items, this.affixes);
      parts.push(`<div style="margin-top:10px; padding-top:8px; border-top:1px solid #2A2E35">`);
      parts.push(`<div style="color:${RARITY_COLOR[item.rarity]}; font-weight:700">${escapeHtml(view.baseName)}  <span style="color:#5E646D; font-weight:400">[${item.rarity} · iLvl ${item.itemLevel}]</span></div>`);
      for (const line of view.lines) {
        if (line.kind === 'name') continue;
        const color =
          line.kind === 'implicit' ? '#8C9198' :
          line.kind === 'affix'    ? '#D6DBE3' :
          line.kind === 'meta'     ? '#5E646D' :
                                     '#5E646D';
        parts.push(`<div style="color:${color}">${escapeHtml(line.text)}</div>`);
      }
      parts.push('</div>');
    }
    this.root.innerHTML = parts.join('');
  }

  private installKeyListener(): void {
    if (this.keyListenerInstalled) return;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F11') {
        e.preventDefault();
        this.toggle();
      }
    });
    this.keyListenerInstalled = true;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' :
                '&#39;'
  ));
}
