/* =============================================================
   BAD ARPG — Inventory Prototype Runtime
   Responsibilities (V1):
     1. Fit-to-window scaling
     2. Item data + render of 60-slot grid and 8-slot equipment
     3. Hover → floating tooltip (TOOLTIP_SYSTEM_V1) + preview panel update
     4. Click → select (gold pixel edge) + preview lock
     5. Filter tabs: All / Weapons / Armor / Accessories / Materials
     6. Drag simulation (mouse-follow ghost; not a real drop yet)
     7. Action button stubs (Equip / Salvage / Drop)
   No gameplay backend — blueprint validation only.
   ============================================================= */
(function () {
  'use strict';

  const CANVAS_W = 1920, CANVAS_H = 1080;
  const canvas = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');

  /* ---------- 1. Fit-to-window scaling ---------- */
  function fit() {
    const s = Math.min(viewport.clientWidth / CANVAS_W,
                       viewport.clientHeight / CANVAS_H);
    canvas.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  /* =============================================================
     2. Item Data
     Categories: weapon, armor (helmet, chest, gloves, boots),
                 accessory (ring, amulet), material
     Rarities: normal, magic, rare, legendary, heaven
     buildEnabling: true on items with Tier 1 affixes
     tags identify build interaction (poison/crit/ricochet/trigger/corruption)
     ============================================================= */
  const ITEMS = [
    // ===== Normal — 8 =====
    { id: 'i01', name: '锈裂短弓',      type: '猎人弓',    rarity: 'normal',    icon: '弓', cat: 'weapon',    slot: 'weapon', dmg: '12-24', tags: [] },
    { id: 'i02', name: '残破斗篷',      type: '布甲',     rarity: 'normal',    icon: '袍', cat: 'armor',     slot: 'chest', def: 18, tags: [] },
    { id: 'i03', name: '磨损战靴',      type: '皮靴',     rarity: 'normal',    icon: '靴', cat: 'armor',     slot: 'boots', def: 8, tags: [] },
    { id: 'i04', name: '锈蚀匕首',      type: '匕首',     rarity: 'normal',    icon: '匕', cat: 'weapon',    slot: 'weapon', dmg: '8-16', tags: [] },
    { id: 'i05', name: '裂痕圆盾',      type: '木盾',     rarity: 'normal',    icon: '盾', cat: 'armor',     slot: 'offhand', def: 22, tags: [] },
    { id: 'i06', name: '褪色护符',      type: '护符',     rarity: 'normal',    icon: '符', cat: 'accessory', slot: 'amulet', tags: [] },
    { id: 'i07', name: '木质护腕',      type: '皮甲手套',  rarity: 'normal',    icon: '腕', cat: 'armor',     slot: 'gloves', def: 6, tags: [] },
    { id: 'i08', name: '旅人之环',      type: '银环',     rarity: 'normal',    icon: '环', cat: 'accessory', slot: 'ring',  tags: [] },

    // ===== Magic — 8 =====
    { id: 'i09', name: '精巧·活力之冠',  type: '皮革兜帽',  rarity: 'magic',     icon: '冠', cat: 'armor',     slot: 'helmet', def: 24, affixes: ['14% 暴击率','8% 施法速度'], tags: ['crit'] },
    { id: 'i10', name: '潜行者·疾速护腕', type: '皮革护腕', rarity: 'magic',     icon: '腕', cat: 'armor',     slot: 'gloves', def: 16, affixes: ['12% 攻击速度','6% 移动速度'], tags: [] },
    { id: 'i11', name: '法师·心智印记',  type: '青铜印记',  rarity: 'magic',     icon: '印', cat: 'accessory', slot: 'amulet', affixes: ['18% 法力上限','+8 智力'], tags: [] },
    { id: 'i12', name: '誓约·耐力之带',  type: '铁腰带',   rarity: 'magic',     icon: '带', cat: 'armor',     slot: 'belt',   affixes: ['22 生命','11% 耐力'], tags: [] },
    { id: 'i13', name: '暴击之环',      type: '银环',     rarity: 'magic',     icon: '环', cat: 'accessory', slot: 'ring',   affixes: ['9% 暴击率','5% 暴击伤害'], tags: ['crit'] },
    { id: 'i14', name: '致毒匕首',      type: '匕首',     rarity: 'magic',     icon: '匕', cat: 'weapon',    slot: 'weapon', dmg: '14-26', affixes: ['每秒 6 毒素伤害','8% 毒素几率'], tags: ['poison'] },
    { id: 'i15', name: '黑铁胸甲',      type: '板甲',     rarity: 'magic',     icon: '甲', cat: 'armor',     slot: 'chest',  def: 48, affixes: ['32 生命','12% 火焰抗性'], tags: [] },
    { id: 'i16', name: '引焰之杖',      type: '法杖',     rarity: 'magic',     icon: '杖', cat: 'weapon',    slot: 'weapon', dmg: '18-30', affixes: ['18% 火焰伤害','10% 暴击伤害'], tags: ['crit'] },

    // ===== Rare — 8 =====
    { id: 'i17', name: '掠夺者之锁手',   type: '钢铁锁手',  rarity: 'rare',      icon: '锁', cat: 'armor',     slot: 'gloves', def: 38, affixes: ['18% 攻击速度','14% 暴击伤害','24 生命','16% 火焰抗性'], tags: ['crit'] },
    { id: 'i18', name: '咒缚之徽',      type: '黑曜石徽章', rarity: 'rare',      icon: '徽', cat: 'accessory', slot: 'amulet', affixes: ['+18 智力','15% 法力上限','12% 元素抗性','8% 移动速度'], tags: [] },
    { id: 'i19', name: '冷钢之盾',      type: '钢盾',     rarity: 'rare',      icon: '盾', cat: 'armor',     slot: 'offhand', def: 56, affixes: ['+45 护甲','22 生命','18% 物理减伤'], tags: [] },
    { id: 'i20', name: '巫约护符',      type: '咒符',     rarity: 'rare',      icon: '符', cat: 'accessory', slot: 'amulet', affixes: ['12% 法术伤害','16% 持续伤害','+22 智力'], tags: ['poison'] },
    { id: 'i21', name: '寒铁短剑',      type: '短剑',     rarity: 'rare',      icon: '剑', cat: 'weapon',    slot: 'weapon', dmg: '24-46', affixes: ['16% 冰冷伤害','12% 减速效果','18 力量'], tags: [] },
    { id: 'i22', name: '灰烬战靴',      type: '皮甲战靴',  rarity: 'rare',      icon: '靴', cat: 'armor',     slot: 'boots', def: 28, affixes: ['12% 移动速度','18 闪避值','8% 闪避率'], tags: [] },
    { id: 'i23', name: '血迹之环',      type: '银环',     rarity: 'rare',      icon: '环', cat: 'accessory', slot: 'ring', affixes: ['14% 生命偷取','+24 生命','9% 暴击伤害'], tags: ['crit'] },
    { id: 'i24', name: '风行者皮甲',     type: '皮甲',     rarity: 'rare',      icon: '甲', cat: 'armor',     slot: 'chest', def: 64, affixes: ['10% 移动速度','42 生命','12% 闪避率','18% 风暴抗性'], tags: [] },

    // ===== Legendary — 6 (含 build-enabling) =====
    { id: 'i25', name: '召雷者之爪',     type: '猎人弓',    rarity: 'legendary', icon: '弓', cat: 'weapon',    slot: 'weapon', dmg: '68-142',
      buildEnabling: true,
      t1: { name: '弹射连锁', desc: '投射物可向附近敌人弹射多达 4 次。' },
      affixes: ['28% 投射物伤害','16% 暴击率','38 生命'], tags: ['ricochet','crit','projectile'] },
    { id: 'i26', name: '弹射使徒之弓',   type: '猎人弓',    rarity: 'legendary', icon: '弓', cat: 'weapon',    slot: 'weapon', dmg: '62-138',
      buildEnabling: true,
      t1: { name: '使徒齐射', desc: '每次弹射有 25% 几率分裂为 2 个投射物。' },
      affixes: ['24% 投射物伤害','22% 攻击速度','8% 移动速度'], tags: ['ricochet','projectile'] },
    { id: 'i27', name: '遗忘掠夺者之心', type: '腐化护符',  rarity: 'legendary', icon: '心', cat: 'accessory', slot: 'amulet',
      buildEnabling: true,
      t1: { name: '献祭血契', desc: '每损失 5% 生命，所有伤害提高 1%。' },
      affixes: ['+40 力量','22% 暴击伤害'], tags: ['corruption','crit'] },
    { id: 'i28', name: '空王之冠',      type: '钢盔',     rarity: 'legendary', icon: '冠', cat: 'armor',     slot: 'helmet', def: 58,
      buildEnabling: true,
      t1: { name: '虚空触发', desc: '受到致命伤害时，触发你最近使用的技能 (60 秒冷却)。' },
      affixes: ['48 生命','20% 法力上限'], tags: ['trigger'] },
    { id: 'i29', name: '裂世者',        type: '双手锤',    rarity: 'legendary', icon: '锤', cat: 'weapon',    slot: 'weapon', dmg: '88-180',
      buildEnabling: true,
      t1: { name: '腐化共鸣', desc: '腐化层数每增加 1，伤害提高 3%。' },
      affixes: ['+62 力量','12% 攻击速度'], tags: ['corruption'] },
    { id: 'i30', name: '月相戒指',      type: '银环',     rarity: 'legendary', icon: '环', cat: 'accessory', slot: 'ring',
      affixes: ['12% 元素伤害','+30 智力','+30 敏捷','18% 全抗性'], tags: [] },

    // ===== Heaven — 3 =====
    { id: 'i31', name: '蛇毒之环',      type: '神话戒指',  rarity: 'heaven',    icon: '环', cat: 'accessory', slot: 'ring',
      buildEnabling: true,
      t1: { name: '蛇毒绽放', desc: '暴击会向 6 米内所有敌人散布毒素。' },
      t1b: { name: '尸蚀触发', desc: '击杀中毒敌人时以 60% 强度触发你最近使用的技能。' },
      affixes: ['28% 暴击率','24% 毒素伤害'], tags: ['poison','crit','trigger','corruption'] },
    { id: 'i32', name: '不灭之烬',      type: '神话护符',  rarity: 'heaven',    icon: '烬', cat: 'accessory', slot: 'amulet',
      buildEnabling: true,
      t1: { name: '至光誓言', desc: '死亡前的最后一击必定暴击，并触发所有已激活技能。' },
      affixes: ['25% 暴击率','25% 暴击伤害','+30 全抗性'], tags: ['crit','trigger'] },
    { id: 'i33', name: '最末之星',      type: '神话护符',  rarity: 'heaven',    icon: '星', cat: 'accessory', slot: 'amulet',
      buildEnabling: true,
      t1: { name: '星辉触发', desc: '每使用 4 个不同技能后，下一次施法获得 +200% 伤害。' },
      affixes: ['+40 智力','30% 法力上限'], tags: ['trigger'] },

    // ===== Material — 2 stacks =====
    { id: 'i34', name: '冷铁矿石',      type: '工艺材料',  rarity: 'normal',    icon: '矿', cat: 'material',  stack: 47,  tags: [] },
    { id: 'i35', name: '腐化结晶',      type: '工艺材料',  rarity: 'magic',     icon: '晶', cat: 'material',  stack: 12,  tags: ['corruption'] },
  ];

  /* Equipment loadout — references item ids */
  const EQUIPPED = {
    weapon:  'i25',  /* 召雷者之爪 */
    helmet:  'i09',  /* 精巧·活力之冠 */
    chest:   'i24',  /* 风行者皮甲 */
    gloves:  'i17',  /* 掠夺者之锁手 */
    boots:   'i22',  /* 灰烬战靴 */
    amulet:  'i20',  /* 巫约护符 */
    ring1:   'i13',  /* 暴击之环 */
    ring2:   null,   /* empty for demo */
  };

  /* Inventory layout — 60 slots; some empty.
     Distribution shows occupied/empty balance for "clean inventory" feel. */
  const GRID_LAYOUT = [
    // row 1
    'i01','i04','i05','i02','i07', null, 'i10','i14','i16','i30',
    // row 2
    'i11','i12','i15','i18','i19', null, null, 'i06','i08','i31',
    // row 3
    'i21','i23','i26','i27','i28', 'i29','i32','i33', null, null,
    // row 4
    'i03', null, null, null, null,  null, null, null, null, null,
    // row 5
    'i34','i35', null, null, null,  null, null, null, null, null,
    // row 6
    null, null, null, null, null,   null, null, null, null, null,
  ];

  const TAG_DISPLAY = {
    poison:'毒素', crit:'暴击', ricochet:'弹射',
    trigger:'触发', corruption:'腐化', projectile:'投射物',
  };

  /* =============================================================
     3. State + lookup
     ============================================================= */
  const itemById = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  let selectedSlot = null;   // DOM element of currently selected inventory slot
  let activeFilter = 'all';

  /* =============================================================
     4. Render
     ============================================================= */
  const $equipment = document.getElementById('invEquipment');
  const $grid      = document.getElementById('invGrid');
  const $preview   = document.getElementById('invPreview');
  const $equipCount = document.getElementById('equipCount');
  const $gridCount  = document.getElementById('gridCount');
  const $previewState = document.getElementById('previewState');

  const EQUIP_SLOT_ORDER = [
    { key: 'weapon',  label: '武器' },
    { key: 'helmet',  label: '头盔' },
    { key: 'chest',   label: '胸甲' },
    { key: 'gloves',  label: '手套' },
    { key: 'boots',   label: '战靴' },
    { key: 'amulet',  label: '护符' },
    { key: 'ring1',   label: '戒指1' },
    { key: 'ring2',   label: '戒指2' },
  ];

  function renderEquipment() {
    $equipment.innerHTML = '';
    let filled = 0;
    EQUIP_SLOT_ORDER.forEach(({ key, label }) => {
      const itemId = EQUIPPED[key];
      const item = itemId ? itemById[itemId] : null;
      const el = makeSlotEl({ item, isEquip: true, slotKey: key, slotLabel: label });
      $equipment.appendChild(el);
      if (item) filled++;
    });
    $equipCount.textContent = `${filled} / 8`;
  }

  function renderGrid() {
    $grid.innerHTML = '';
    let filled = 0;
    GRID_LAYOUT.forEach((itemId, idx) => {
      const item = itemId ? itemById[itemId] : null;
      const el = makeSlotEl({ item, gridIndex: idx });
      $grid.appendChild(el);
      if (item) filled++;
    });
    $gridCount.textContent = `${filled} / 60`;
    applyFilter(activeFilter);
  }

  function makeSlotEl({ item, isEquip = false, slotKey, slotLabel, gridIndex }) {
    const el = document.createElement('div');
    el.className = 'inv-slot';
    if (isEquip)              el.classList.add('is-equip');
    if (slotKey)              el.dataset.equipKey = slotKey;
    if (gridIndex != null)    el.dataset.gridIndex = gridIndex;

    if (item) {
      el.classList.add('has-item', `rarity-${item.rarity}`);
      if (item.buildEnabling) el.classList.add('is-build-enabling');
      el.dataset.itemId = item.id;
      el.dataset.cat = item.cat;

      const icon = document.createElement('span');
      icon.className = 'inv-slot-icon';
      icon.textContent = item.icon;
      el.appendChild(icon);

      if (item.buildEnabling) {
        const be = document.createElement('span');
        be.className = 'inv-slot-be-marker';
        be.textContent = '◆';
        el.appendChild(be);
      }
      if (item.stack) {
        const sk = document.createElement('span');
        sk.className = 'inv-slot-stack';
        sk.textContent = item.stack;
        el.appendChild(sk);
      }
    } else if (isEquip) {
      // empty equip — show slot type label below
      const lbl = document.createElement('span');
      lbl.className = 'inv-slot-type-label';
      lbl.textContent = slotLabel || '';
      el.appendChild(lbl);
    }

    bindSlotHandlers(el);
    return el;
  }

  /* =============================================================
     5. Hover + Floating Tooltip (TOOLTIP_SYSTEM_V1 integration)
     ============================================================= */
  const $floater = document.getElementById('floatingTooltip');
  const HOVER_DELAY = 80;
  let hoverTimer = null;
  let activeHoverItemId = null;

  function showFloatingTooltip(item, mouseX, mouseY) {
    $floater.innerHTML = buildTooltipHTML(item);
    positionFloater(mouseX, mouseY);
    $floater.classList.add('is-visible');
  }
  function hideFloatingTooltip() {
    $floater.classList.remove('is-visible');
    activeHoverItemId = null;
  }
  function positionFloater(mouseX, mouseY) {
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    let x = (mouseX - rect.left) * sx + 18;
    let y = (mouseY - rect.top)  * sy + 18;
    const FW = 440, FH = 480;
    if (x + FW > CANVAS_W - 20) x = (mouseX - rect.left) * sx - FW - 18;
    if (y + FH > CANVAS_H - 20) y = CANVAS_H - FH - 20;
    $floater.style.left = Math.max(20, x) + 'px';
    $floater.style.top  = Math.max(20, y) + 'px';
  }

  /* Build a TOOLTIP_SYSTEM_V1-shaped tooltip HTML from item data */
  function buildTooltipHTML(item) {
    const tagsHTML = (item.tags || []).map(t =>
      `<span class="tt-tag tt-tag-${t}">${TAG_DISPLAY[t] || t}</span>`
    ).join('');
    const t1Block = item.t1
      ? `<div class="tt-affix-t1">
           <span class="tt-affix-t1-marker"></span>
           <div>
             <div>
               <span class="tt-affix-t1-name">${item.t1.name}</span>
               <span class="tt-affix-t1-tag">流派核心</span>
             </div>
             <div class="tt-affix-t1-desc">${item.t1.desc}</div>
           </div>
         </div>`
      : '';
    const t1bBlock = item.t1b
      ? `<div class="tt-affix-t1">
           <span class="tt-affix-t1-marker"></span>
           <div>
             <div>
               <span class="tt-affix-t1-name">${item.t1b.name}</span>
               <span class="tt-affix-t1-tag">流派核心</span>
             </div>
             <div class="tt-affix-t1-desc">${item.t1b.desc}</div>
           </div>
         </div>`
      : '';
    const affixesHTML = (item.affixes || []).map(a => `<div class="tt-affix-t2">${a}</div>`).join('');
    const coreHTML = item.dmg
      ? `<span class="tt-core-label">伤害</span><span class="tt-core-val">${item.dmg}</span>`
      : item.def != null
        ? `<span class="tt-core-label">护甲</span><span class="tt-core-val">${item.def}</span>`
        : item.stack
          ? `<span class="tt-core-label">数量</span><span class="tt-core-val">${item.stack}</span>`
          : '';

    return `
      <div class="tooltip tooltip-${item.rarity}">
        <div class="tt-header">
          <div class="tt-name">${item.name}</div>
          <div class="tt-type">${item.type} · ${rarityCN(item.rarity)}</div>
        </div>
        <div class="tt-divider"></div>
        ${coreHTML ? `<div class="tt-core">${coreHTML}</div><div class="tt-divider"></div>` : ''}
        ${(t1Block || t1bBlock || affixesHTML)
          ? `<div class="tt-affixes">${t1Block}${t1bBlock}${affixesHTML}</div><div class="tt-divider"></div>`
          : ''}
        <div class="tt-utility">
          ${tagsHTML ? `<div class="tt-tags">${tagsHTML}</div>` : '<div class="tt-req" style="opacity:0.5">无附加效果</div>'}
        </div>
      </div>
    `;
  }
  function rarityCN(r) {
    return ({ normal:'普通', magic:'魔法', rare:'稀有', legendary:'传奇', heaven:'神圣' })[r] || r;
  }

  /* =============================================================
     6. Right-side preview panel
     ============================================================= */
  function updatePreview(item) {
    if (!item) {
      $preview.innerHTML = `<div class="inv-preview-empty">悬停或选中任意物品<br>即可查看详情</div>`;
      $previewState.textContent = '无选中';
      return;
    }
    $previewState.textContent = rarityCN(item.rarity);

    const t1Lines = [];
    if (item.t1)  t1Lines.push(`◆ ${item.t1.name}`);
    if (item.t1b) t1Lines.push(`◆ ${item.t1b.name}`);

    const tagsHTML = (item.tags || []).map(t =>
      `<span class="tt-tag tt-tag-${t}">${TAG_DISPLAY[t] || t}</span>`
    ).join('');

    // Compare against currently equipped item of same slot type, if any
    let cmpHTML = '';
    const eqItemId = item.slot ? EQUIPPED[item.slot] || (item.slot === 'ring' ? EQUIPPED.ring1 : null) : null;
    const eqItem = eqItemId ? itemById[eqItemId] : null;
    if (eqItem && eqItem.id !== item.id) {
      const dDmg = compareNum(item.dmg, eqItem.dmg);
      const dDef = compareNum(item.def, eqItem.def);
      const lines = [];
      if (dDmg) lines.push(`<div class="inv-preview-cmp-line"><span>伤害</span>${cmpBadge(dDmg)}</div>`);
      if (dDef) lines.push(`<div class="inv-preview-cmp-line"><span>护甲</span>${cmpBadge(dDef)}</div>`);
      if (item.t1 && (!eqItem.t1 || eqItem.t1.name !== item.t1.name)) {
        lines.push(`<div class="inv-preview-cmp-line"><span>流派核心</span><span class="inv-preview-cmp-delta new">变更</span></div>`);
      }
      if (lines.length) {
        cmpHTML = `<div class="inv-preview-section">
          <div class="inv-preview-section-label">对比 · ${rarityCN(eqItem.rarity)} ${eqItem.name}</div>
          ${lines.join('')}
        </div>`;
      }
    }

    $preview.innerHTML = `
      <div class="inv-preview-header">
        <div class="inv-preview-icon">${item.icon}</div>
        <div>
          <div class="inv-preview-name rarity-${item.rarity}">${item.name}</div>
          <div class="inv-preview-type">${item.type} · ${rarityCN(item.rarity)}</div>
        </div>
      </div>

      ${t1Lines.length ? `<div class="inv-preview-section">
        <div class="inv-preview-section-label">流派核心</div>
        ${t1Lines.map(l => `<div class="inv-preview-line t1">${l}</div>`).join('')}
      </div>` : ''}

      ${(item.affixes || []).length ? `<div class="inv-preview-section">
        <div class="inv-preview-section-label">词缀</div>
        ${item.affixes.map(a => `<div class="inv-preview-line">+ ${a}</div>`).join('')}
      </div>` : ''}

      ${tagsHTML ? `<div class="inv-preview-section">
        <div class="inv-preview-section-label">交互标签</div>
        <div class="inv-preview-tags">${tagsHTML}</div>
      </div>` : ''}

      ${cmpHTML}

      <div class="inv-preview-actions">
        <button class="inv-preview-action primary" data-action="equip">装备</button>
        <button class="inv-preview-action" data-action="salvage">分解</button>
        <button class="inv-preview-action danger" data-action="drop">丢弃</button>
      </div>
    `;

    // Bind action buttons
    $preview.querySelectorAll('.inv-preview-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        console.log(`[${action.toUpperCase()}] ${item.id} ${item.name}`);
      });
    });
  }
  function compareNum(newVal, oldVal) {
    if (newVal == null || oldVal == null) return null;
    if (typeof newVal === 'string' && typeof oldVal === 'string') {
      // damage range — compare midpoints
      const mid = s => {
        const [a,b] = s.split('-').map(Number);
        return (a + (b||a)) / 2;
      };
      return mid(newVal) - mid(oldVal);
    }
    return newVal - oldVal;
  }
  function cmpBadge(d) {
    const dir = d > 0 ? 'up' : d < 0 ? 'down' : 'neutral';
    const sign = d > 0 ? '+' : '';
    return `<span class="inv-preview-cmp-delta ${dir}">${sign}${d.toFixed(1)}</span>`;
  }

  /* =============================================================
     7. Slot handlers — hover / click / drag
     ============================================================= */
  function bindSlotHandlers(el) {
    el.addEventListener('mouseenter', (e) => {
      clearTimeout(hoverTimer);
      const id = el.dataset.itemId;
      if (!id) return;
      const item = itemById[id];
      updatePreview(item);
      hoverTimer = setTimeout(() => {
        activeHoverItemId = id;
        showFloatingTooltip(item, e.clientX, e.clientY);
      }, HOVER_DELAY);
    });
    el.addEventListener('mousemove', (e) => {
      if (activeHoverItemId && activeHoverItemId === el.dataset.itemId) {
        positionFloater(e.clientX, e.clientY);
      }
      if (isDragging) updateDragGhost(e.clientX, e.clientY);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      hideFloatingTooltip();
    });
    el.addEventListener('click', (e) => {
      const id = el.dataset.itemId;
      if (!id) return;
      // Select
      if (selectedSlot) selectedSlot.classList.remove('is-selected');
      selectedSlot = el;
      el.classList.add('is-selected');
      updatePreview(itemById[id]);
      console.log(`[SELECT] ${id}`);
    });

    /* Drag simulation — mousedown starts drag, mouseup ends. */
    el.addEventListener('mousedown', (e) => {
      const id = el.dataset.itemId;
      if (!id) return;
      const item = itemById[id];
      startDrag(item, e.clientX, e.clientY);
    });
  }

  /* ---------- Drag simulation ---------- */
  const $ghost = document.getElementById('dragGhost');
  let isDragging = false;
  let dragItem = null;

  function startDrag(item, x, y) {
    isDragging = true;
    dragItem = item;
    $ghost.style.display = 'grid';
    $ghost.textContent = item.icon;
    $ghost.style.color = ({
      normal:'#BFC5CE', magic:'#5A7FCF', rare:'#D2B15A',
      legendary:'#E1A84A', heaven:'#F4F2E8',
    })[item.rarity] || '#BFC5CE';
    updateDragGhost(x, y);
  }
  function updateDragGhost(x, y) {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    $ghost.style.left = ((x - rect.left) * sx - 32) + 'px';
    $ghost.style.top  = ((y - rect.top)  * sy - 32) + 'px';
  }
  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    dragItem = null;
    $ghost.style.display = 'none';
  }
  document.addEventListener('mouseup', endDrag);

  /* =============================================================
     8. Filter tabs
     ============================================================= */
  document.querySelectorAll('.inv-filter-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.inv-filter-tab').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      applyFilter(activeFilter);
    });
  });

  function applyFilter(filter) {
    $grid.querySelectorAll('.inv-slot').forEach((el) => {
      if (filter === 'all') { el.style.opacity = ''; return; }
      const cat = el.dataset.cat;
      if (!cat) { el.style.opacity = '0.18'; return; }
      const match = (filter === 'weapon'    && cat === 'weapon')
                 || (filter === 'armor'     && cat === 'armor')
                 || (filter === 'accessory' && cat === 'accessory')
                 || (filter === 'material'  && cat === 'material');
      el.style.opacity = match ? '' : '0.18';
    });
  }

  /* =============================================================
     9. Misc
     ============================================================= */
  document.getElementById('invClose').addEventListener('click', () => {
    console.log('[CLOSE] would close inventory panel');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('show-grid');
  });

  /* =============================================================
     Boot
     ============================================================= */
  renderEquipment();
  renderGrid();
})();
