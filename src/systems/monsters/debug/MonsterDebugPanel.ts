import type { MonsterRuntime } from '../ai/AIBase.js';
import type { MonsterDirector } from '../core/MonsterDirector.js';
import { MonsterRole } from '../types/MonsterRole.js';

/**
 * MonsterDebugPanel — F3 toggle.
 *
 * Surfaces:
 *   - Active monster count + role breakdown.
 *   - Elite count + which modifiers are live.
 *   - Local density vs cap.
 *   - Per-monster aggro state + AI think latency.
 */
export class MonsterDebugPanel {
  private readonly root: HTMLElement;
  private getMonsters: () => readonly MonsterRuntime[] = () => [];
  private director: MonsterDirector | null = null;
  private visibleFlag = false;
  private keyListenerInstalled = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'monsterDebugPanel';
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '520px',
      maxHeight: '92vh',
      overflowY: 'auto',
      background: 'rgba(7, 9, 13, 0.94)',
      border: '1px solid #3A4048',
      color: '#BFC5CE',
      fontFamily: 'monospace, "Pixelify Sans"',
      fontSize: '11px',
      lineHeight: '1.45',
      padding: '10px 12px',
      zIndex: '9999',
      display: 'none',
      pointerEvents: 'auto',
    });
    document.body.appendChild(this.root);
    this.installKeyListener();
  }

  attach(director: MonsterDirector, getMonsters: () => readonly MonsterRuntime[]): void {
    this.director = director;
    this.getMonsters = getMonsters;
  }

  isVisible(): boolean { return this.visibleFlag; }

  toggle(): void {
    this.visibleFlag = !this.visibleFlag;
    this.root.style.display = this.visibleFlag ? 'block' : 'none';
    if (this.visibleFlag) this.render();
  }

  render(): void {
    const now = performance.now();
    const list = this.getMonsters();
    const counts: Record<string, number> = {};
    let eliteCount = 0;
    let aggroed = 0;
    const eliteMods: Record<string, number> = {};
    for (const m of list) {
      if (!m.alive) continue;
      counts[m.definition.role] = (counts[m.definition.role] ?? 0) + 1;
      if (m.eliteModifierIds.length > 0) {
        eliteCount++;
        for (const id of m.eliteModifierIds) eliteMods[id] = (eliteMods[id] ?? 0) + 1;
      }
      if (now < m.aggroUntil) aggroed++;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const parts: string[] = [];
    parts.push('<div style="color:#E1A84A; font-weight:700; letter-spacing:1px">MONSTER DEBUG  ·  F3 to close</div>');
    parts.push(`<div style="margin:4px 0 8px 0; color:#8C9198">active: <b>${total}</b>  ·  aggroed: <b>${aggroed}</b>  ·  elite: <b>${eliteCount}</b></div>`);
    parts.push('<div style="color:#D6DBE3">Role breakdown:</div>');
    for (const role of Object.keys(MonsterRole) as Array<keyof typeof MonsterRole>) {
      const v = MonsterRole[role];
      const c = counts[v] ?? 0;
      const pct = total > 0 ? ((c / total) * 100).toFixed(0) : '0';
      parts.push(`<div style="color:#8C9198">  ${v.padEnd(9)} ${c.toString().padStart(2)}  (${pct}%)</div>`);
    }
    if (eliteCount > 0) {
      parts.push('<div style="margin-top:6px; color:#D6DBE3">Elite modifiers in play:</div>');
      for (const id of Object.keys(eliteMods)) {
        parts.push(`<div style="color:#E7C66A">  ${id}  × ${eliteMods[id]}</div>`);
      }
    }
    parts.push('<div style="margin-top:8px; color:#5E646D">F3 again to hide. Density / pacing live inside MonsterDirector.</div>');
    this.root.innerHTML = parts.join('');
  }

  private installKeyListener(): void {
    if (this.keyListenerInstalled) return;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
    this.keyListenerInstalled = true;
  }
}
