import { StatType } from '../types/StatType.js';
import type { StatManager } from '../core/StatManager.js';

/**
 * StatDebugPanel — developer-only HTML overlay (F8 toggle).
 *
 * Renders, for every stat with a non-zero base or any active modifier:
 *   - the base value
 *   - the FLAT / INCREASED / MORE breakdown by source
 *   - any OVERRIDE (and which source set it)
 *   - the final clamped value
 *   - cache state (DIRTY / clean)
 *
 * Visuals are deliberately minimal — this is an internal tool. Clarity
 * over polish.
 */
export class StatDebugPanel {
  private readonly root: HTMLElement;
  private statManager: StatManager | null = null;
  private visibleFlag = false;
  private keyListenerInstalled = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'statDebugPanel';
    Object.assign(this.root.style, {
      position:       'fixed',
      top:            '12px',
      left:           '12px',
      width:          '560px',
      maxHeight:      '92vh',
      overflowY:      'auto',
      background:     'rgba(7, 9, 13, 0.94)',
      border:         '1px solid #3A4048',
      color:          '#BFC5CE',
      fontFamily:     'monospace, "Pixelify Sans"',
      fontSize:       '11px',
      lineHeight:     '1.45',
      padding:        '10px 12px',
      zIndex:         '9999',
      display:        'none',
      pointerEvents:  'auto',
      whiteSpace:     'normal',
    });
    document.body.appendChild(this.root);

    this.installKeyListener();
  }

  /** Connect to an entity's StatManager. Replaces any previous binding. */
  attach(sm: StatManager): void {
    this.statManager = sm;
    if (this.visibleFlag) this.render();
  }

  isVisible(): boolean { return this.visibleFlag; }

  toggle(): void {
    this.visibleFlag = !this.visibleFlag;
    this.root.style.display = this.visibleFlag ? 'block' : 'none';
    if (this.visibleFlag) this.render();
  }

  show(): void { if (!this.visibleFlag) this.toggle(); }
  hide(): void { if (this.visibleFlag) this.toggle(); }

  /**
   * Render current state. Cheap enough to call every ~200ms while open;
   * tear-down on hide is automatic via `display: none`.
   */
  render(): void {
    const sm = this.statManager;
    if (!sm) {
      this.root.innerHTML = '<b style="color:#E1A84A">STAT DEBUG</b><br/>No StatManager attached.';
      return;
    }

    const parts: string[] = [];
    parts.push('<div style="color:#E1A84A; font-weight:700; letter-spacing:1px">STAT DEBUG  ·  F8 to close</div>');
    parts.push(
      `<div style="margin:4px 0 8px 0; color:#8C9198">conditions: ${escapeHtml(JSON.stringify(sm.getConditionStateSnapshot()))}</div>`
    );

    const stats = Object.values(StatType) as StatType[];
    for (const stat of stats) {
      const br = sm.recompute(stat);
      const hasMods = br.flatMods.length || br.increasedMods.length || br.moreMods.length || br.overrideMods.length;
      const hasDerived = br.flatDerived !== 0 || br.increasedDerived !== 0;
      if (br.base === 0 && !hasMods && !hasDerived) continue;

      const dirtyTag = sm.isDirty(stat) ? '<span style="color:#C86B6B">· DIRTY</span>' : '<span style="color:#5E646D">· clean</span>';
      parts.push(`<div style="margin-top:8px; color:#D6DBE3"><b>${escapeHtml(stat)}</b> ${dirtyTag}</div>`);
      parts.push(`<div>Base: <span style="color:#BFC5CE">${formatNum(br.base)}</span></div>`);

      if (br.flatMods.length || br.flatDerived) {
        parts.push(`<div>FLAT (total ${formatNum(br.totalFlat)}):</div>`);
        if (br.flatDerived) parts.push(`<div style="color:#8C9198">  · ${formatNum(br.flatDerived)} (derived)</div>`);
        for (const m of br.flatMods) {
          parts.push(`<div style="color:#8C9198">  · ${signed(m.value)} (${escapeHtml(m.sourceType)}:${escapeHtml(m.sourceId)})</div>`);
        }
      }
      if (br.increasedMods.length || br.increasedDerived) {
        parts.push(`<div>INCREASED (total ${(br.totalIncreased * 100).toFixed(1)}%):</div>`);
        if (br.increasedDerived) parts.push(`<div style="color:#8C9198">  · ${(br.increasedDerived * 100).toFixed(1)}% (derived)</div>`);
        for (const m of br.increasedMods) {
          parts.push(`<div style="color:#8C9198">  · ${signedPct(m.value)} (${escapeHtml(m.sourceType)}:${escapeHtml(m.sourceId)})</div>`);
        }
      }
      if (br.moreMods.length) {
        parts.push(`<div>MORE:</div>`);
        for (const m of br.moreMods) {
          parts.push(`<div style="color:#8C9198">  · ${m.value >= 0 ? '+' : ''}${m.value}% (${escapeHtml(m.sourceType)}:${escapeHtml(m.sourceId)})</div>`);
        }
      }
      if (br.overrideMods.length) {
        const last = br.overrideMods[br.overrideMods.length - 1];
        parts.push(`<div style="color:#E7C66A">OVERRIDE: ${formatNum(last.value)} (${escapeHtml(last.sourceType)}:${escapeHtml(last.sourceId)})</div>`);
      }
      const capped = br.beforeClamp !== br.final;
      parts.push(`<div style="color:#E1A84A; font-weight:700">FINAL: ${formatNum(br.final)}${capped ? ` <span style="color:#C86B6B; font-weight:400">(clamped from ${formatNum(br.beforeClamp)})</span>` : ''}</div>`);
    }

    parts.push('<div style="margin-top:12px; color:#5E646D">Active modifiers: ' + sm.modifiers.size() + '</div>');

    this.root.innerHTML = parts.join('');
  }

  private installKeyListener(): void {
    if (this.keyListenerInstalled) return;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F8') {
        e.preventDefault();
        this.toggle();
      }
    });
    this.keyListenerInstalled = true;
  }
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n).toString();
  return n.toFixed(2);
}
function signed(n: number): string {
  return (n >= 0 ? '+' : '') + formatNum(n);
}
function signedPct(n: number): string {
  return (n >= 0 ? '+' : '') + n + '%';
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
