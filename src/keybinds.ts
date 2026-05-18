/**
 * Keybind registry — central source of truth for all user-rebindable
 * actions. Defaults defined here, user overrides persisted to
 * localStorage under 'badarpg.keybinds.v1'.
 *
 * Mouse actions use the sentinel strings 'LMB' and 'RMB' (event.button 0/2).
 * Keyboard actions use lowercase variants of event.code:
 *   'space', 'shiftleft', 'keyq', 'keyw', 'digit1' etc.
 */

export type ActionId =
  | 'move'        // LMB by default
  | 'primary'     // RMB by default
  | 'dodge'       // Space
  | 'skill1'      // Q
  | 'skill2'      // W
  | 'skill3'      // E
  | 'skill4'      // R
  | 'skill5'      // T
  | 'util1'       // 1
  | 'util2'       // 2
  | 'openInventory' // I
  | 'openCharacter' // C
  | 'openSkill'     // K
  | 'menuBack';   // Escape

export interface BindingInfo {
  action: ActionId;
  label: string;
  current: string;     // current binding (key code or 'LMB' / 'RMB')
  default: string;
}

const DEFAULTS: Record<ActionId, { label: string; key: string }> = {
  move:           { label: '移动',          key: 'LMB' },
  primary:        { label: '主攻击',         key: 'RMB' },
  dodge:          { label: '翻滚',          key: 'Space' },
  skill1:         { label: '技能 1',        key: 'KeyQ' },
  skill2:         { label: '技能 2',        key: 'KeyW' },
  skill3:         { label: '技能 3',        key: 'KeyE' },
  skill4:         { label: '技能 4',        key: 'KeyR' },
  skill5:         { label: '技能 5',        key: 'KeyT' },
  util1:          { label: '工具 1',        key: 'Digit1' },
  util2:          { label: '工具 2',        key: 'Digit2' },
  openInventory:  { label: '打开背包',       key: 'KeyI' },
  openCharacter:  { label: '打开角色',       key: 'KeyC' },
  openSkill:      { label: '打开技能',       key: 'KeyK' },
  menuBack:       { label: '返回菜单 / 关闭', key: 'Escape' },
};

const STORAGE_KEY = 'badarpg.keybinds.v1';

let bindings: Record<ActionId, string> = loadBindings();

function loadBindings(): Record<ActionId, string> {
  const out: Record<ActionId, string> = {} as any;
  for (const id of Object.keys(DEFAULTS) as ActionId[]) {
    out[id] = DEFAULTS[id].key;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Record<ActionId, string>>;
      for (const k of Object.keys(saved) as ActionId[]) {
        if (DEFAULTS[k]) out[k] = saved[k]!;
      }
    }
  } catch {}
  return out;
}

function saveBindings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {}
}

export function getBinding(action: ActionId): string {
  return bindings[action];
}

export function setBinding(action: ActionId, key: string) {
  bindings[action] = key;
  saveBindings();
  for (const fn of changeListeners) fn(action, key);
}

export function resetBindings() {
  for (const id of Object.keys(DEFAULTS) as ActionId[]) {
    bindings[id] = DEFAULTS[id].key;
  }
  saveBindings();
  for (const fn of changeListeners) fn('move', bindings.move);
}

export function listBindings(): BindingInfo[] {
  return (Object.keys(DEFAULTS) as ActionId[]).map(id => ({
    action: id,
    label: DEFAULTS[id].label,
    current: bindings[id],
    default: DEFAULTS[id].key,
  }));
}

export function defaultBindingFor(action: ActionId): string {
  return DEFAULTS[action].key;
}

/** Display-friendly version of a key code: 'KeyQ' -> 'Q', 'ShiftLeft' -> 'Shift', etc. */
export function displayKey(k: string): string {
  if (k === 'LMB' || k === 'RMB' || k === 'MMB') return k;
  if (k === 'Space') return 'Space';
  if (k === 'Escape') return 'Esc';
  if (k.startsWith('Key'))   return k.slice(3);
  if (k.startsWith('Digit')) return k.slice(5);
  if (k === 'ShiftLeft' || k === 'ShiftRight') return 'Shift';
  if (k === 'ControlLeft' || k === 'ControlRight') return 'Ctrl';
  if (k === 'AltLeft' || k === 'AltRight') return 'Alt';
  if (k.startsWith('Arrow')) return k.slice(5) + ' 方向键';
  return k;
}

// =========================================================================
// Change listeners — so HUD slot labels can update when user rebinds
// =========================================================================
const changeListeners: ((action: ActionId, newKey: string) => void)[] = [];

export function onBindingChange(fn: (action: ActionId, newKey: string) => void) {
  changeListeners.push(fn);
}
