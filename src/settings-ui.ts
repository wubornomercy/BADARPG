/**
 * Settings panel UI wiring — populates the keybind list, handles tab
 * switching, capture-next-key rebind flow, and "reset to defaults".
 * Also updates HUD skill-bar slot labels live when keys change.
 */
import {
  listBindings, setBinding, resetBindings, defaultBindingFor,
  displayKey, onBindingChange, type ActionId,
} from './keybinds.js';

let listening: { action: ActionId, btn: HTMLButtonElement } | null = null;

/** One-time wiring on app start. */
export function initSettingsUI() {
  // Tab switching
  document.querySelectorAll('.settings-tab').forEach(t => {
    t.addEventListener('click', () => {
      const tab = (t as HTMLElement).dataset.tab!;
      document.querySelectorAll('.settings-tab').forEach(b => b.classList.toggle('is-active', b === t));
      document.querySelectorAll('.settings-content').forEach(c => {
        const match = (c as HTMLElement).dataset.tab === tab;
        (c as HTMLElement).hidden = !match;
      });
    });
  });

  // Reset all
  document.getElementById('keybindReset')?.addEventListener('click', () => {
    if (!confirmReset()) return;
    resetBindings();
    renderKeybindList();
    updateHudSlotLabels();
  });

  // Capture key during rebind
  window.addEventListener('keydown', (e) => {
    if (!listening) return;
    if (e.code === 'Escape') {
      cancelListen();
      return;
    }
    e.preventDefault();
    setBinding(listening.action, e.code);
    cancelListen();
    renderKeybindList();
    updateHudSlotLabels();
  }, { capture: true });

  // Capture mouse during rebind (for LMB/RMB rebindable to keys, or vice versa)
  window.addEventListener('mousedown', (e) => {
    if (!listening) return;
    // Only allow mouse rebind for actions that already use mouse (move/primary)
    const action = listening.action;
    if (action === 'move' || action === 'primary') {
      const key = e.button === 0 ? 'LMB' : e.button === 2 ? 'RMB' : 'MMB';
      e.preventDefault();
      setBinding(action, key);
      cancelListen();
      renderKeybindList();
      updateHudSlotLabels();
    }
  }, { capture: true });

  // Initial render
  renderKeybindList();

  // Subscribe to keep HUD labels in sync
  onBindingChange(() => updateHudSlotLabels());

  // First label sync (in case loaded from localStorage already)
  updateHudSlotLabels();
}

function renderKeybindList() {
  const host = document.getElementById('keybindList');
  if (!host) return;
  host.innerHTML = listBindings().map(b => `
    <div class="keybind-row" data-action="${b.action}">
      <span class="keybind-label">${b.label}</span>
      <span class="keybind-key">${displayKey(b.current)}</span>
      <button class="keybind-rebind" data-action="${b.action}">重新绑定</button>
    </div>
  `).join('');

  host.querySelectorAll<HTMLButtonElement>('.keybind-rebind').forEach(btn => {
    btn.addEventListener('click', () => {
      // Cancel any prior listen
      if (listening) cancelListen();
      btn.classList.add('is-listening');
      btn.textContent = '按任意键...';
      listening = { action: btn.dataset.action as ActionId, btn };
    });
  });
}

function cancelListen() {
  if (!listening) return;
  listening.btn.classList.remove('is-listening');
  listening.btn.textContent = '重新绑定';
  listening = null;
}

function confirmReset(): boolean {
  // In a real game this'd be a confirmation modal; for V1 just window.confirm
  return window.confirm('重置所有按键为默认值？');
}

/** Update the HUD skill bar slot key labels based on current bindings. */
function updateHudSlotLabels() {
  const map: Record<string, ActionId> = {
    dodge: 'dodge', primary: 'primary',
    skill1: 'skill1', skill2: 'skill2', skill3: 'skill3', skill4: 'skill4', skill5: 'skill5',
    util1: 'util1',  util2: 'util2',
  };
  document.querySelectorAll<HTMLElement>('.hud-skill-bar .slot').forEach(slot => {
    const bind = slot.dataset.keybind;
    if (!bind || !(bind in map)) return;
    const action = map[bind];
    const keySpan = slot.querySelector<HTMLElement>('.slot-key');
    if (!keySpan) return;
    keySpan.textContent = displayKey(getBindingForSlot(action));
  });
}
function getBindingForSlot(action: ActionId): string {
  // Pulled from defaults via keybinds module
  const list = listBindings();
  const entry = list.find(b => b.action === action);
  return entry ? entry.current : defaultBindingFor(action);
}

/** Public: also exported so main.ts can sync after manual setBinding. */
export function syncHudFromBindings() { updateHudSlotLabels(); }
