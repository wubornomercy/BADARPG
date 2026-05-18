/**
 * Tooltip hover system — bind 80ms-delay hover tooltips on panel slots.
 * Reuses Phase 1 `.tt-floating` + tooltip.css classes (TOOLTIP_SYSTEM_V1).
 *
 * V1 scope: shows simple title + body tooltip with text drawn from
 * the data-* attributes on each slot. Future iterations will pull
 * structured item/skill data via a real model.
 */

const HOVER_DELAY = 80;
let hoverTimer: number | null = null;

let floater: HTMLElement | null = null;

export function initTooltipHover() {
  floater = document.getElementById('floatingTooltip');
  if (!floater) {
    console.warn('[tooltip-hover] #floatingTooltip not found');
    return;
  }

  // Bind hover on every element with data-tip attribute
  // We use event delegation so new elements (e.g. tab switching) also work
  document.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-tip]');
    if (!el) return;
    if (hoverTimer != null) window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => showTip(el, (e as MouseEvent).clientX, (e as MouseEvent).clientY), HOVER_DELAY);
  });
  document.addEventListener('mousemove', (e) => {
    if (!floater?.classList.contains('is-visible')) return;
    positionTip((e as MouseEvent).clientX, (e as MouseEvent).clientY);
  });
  document.addEventListener('mouseout', (e) => {
    const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-tip]');
    if (!el) return;
    if (hoverTimer != null) { window.clearTimeout(hoverTimer); hoverTimer = null; }
    floater?.classList.remove('is-visible');
  });

  // Attach tooltips to existing panel content (populated by panel-stubs)
  attachStaticTips();
}

function showTip(el: HTMLElement, mx: number, my: number) {
  if (!floater) return;
  const tipText = el.dataset.tip || '';
  if (!tipText) return;
  // Parse tipText format: "Title|Body" or just "Body"
  let title = '';
  let body = tipText;
  if (tipText.includes('|')) {
    [title, body] = tipText.split('|', 2);
  }
  // Render minimal tooltip using Phase 1 .tooltip styles
  floater.innerHTML = `
    <div class="tooltip tooltip-normal" style="width: 280px;">
      ${title ? `
        <div class="tt-header"><div class="tt-name" style="font-size:13px;letter-spacing:0.06em;">${escapeHtml(title)}</div></div>
        <div class="tt-divider"></div>
      ` : ''}
      <div class="tt-utility">
        <div class="tt-req" style="font-size:11px;line-height:1.5;color:var(--clr-hud-text);letter-spacing:0.04em;">${escapeHtml(body)}</div>
      </div>
    </div>
  `;
  positionTip(mx, my);
  floater.classList.add('is-visible');
}

function positionTip(mx: number, my: number) {
  if (!floater) return;
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const sx = 1920 / rect.width;
  const sy = 1080 / rect.height;
  let x = (mx - rect.left) * sx + 16;
  let y = (my - rect.top)  * sy + 16;
  if (x + 300 > 1900) x = (mx - rect.left) * sx - 300 - 16;
  if (y + 120 > 1060) y = 1080 - 140;
  floater.style.left = Math.max(20, x) + 'px';
  floater.style.top  = Math.max(20, y) + 'px';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]!);
}

// =========================================================================
// Static tip attachment — for now we annotate panel-stubs' generated HTML
// with synthetic descriptions. Real game will pull from item/skill models.
// =========================================================================
function attachStaticTips() {
  // Equipment slots — slot type + item name
  document.querySelectorAll<HTMLElement>('#equipGrid .inv-slot').forEach((el, i) => {
    const labels = ['武器', '头盔', '胸甲', '手套', '战靴', '护符', '戒指 1', '戒指 2'];
    const items  = ['召雷者之爪 (传奇)', '精巧·活力之冠 (魔法)', '风行者皮甲 (稀有)',
                    '掠夺者之锁手 (稀有)', '灰烬战靴 (稀有)', '巫约护符 (稀有)',
                    '暴击之环 (魔法)', ''];
    const item = items[i] || '';
    el.dataset.tip = item
      ? `${labels[i]}|当前装备：${item}`
      : `${labels[i]}|（未装备）点击物品栏装备此栏位。`;
  });

  // Inventory slots
  document.querySelectorAll<HTMLElement>('#invGrid .inv-slot').forEach((el, i) => {
    if (!el.classList.contains('has-item')) {
      el.dataset.tip = '空格子|此栏位为空。';
      return;
    }
    // generic per-slot description; real impl will read item data
    const r = el.classList.contains('rarity-heaven')    ? '神圣'
           : el.classList.contains('rarity-legendary') ? '传奇'
           : el.classList.contains('rarity-rare')      ? '稀有'
           : el.classList.contains('rarity-magic')     ? '魔法' : '普通';
    el.dataset.tip = `物品 #${i + 1}|稀有度：${r}。点击查看详情，拖拽装备到对应栏位。`;
  });

  // Skill list items
  document.querySelectorAll<HTMLElement>('#skillList .skill-item').forEach((el) => {
    const name = el.querySelector('.skill-item-name')?.textContent?.trim() || '技能';
    const tags = el.querySelector('.skill-item-tags')?.textContent?.trim() || '';
    el.dataset.tip = `${name}|标签：${tags}。点击查看完整 fantasy + 流派交互详情。`;
  });

  // Character stat rows
  document.querySelectorAll<HTMLElement>('.char-stat-row').forEach(el => {
    const lbl = el.querySelector('.char-stat-label')?.textContent?.trim() || '属性';
    const val = el.querySelector('.char-stat-value')?.textContent?.trim() || '';
    el.dataset.tip = `${lbl}|当前数值：${val}。该数值由装备词缀 + 等级加成 + 天赋树计算得出。`;
  });

  // Character mechanics
  document.querySelectorAll<HTMLElement>('.char-mechanic').forEach(el => {
    const name = el.querySelector('.char-mechanic-name')?.textContent?.trim() || '机制';
    const desc = el.querySelector('.char-mechanic-desc')?.textContent?.trim() || '';
    el.dataset.tip = `${name}|${desc}`;
  });

  // Character build tags
  document.querySelectorAll<HTMLElement>('.char-tag').forEach(el => {
    const t = el.textContent?.trim() || '';
    el.dataset.tip = `交互标签 · ${t}|此 build 与 ${t} 类技能 / 词缀产生化学反应。`;
  });

  // HUD skill bar slots
  document.querySelectorAll<HTMLElement>('.hud-skill-bar .slot').forEach(el => {
    const kb = el.dataset.keybind || '';
    const labelMap: Record<string, string> = {
      dodge: '翻滚 — 短距离突进，i-frame 期间无敌',
      primary: '主攻击 — 当前流派的核心攻击技能',
      skill1: '技能槽 1', skill2: '技能槽 2', skill3: '技能槽 3',
      skill4: '技能槽 4', skill5: '技能槽 5',
      util1: '工具槽 1 — 药水 / 投掷物', util2: '工具槽 2',
    };
    el.dataset.tip = (labelMap[kb] || '技能') + '|（未实现）';
  });
}

/** Re-scan and re-attach tooltip tags after dynamic DOM updates. */
export function refreshTooltipTargets() {
  attachStaticTips();
}
