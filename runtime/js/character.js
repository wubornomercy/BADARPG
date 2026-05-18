/* =============================================================
   BAD ARPG — Character Panel Runtime
   Responsibilities (V1):
     1. Fit-to-window scaling
     2. 3 build data definitions: venom / crit / corruption
     3. Render identity / tags / offense / defense / build summary /
        mechanics / corruption / derived stats from the active build
     4. Build switcher buttons (top header)
     5. Stat hover -> floating tooltip (80ms delay, fade 120ms)
     6. Debug: G grid toggle
   ============================================================= */
(function () {
  'use strict';

  const CANVAS_W = 1920, CANVAS_H = 1080;
  const canvas = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');

  /* 1. Fit ---------- */
  function fit() {
    const s = Math.min(viewport.clientWidth / CANVAS_W, viewport.clientHeight / CANVAS_H);
    canvas.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  /* =============================================================
     2. Build data — 3 builds covering the spec test requirement
     ============================================================= */
  const BUILDS = {
    venom: {
      archetype: '猎人',
      level: 14,
      buildName: '毒蚀弹射 / VENOM RICOCHET',
      buildTitle: '毒蚀弹射猎人',
      tags: ['poison', 'crit', 'ricochet'],
      offense: [
        { icon: '◈', label: '暴击率',     value: '28', unit: '%',  key: true,
          tip: '基础暴击率 (装备 16% + 词缀 12%)' },
        { icon: '◈', label: '暴击伤害',   value: '240', unit: '%',
          tip: '暴击造成的伤害乘数' },
        { icon: '◈', label: '投射物数量', value: '4',
          tip: '每次攻击发射的投射物数量 (本体 1 + 弹射连锁 +3)' },
        { icon: '◈', label: '毒素 DPS',   value: '142', unit: '/s', key: true,
          tip: '所有毒素叠加层造成的每秒伤害总和' },
        { icon: '◈', label: '触发几率',   value: '18', unit: '%',
          tip: '暴击时触发尸蚀爆发的几率' },
        { icon: '◈', label: '攻击速度',   value: '1.42', unit: '/s',
          tip: '每秒攻击次数 (基础 1.0 × 加成 142%)' },
      ],
      defense: [
        { icon: '◆', label: '生命',         value: '1,420', key: true,
          tip: '总生命上限 (装备 + 等级加成)' },
        { icon: '◆', label: '护甲',         value: '186',
          tip: '减少物理伤害' },
        { icon: '◆', label: '闪避',         value: '24', unit: '%',
          tip: '完全规避近战和投射物攻击的几率' },
        { icon: '◆', label: '腐化抗性',     value: '18', unit: '%',
          tip: '降低腐化层数累积速度' },
        { icon: '◆', label: '生命偷取',     value: '6', unit: '%',
          tip: '攻击造成伤害的 6% 转化为生命回复' },
      ],
      summary: [
        '投射物连锁向附近敌人散布毒素',
        '暴击触发尸蚀爆发，重新施放最后技能',
        '腐化等级提升毒素扩散范围',
      ],
      mechanics: [
        { name: '蛇毒绽放',     desc: '暴击向 6 米内所有敌人散布毒素层。' },
        { name: '尸蚀触发',     desc: '击杀中毒敌人触发最近技能，强度 60%。' },
        { name: '弹射连锁',     desc: '投射物可向附近敌人弹射多达 4 次。' },
      ],
      corruption: {
        level: 3, levelMax: 10,
        instability: 12,
        mutations: [
          { kind: 'up',   text: '毒素伤害 +24%' },
          { kind: 'down', text: '物理减伤 −12%' },
        ],
      },
      derived: [
        { label: 'DPS',         value: '2,840', key: true },
        { label: '有效生命',     value: '1,720' },
        { label: '毒层 / 秒',    value: '4.8',   key: true },
        { label: '触发 / 秒',    value: '1.2' },
      ],
    },

    crit: {
      archetype: '猎人',
      level: 18,
      buildName: '暴击触发 / CRIT TRIGGER',
      buildTitle: '暴击触发猎人',
      tags: ['crit', 'trigger', 'projectile'],
      offense: [
        { icon: '◈', label: '暴击率',     value: '64', unit: '%',  key: true,
          tip: '基础 + 装备 + 天赋树加成' },
        { icon: '◈', label: '暴击伤害',   value: '360', unit: '%', key: true,
          tip: '暴击伤害乘数' },
        { icon: '◈', label: '投射物数量', value: '6',
          tip: '本体 1 + 词缀 +2 + 触发分裂 +3' },
        { icon: '◈', label: '触发几率',   value: '42', unit: '%',
          tip: '暴击时触发齐射的几率' },
        { icon: '◈', label: '攻击速度',   value: '1.84', unit: '/s',
          tip: '高攻速触发循环依赖' },
        { icon: '◈', label: '元素伤害',   value: '+58', unit: '%',
          tip: '所有元素伤害增益' },
      ],
      defense: [
        { icon: '◆', label: '生命',       value: '1,180' },
        { icon: '◆', label: '护甲',       value: '124' },
        { icon: '◆', label: '闪避',       value: '38', unit: '%', key: true,
          tip: '高闪避是该流派的核心生存手段' },
        { icon: '◆', label: '法力上限',   value: '480',
          tip: '为触发提供资源池' },
        { icon: '◆', label: '法力回复',   value: '24', unit: '/s' },
      ],
      summary: [
        '高暴击率激活连续触发循环',
        '齐射叠加暴击效果',
        '攻速决定触发频率',
      ],
      mechanics: [
        { name: '至光誓言', desc: '死亡前最后一击必定暴击，触发所有激活技能。' },
        { name: '星辉触发', desc: '使用 4 个不同技能后下次施法 +200% 伤害。' },
      ],
      corruption: {
        level: 1, levelMax: 10,
        instability: 4,
        mutations: [
          { kind: 'up', text: '暴击率 +6%' },
        ],
      },
      derived: [
        { label: 'DPS',          value: '4,210', key: true },
        { label: '有效生命',      value: '1,520' },
        { label: '触发 / 秒',     value: '2.4', key: true },
        { label: '法力 / 秒',     value: '+18' },
      ],
    },

    corruption: {
      archetype: '猎人',
      level: 22,
      buildName: '腐化弓手 / CORRUPTION ARCHER',
      buildTitle: '腐化弓手',
      tags: ['corruption', 'ricochet', 'trigger'],
      offense: [
        { icon: '◈', label: '腐化伤害',   value: '+180', unit: '%', key: true,
          tip: '每层腐化提升 3% 全部伤害' },
        { icon: '◈', label: '暴击率',     value: '34', unit: '%' },
        { icon: '◈', label: '投射物数量', value: '5' },
        { icon: '◈', label: '触发几率',   value: '24', unit: '%' },
        { icon: '◈', label: '攻击速度',   value: '1.28', unit: '/s' },
        { icon: '◈', label: '腐化层数',   value: '60', unit: '/100', key: true,
          tip: '当前累积的腐化层数 (60 / 100)' },
      ],
      defense: [
        { icon: '◆', label: '生命',         value: '1,640' },
        { icon: '◆', label: '护甲',         value: '218',  key: true },
        { icon: '◆', label: '闪避',         value: '12', unit: '%' },
        { icon: '◆', label: '腐化抗性',     value: '−40', unit: '%',
          tip: '负抗性 — 腐化层数累积更快 (流派故意取舍)' },
        { icon: '◆', label: '生命偷取',     value: '12', unit: '%', key: true },
      ],
      summary: [
        '主动累积腐化层数换取全面伤害',
        '突变机制触发战场异变',
        '高生命偷取维持高风险残血状态',
      ],
      mechanics: [
        { name: '腐化共鸣',     desc: '腐化层数每增加 1，所有伤害提高 3%。' },
        { name: '献祭血契',     desc: '每损失 5% 生命，所有伤害额外提高 1%。' },
        { name: '虚空触发',     desc: '受到致命伤害时触发最后技能 (60 秒)。' },
      ],
      corruption: {
        level: 7, levelMax: 10,
        instability: 64,
        mutations: [
          { kind: 'up',   text: '全部伤害 +180%' },
          { kind: 'up',   text: '生命偷取 +12%' },
          { kind: 'down', text: '物理减伤 −24%' },
          { kind: 'down', text: '腐化抗性 −40%' },
        ],
      },
      derived: [
        { label: 'DPS',           value: '6,180', key: true },
        { label: '有效生命',       value: '1,420' },
        { label: '腐化 / 秒',      value: '0.8', key: true },
        { label: '突变频率',       value: '每 40 秒' },
      ],
    },
  };

  const TAG_DISPLAY = {
    poison: '毒素', crit: '暴击', ricochet: '弹射',
    trigger: '触发', corruption: '腐化', projectile: '投射物',
  };

  /* =============================================================
     3. Render
     ============================================================= */
  function render(buildKey) {
    const b = BUILDS[buildKey];
    if (!b) return;

    /* Identity */
    document.getElementById('charArchetype').textContent = b.archetype;
    document.getElementById('charLevel').textContent = b.level;
    document.getElementById('charBuildName').textContent = b.buildName;
    document.getElementById('charBuildTitle').textContent = b.buildTitle;

    /* Tags */
    const tagsEl = document.getElementById('charTags');
    tagsEl.innerHTML = b.tags.map(t =>
      `<span class="char-tag tag-${t}" data-tip="标签: ${TAG_DISPLAY[t]} — 影响 build 化学反应路径">${TAG_DISPLAY[t]}</span>`
    ).join('');

    /* Offense list */
    document.getElementById('charOffenseList').innerHTML =
      b.offense.map(s => buildStatRow(s)).join('');

    /* Defense list */
    document.getElementById('charDefenseList').innerHTML =
      b.defense.map(s => buildStatRow(s)).join('');

    /* Build bullets */
    document.getElementById('charBuildBullets').innerHTML =
      b.summary.map(s => `<div class="char-build-bullet">${s}</div>`).join('');

    /* Mechanics */
    document.getElementById('charMechanics').innerHTML = b.mechanics.map(m => `
      <div class="char-mechanic" data-tip="${m.desc}">
        <div class="char-mechanic-name">${m.name}</div>
        <div class="char-mechanic-desc">${m.desc}</div>
      </div>
    `).join('');

    /* Corruption */
    const c = b.corruption;
    const pct = Math.round(c.level / c.levelMax * 100);
    document.getElementById('charCorruption').innerHTML = `
      <div class="char-corruption-row">
        <span class="char-corruption-label">腐化等级</span>
        <span class="char-corruption-value">${c.level} / ${c.levelMax}</span>
      </div>
      <div class="char-corruption-bar"><div class="char-corruption-bar-fill" style="width:${pct}%"></div></div>
      <div class="char-corruption-row">
        <span class="char-corruption-label">不稳定度</span>
        <span class="char-corruption-value">${c.instability}%</span>
      </div>
      <div class="char-mutation">
        ${c.mutations.map(m => `<div class="char-mutation-line ${m.kind}">${m.text}</div>`).join('')}
      </div>
    `;

    /* Derived */
    document.getElementById('charDerived').innerHTML = b.derived.map(d => `
      <div class="char-derived ${d.key ? 'key' : ''}">
        <div class="char-derived-label">${d.label}</div>
        <div class="char-derived-value">${d.value}${d.unit ? `<span class="char-derived-unit">${d.unit}</span>` : ''}</div>
      </div>
    `).join('');

    /* Re-bind hover handlers (since innerHTML replaced) */
    bindStatTooltips();
  }

  function buildStatRow(s) {
    return `
      <div class="char-stat-row ${s.key ? 'is-key' : ''}" data-tip="${s.tip || s.label}">
        <span class="char-stat-icon">${s.icon}</span>
        <span class="char-stat-label">${s.label}</span>
        <span class="char-stat-value">${s.value}${s.unit ? `<span class="char-derived-unit">${s.unit}</span>` : ''}</span>
      </div>
    `;
  }

  /* =============================================================
     5. Stat tooltip — minimal floating tooltip on hover
     ============================================================= */
  const $floater = document.getElementById('floatingTooltip');
  const HOVER_DELAY = 80;
  let hoverTimer = null;

  function bindStatTooltips() {
    document.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('mouseenter', (e) => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          showTip(el, e.clientX, e.clientY);
        }, HOVER_DELAY);
      });
      el.addEventListener('mousemove', (e) => {
        if ($floater.classList.contains('is-visible')) positionTip(e.clientX, e.clientY);
      });
      el.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        $floater.classList.remove('is-visible');
      });
    });
  }
  function showTip(el, x, y) {
    const text = el.dataset.tip || '';
    if (!text) return;
    $floater.innerHTML = `
      <div class="tooltip tooltip-normal" style="width: 320px;">
        <div class="tt-header">
          <div class="tt-name" style="font-size:13px; letter-spacing:0.08em;">${el.querySelector('.char-stat-label, .char-mechanic-name')?.textContent || el.textContent}</div>
        </div>
        <div class="tt-divider"></div>
        <div class="tt-utility">
          <div class="tt-req" style="font-size:11px; line-height:1.4; color:var(--clr-hud-text);">${text}</div>
        </div>
      </div>`;
    positionTip(x, y);
    $floater.classList.add('is-visible');
  }
  function positionTip(mouseX, mouseY) {
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    let x = (mouseX - rect.left) * sx + 14;
    let y = (mouseY - rect.top)  * sy + 14;
    if (x + 340 > CANVAS_W - 20) x = (mouseX - rect.left) * sx - 340 - 14;
    if (y + 140 > CANVAS_H - 20) y = CANVAS_H - 140 - 20;
    $floater.style.left = Math.max(20, x) + 'px';
    $floater.style.top  = Math.max(20, y) + 'px';
  }

  /* =============================================================
     4. Build switcher
     ============================================================= */
  document.querySelectorAll('.char-build-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.char-build-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      render(btn.dataset.build);
    });
  });

  /* Close + debug */
  document.getElementById('charClose').addEventListener('click', () => {
    console.log('[CLOSE] would close character panel');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('show-grid');
    if (e.key === '1') simulate('venom');
    if (e.key === '2') simulate('crit');
    if (e.key === '3') simulate('corruption');
  });
  function simulate(key) {
    document.querySelector(`.char-build-btn[data-build="${key}"]`)?.click();
  }

  /* Boot */
  render('venom');
})();
