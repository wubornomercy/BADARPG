/**
 * Panel stubs — populate the static HTML structures in index.html with
 * sample items / skills so panels feel "alive" when the player opens
 * them mid-combat. Phase 2A V1 prototype only — full data wiring is a
 * follow-up commit.
 */

const EQUIP_SLOTS: { key: string; label: string; icon: string; rarity: string; be: boolean }[] = [
  { key: 'weapon',  label: '武器',  icon: '弓', rarity: 'legendary', be: true },
  { key: 'helmet',  label: '头盔',  icon: '冠', rarity: 'magic',     be: false },
  { key: 'chest',   label: '胸甲',  icon: '甲', rarity: 'rare',      be: false },
  { key: 'gloves',  label: '手套',  icon: '锁', rarity: 'rare',      be: false },
  { key: 'boots',   label: '战靴',  icon: '靴', rarity: 'rare',      be: false },
  { key: 'amulet',  label: '护符',  icon: '符', rarity: 'rare',      be: false },
  { key: 'ring1',   label: '戒指1', icon: '环', rarity: 'magic',     be: false },
  { key: 'ring2',   label: '戒指2', icon: '',  rarity: '',          be: false },
];

const GRID_ITEMS: { icon: string; rarity: string; be: boolean }[] = [
  { icon: '弓', rarity: 'normal', be: false },
  { icon: '匕', rarity: 'normal', be: false },
  { icon: '盾', rarity: 'normal', be: false },
  { icon: '袍', rarity: 'normal', be: false },
  { icon: '腕', rarity: 'normal', be: false },
  { icon: '腕', rarity: 'magic',  be: false },
  { icon: '匕', rarity: 'magic',  be: false },
  { icon: '杖', rarity: 'magic',  be: false },
  { icon: '环', rarity: 'legendary', be: false },
  { icon: '印', rarity: 'magic',  be: false },
  { icon: '带', rarity: 'magic',  be: false },
  { icon: '甲', rarity: 'magic',  be: false },
  { icon: '微', rarity: 'rare',   be: false },
  { icon: '盾', rarity: 'rare',   be: false },
  { icon: '符', rarity: 'rare',   be: false },
  { icon: '环', rarity: 'rare',   be: false },
  { icon: '环', rarity: 'heaven', be: false },
  { icon: '靴', rarity: 'rare',   be: false },
  { icon: '剑', rarity: 'rare',   be: false },
  { icon: '环', rarity: 'rare',   be: false },
  { icon: '弓', rarity: 'legendary', be: true },
  { icon: '心', rarity: 'legendary', be: true },
  { icon: '冠', rarity: 'legendary', be: true },
  { icon: '锤', rarity: 'legendary', be: true },
  { icon: '烬', rarity: 'heaven', be: true },
  { icon: '星', rarity: 'heaven', be: true },
];

// Skill list moved to src/panels/skillPanel.ts where it reads from the
// real SkillManager registry (STARTER_SKILLS). The block below now only
// owns equipment + inventory grid placeholders.

export function populatePanels() {
  // Equipment grid
  const $equip = document.getElementById('equipGrid');
  if ($equip) {
    $equip.innerHTML = EQUIP_SLOTS.map(s => {
      const cls = ['inv-slot', 'is-equip'];
      const hasItem = s.icon !== '';
      if (hasItem) cls.push('has-item', `rarity-${s.rarity}`);
      if (s.be) cls.push('is-build-enabling');
      const inner = hasItem
        ? `<span class="inv-slot-icon">${s.icon}</span>${s.be ? '<span class="inv-slot-be-marker">◆</span>' : ''}`
        : `<span class="inv-slot-type-label">${s.label}</span>`;
      return `<div class="${cls.join(' ')}">${inner}</div>`;
    }).join('');
  }

  // Inventory grid (60 slots = 26 filled + 34 empty)
  const $grid = document.getElementById('invGrid');
  if ($grid) {
    let html = '';
    for (let i = 0; i < 60; i++) {
      if (i < GRID_ITEMS.length) {
        const it = GRID_ITEMS[i];
        const cls = ['inv-slot', 'has-item', `rarity-${it.rarity}`];
        if (it.be) cls.push('is-build-enabling');
        html += `<div class="${cls.join(' ')}">
          <span class="inv-slot-icon">${it.icon}</span>
          ${it.be ? '<span class="inv-slot-be-marker">◆</span>' : ''}
        </div>`;
      } else {
        html += `<div class="inv-slot"></div>`;
      }
    }
    $grid.innerHTML = html;
  }

  // Skill list now populated by src/panels/skillPanel.ts after main.ts
  // calls initSkillPanel(skillManager). This stub no longer touches
  // #skillList / #skillDetailCol / #skillSynergyCol / #skillBottom.
}
