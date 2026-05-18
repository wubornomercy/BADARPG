import type { SkillManager } from '../core/SkillManager.js';
import { SkillEventType } from '../events/SkillEventType.js';
import { CastFailReason } from '../types/SkillCastResult.js';

/**
 * SkillDebugPanel — developer-only HTML overlay (F10 toggle).
 *
 * Streams the recent cast log + live state of cooldowns, projectiles,
 * active casts, and scheduled effects.
 */
interface LogEntry {
  ts: number;
  text: string;
  color: string;
}

export class SkillDebugPanel {
  private readonly root: HTMLElement;
  private manager: SkillManager | null = null;
  private visibleFlag = false;
  private keyListenerInstalled = false;
  private readonly log: LogEntry[] = [];
  private static readonly LOG_CAP = 32;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'skillDebugPanel';
    Object.assign(this.root.style, {
      position:      'fixed',
      bottom:        '12px',
      right:         '12px',
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

  attach(manager: SkillManager): void {
    this.manager = manager;
    manager.events.on(SkillEventType.ON_SKILL_CAST, (e) => {
      this.push(`CAST  ${e.skill.id}  depth=${e.chainDepth}`, '#D6DBE3');
    });
    manager.events.on(SkillEventType.ON_SKILL_TRIGGER, (e) => {
      this.push(`TRIGGER ${e.skill.id} via ${e.triggerSource}`, '#E7C66A');
    });
    manager.events.on(SkillEventType.ON_SKILL_KILL, (e) => {
      this.push(`KILL  ${e.skill.id} → ${e.target?.id}`, '#C86B6B');
    });
  }

  /** Public hook for main.ts to log cast failures (e.g. INSUFFICIENT_MANA). */
  logCastFailure(skillId: string, reason: CastFailReason): void {
    this.push(`FAIL  ${skillId}  ${reason}`, '#C86B6B');
  }

  isVisible(): boolean { return this.visibleFlag; }

  toggle(): void {
    this.visibleFlag = !this.visibleFlag;
    this.root.style.display = this.visibleFlag ? 'block' : 'none';
    if (this.visibleFlag) this.render();
  }

  render(): void {
    if (!this.manager) {
      this.root.innerHTML = '<b style="color:#E1A84A">SKILL DEBUG</b><br/>No SkillManager attached.';
      return;
    }
    const m = this.manager;
    const now = performance.now();
    const cds = m.cooldowns.snapshot(now);
    const cdRows = Object.keys(cds)
      .sort()
      .map((id) => `<div style="color:#8C9198">  ${id}  <span style="color:#E7C66A">${(cds[id] / 1000).toFixed(2)}s</span></div>`)
      .join('') || '<div style="color:#5E646D">  (none)</div>';

    const parts: string[] = [];
    parts.push('<div style="color:#E1A84A; font-weight:700; letter-spacing:1px">SKILL DEBUG  ·  F10 to close</div>');
    parts.push(`<div style="margin:6px 0; color:#D6DBE3">Projectiles: <b>${m.projectiles.count()}</b>  ·  Active casts: <b>${m.executor.activeCastCount()}</b>  ·  Scheduled ticks: <b>${m.executor.scheduledCount()}</b></div>`);
    parts.push('<div style="color:#D6DBE3; margin-top:6px">Cooldowns:</div>');
    parts.push(cdRows);
    parts.push('<div style="color:#D6DBE3; margin-top:10px">Recent events:</div>');
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i];
      parts.push(`<div style="color:${e.color}">  ${formatTime(now - e.ts)} ago · ${escapeHtml(e.text)}</div>`);
    }
    this.root.innerHTML = parts.join('');
  }

  private push(text: string, color: string): void {
    this.log.push({ ts: performance.now(), text, color });
    if (this.log.length > SkillDebugPanel.LOG_CAP) this.log.shift();
    if (this.visibleFlag) this.render();
  }

  private installKeyListener(): void {
    if (this.keyListenerInstalled) return;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F10') {
        e.preventDefault();
        this.toggle();
      }
    });
    this.keyListenerInstalled = true;
  }
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
