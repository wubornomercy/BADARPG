import type { DamagePipeline } from '../core/DamagePipeline.js';
import { CombatEventType } from '../events/CombatEventType.js';
import type { CombatEvent } from '../events/CombatEvent.js';

/**
 * CombatDebugPanel — developer-only HTML overlay (F9 toggle).
 *
 * Streams a rolling log of the most recent combat events with the
 * pipelineBreakdown expanded so we can see exactly which stage produced
 * which value. Purely diagnostic.
 */
export class CombatDebugPanel {
  private readonly root: HTMLElement;
  private pipeline: DamagePipeline | null = null;
  private visibleFlag = false;
  private keyListenerInstalled = false;
  private readonly log: CombatEvent[] = [];
  private static readonly LOG_CAP = 32;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'combatDebugPanel';
    Object.assign(this.root.style, {
      position:      'fixed',
      top:           '12px',
      right:         '12px',
      width:         '560px',
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

  attach(pipeline: DamagePipeline): void {
    this.pipeline = pipeline;
    pipeline.events.on(CombatEventType.ON_HIT,           (e) => this.push(e));
    pipeline.events.on(CombatEventType.ON_DODGE,         (e) => this.push(e));
    pipeline.events.on(CombatEventType.ON_BLOCK,         (e) => this.push(e));
    pipeline.events.on(CombatEventType.ON_KILL,          (e) => this.push(e));
  }

  isVisible(): boolean { return this.visibleFlag; }

  toggle(): void {
    this.visibleFlag = !this.visibleFlag;
    this.root.style.display = this.visibleFlag ? 'block' : 'none';
    if (this.visibleFlag) this.render();
  }

  render(): void {
    if (!this.pipeline) {
      this.root.innerHTML = '<b style="color:#E1A84A">COMBAT DEBUG</b><br/>No pipeline attached.';
      return;
    }
    const parts: string[] = [];
    parts.push('<div style="color:#E1A84A; font-weight:700; letter-spacing:1px">COMBAT DEBUG  ·  F9 to close</div>');
    parts.push(`<div style="margin:4px 0 8px 0; color:#8C9198">${this.log.length} recent events (latest first)</div>`);

    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i];
      const br = e.result.pipelineBreakdown;
      const banner =
        e.type === CombatEventType.ON_DODGE ? '#5A7FCF' :
        e.type === CombatEventType.ON_KILL  ? '#C86B6B' :
        e.wasCrit                           ? '#E7C66A' :
        e.wasBlocked                        ? '#8C9198' :
                                              '#D6DBE3';
      parts.push(`<div style="margin-top:8px; color:${banner}"><b>${e.type}</b> · ${e.source.id} → ${e.target.id} · ${escapeHtml(e.damageType)} · ${escapeHtml(e.hitType)}${e.targetKilled ? '  · KILLED' : ''}</div>`);
      parts.push('<div style="color:#8C9198">'
        + `base ${fmt(br.baseDamage)} → +added ${fmt(br.addedDamage)} → conv ${fmt(br.afterConversion)}`
        + ` → inc ${fmt(br.afterIncreased)} → more ${fmt(br.afterMore)} → crit ${fmt(br.afterCrit)}`
        + ` → def ${fmt(br.afterDefense)} → res ${fmt(br.afterResistance)}`
        + ` <span style="color:#E1A84A">→ final ${fmt(br.finalDamage)}</span>`
        + '</div>');
      if (e.sourceTags.length) parts.push(`<div style="color:#5E646D">tags: ${e.sourceTags.map(escapeHtml).join(', ')}</div>`);
    }
    this.root.innerHTML = parts.join('');
  }

  private push(e: CombatEvent): void {
    this.log.push(e);
    if (this.log.length > CombatDebugPanel.LOG_CAP) this.log.shift();
    if (this.visibleFlag) this.render();
  }

  private installKeyListener(): void {
    if (this.keyListenerInstalled) return;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F9') {
        e.preventDefault();
        this.toggle();
      }
    });
    this.keyListenerInstalled = true;
  }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toString();
  return n.toFixed(1);
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
