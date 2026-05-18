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

const SKILL_LIST: { name: string; tags: string; meta: string; icon: string; selected?: boolean; be?: boolean }[] = [
  { name: '毒蚀爆发', tags: '毒素 · 投射物 · 触发',   meta: '冷却 8 秒 · 法力 32',  icon: '毒', selected: true,  be: true  },
  { name: '弹射射击', tags: '弹射 · 投射物 · 暴击',   meta: '冷却 0.4 秒 · 法力 8', icon: '弹', be: true  },
  { name: '尸蚀触发', tags: '触发 · 腐化 · 毒素',     meta: '冷却 被动 / 即时 · 法力 0', icon: '蚀', be: true },
  { name: '腐化箭矢', tags: '腐化 · 投射物 · 暴击',   meta: '冷却 1.2 秒 · 法力 24', icon: '噬' },
  { name: '幻影齐射', tags: '暴击 · 投射物 · 触发',   meta: '冷却 4 秒 · 法力 48',  icon: '影' },
  { name: '虚空狩猎', tags: '腐化 · 触发',             meta: '冷却 12 秒 · 法力 60', icon: '虚' },
  { name: '连锁风暴', tags: '弹射 · 暴击',             meta: '冷却 6 秒 · 法力 40',  icon: '雷' },
];

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

  // Skill list
  const $skill = document.getElementById('skillList');
  if ($skill) {
    $skill.innerHTML = SKILL_LIST.map(s => {
      const cls = ['skill-item'];
      if (s.selected) cls.push('is-selected');
      if (s.be) cls.push('is-in-build');
      return `<div class="${cls.join(' ')}">
        <div class="skill-item-icon"><span class="skill-icon-glyph">${s.icon}</span></div>
        <div class="skill-item-info">
          <div class="skill-item-name">${s.name}</div>
          <div class="skill-item-tags">${s.tags}</div>
          <div class="skill-item-meta">${s.meta}</div>
        </div>
        <div class="skill-item-affinity">◆</div>
      </div>`;
    }).join('');
  }
}
