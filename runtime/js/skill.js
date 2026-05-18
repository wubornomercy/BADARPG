/* =============================================================
   BAD ARPG — Skill Panel Runtime
   Responsibilities (V1):
     1. Fit-to-window scaling
     2. 7 skill data + 3 build affiliations
     3. Render skill list / detail / synergy / supports / corruption /
        bottom tags & stats
     4. Skill click -> select + center detail rebuild
     5. Build switcher -> updates skill affiliation markers + synergy panel
     6. Hover -> floating tooltip (80ms delay)
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
     2. Skill data — 7 skills
     ============================================================= */
  const SKILLS = [
    {
      id: 'venom-burst', name: '毒蚀爆发', en: 'VENOM BURST', icon: '毒',
      tags: ['poison', 'projectile', 'trigger'],
      damageType: '毒素 / 投射物',
      scaling:    '攻击力 + 毒素伤害',
      cooldown:   '8 秒',
      mana:       '32',
      fantasy:    '引出毒蚀云雾笼罩敌人，命中后扩散并叠加毒层。每命中一名敌人，毒素层数 +1，并向半径内传播。',
      trigger:    '当目标毒素层数 ≥ 5 时，触发尸蚀爆发，造成 (毒素 DPS × 8) 范围伤害。',
      supports:   ['毒素连锁', '尸蚀触发', '回响爆发'],
      corruption: [
        { kind: 'up',   text: '+24% 毒素扩散范围' },
        { kind: 'down', text: '-12% 护甲效率' },
      ],
      runtime: [
        { label: 'DPS',       value: '2,840', key: true },
        { label: '冷却',       value: '8',     unit: '秒' },
        { label: '法力',       value: '32' },
        { label: '投射物',     value: '3' },
        { label: '触发率',     value: '18',    unit: '%' },
      ],
    },
    {
      id: 'ricochet-shot', name: '弹射射击', en: 'RICOCHET SHOT', icon: '弹',
      tags: ['ricochet', 'projectile', 'crit'],
      damageType: '物理 / 投射物',
      scaling:    '攻击速度 + 暴击伤害',
      cooldown:   '0.4 秒',
      mana:       '8',
      fantasy:    '射出一支可在敌人间反弹最多 4 次的箭矢，每次弹射继承全部增益效果。',
      trigger:    '每次弹射触发"流派核心"词缀：弹射连锁会向附近敌人随机选择目标。',
      supports:   ['弹射连锁', '多重射击', '暴击共鸣'],
      corruption: [
        { kind: 'up',   text: '+14% 弹射次数' },
        { kind: 'down', text: '+8% 自伤反弹' },
      ],
      runtime: [
        { label: 'DPS',       value: '1,640' },
        { label: '冷却',       value: '0.4',   unit: '秒' },
        { label: '法力',       value: '8' },
        { label: '投射物',     value: '4',     key: true },
        { label: '触发率',     value: '—' },
      ],
    },
    {
      id: 'corpsewake-trigger', name: '尸蚀触发', en: 'CORPSEWAKE TRIGGER', icon: '蚀',
      tags: ['trigger', 'corruption', 'poison'],
      damageType: '触发型 / 死亡感应',
      scaling:    '触发频率 + 腐化等级',
      cooldown:   '被动 / 即时',
      mana:       '0',
      fantasy:    '击杀中毒敌人时，以 60% 强度触发你最近使用的技能，无视冷却。',
      trigger:    '触发不会消耗法力。每层腐化提供 +5% 触发强度，最高 +100%。',
      supports:   ['死亡循环', '毒素爆发', '触发回响'],
      corruption: [
        { kind: 'up',   text: '每层腐化 +5% 触发强度' },
        { kind: 'down', text: '腐化 ≥ 5 时承受 8% 反噬伤害' },
      ],
      runtime: [
        { label: 'DPS',       value: '依赖触发' },
        { label: '冷却',       value: '—' },
        { label: '法力',       value: '0' },
        { label: '投射物',     value: '—' },
        { label: '触发率',     value: '1.2',   unit: '/秒', key: true },
      ],
    },
    {
      id: 'corruption-arrow', name: '腐化箭矢', en: 'CORRUPTION ARROW', icon: '噬',
      tags: ['corruption', 'projectile', 'crit'],
      damageType: '腐化 / 投射物',
      scaling:    '腐化层数 + 攻击力',
      cooldown:   '1.2 秒',
      mana:       '24',
      fantasy:    '发射一支被腐化能量缠绕的箭，造成额外腐化伤害并对目标施加腐化层。',
      trigger:    '每次使用累积 +1 腐化层（自身）。腐化层数为伤害乘数。',
      supports:   ['腐化共鸣', '献祭血契', '虚空触发'],
      corruption: [
        { kind: 'up',   text: '每层腐化 +3% 总伤害' },
        { kind: 'down', text: '腐化 ≥ 8 时引发突变事件' },
      ],
      runtime: [
        { label: 'DPS',       value: '3,180', key: true },
        { label: '冷却',       value: '1.2',   unit: '秒' },
        { label: '法力',       value: '24' },
        { label: '投射物',     value: '1' },
        { label: '腐化叠加',   value: '+1 / 次' },
      ],
    },
    {
      id: 'phantom-volley', name: '幻影齐射', en: 'PHANTOM VOLLEY', icon: '影',
      tags: ['crit', 'projectile', 'trigger'],
      damageType: '物理 / 投射物',
      scaling:    '暴击率 + 攻击速度',
      cooldown:   '4 秒',
      mana:       '48',
      fantasy:    '同时发射 6 支幻影箭，每支独立计算暴击与触发效果。',
      trigger:    '每一支命中暴击的箭独立触发"流派核心"词缀，可链式叠加。',
      supports:   ['多重射击', '暴击共鸣', '触发回响'],
      corruption: [
        { kind: 'up',   text: '+18% 投射物数量' },
        { kind: 'down', text: '-10% 攻击速度' },
      ],
      runtime: [
        { label: 'DPS',       value: '4,210', key: true },
        { label: '冷却',       value: '4',     unit: '秒' },
        { label: '法力',       value: '48' },
        { label: '投射物',     value: '6',     key: true },
        { label: '触发率',     value: '42',    unit: '%' },
      ],
    },
    {
      id: 'void-hunt', name: '虚空狩猎', en: 'VOID HUNT', icon: '虚',
      tags: ['corruption', 'trigger'],
      damageType: '腐化 / 触发型',
      scaling:    '腐化层数 + 触发频率',
      cooldown:   '12 秒',
      mana:       '60',
      fantasy:    '标记最多 4 名敌人。当你受到致命伤害时，对所有标记目标造成 200% 伤害并复活。',
      trigger:    '60 秒大冷却。腐化层数越高可标记更多敌人。',
      supports:   ['虚空触发', '献祭血契', '死亡循环'],
      corruption: [
        { kind: 'up',   text: '每层腐化 +1 标记上限' },
        { kind: 'down', text: '触发后失去 50% 当前生命' },
      ],
      runtime: [
        { label: 'DPS',       value: '1,840' },
        { label: '冷却',       value: '12',    unit: '秒' },
        { label: '法力',       value: '60' },
        { label: '标记上限',   value: '4',     key: true },
        { label: '触发率',     value: '—' },
      ],
    },
    {
      id: 'chain-storm', name: '连锁风暴', en: 'CHAIN STORM', icon: '雷',
      tags: ['ricochet', 'crit'],
      damageType: '闪电 / 投射物',
      scaling:    '暴击率 + 攻击速度',
      cooldown:   '6 秒',
      mana:       '40',
      fantasy:    '发射闪电链，每次弹射有 30% 几率分裂为 2 条新链。',
      trigger:    '弹射 + 分裂叠加。最大同时存在 32 条闪电链。',
      supports:   ['弹射连锁', '多重射击', '暴击共鸣'],
      corruption: [
        { kind: 'up',   text: '+24% 弹射次数' },
        { kind: 'down', text: '-8% 法力效率' },
      ],
      runtime: [
        { label: 'DPS',       value: '3,420', key: true },
        { label: '冷却',       value: '6',     unit: '秒' },
        { label: '法力',       value: '40' },
        { label: '投射物',     value: '5' },
        { label: '触发率',     value: '30',    unit: '%' },
      ],
    },
  ];

  /* =============================================================
     3. Build composition + interaction bullets
     ============================================================= */
  const BUILDS = {
    venom: {
      name: '毒蚀弹射',
      skills: ['venom-burst', 'ricochet-shot', 'corpsewake-trigger'],
      perSkill: {
        'venom-burst': [
          '暴击触发毒素 nova',
          '弹射继承毒素层',
          '腐化扩大爆发半径',
        ],
        'ricochet-shot': [
          '弹射在敌人间传播毒素',
          '触发尸蚀爆发循环',
          '腐化提升弹射次数',
        ],
        'corpsewake-trigger': [
          '中毒目标击杀触发重新施法',
          '与毒蚀爆发形成无限循环',
          '腐化层数提升触发强度',
        ],
      },
    },
    crit: {
      name: '暴击触发',
      skills: ['phantom-volley', 'chain-storm', 'ricochet-shot'],
      perSkill: {
        'phantom-volley': [
          '高暴击率激活每箭触发',
          '触发回响形成链式爆发',
          '攻速提升触发频率',
        ],
        'chain-storm': [
          '弹射 + 分裂叠加暴击',
          '暴击共鸣循环触发',
          '高攻速触发齐射',
        ],
        'ricochet-shot': [
          '快速 cd 维持触发循环',
          '每次弹射独立暴击判定',
          '与多重射击协同',
        ],
      },
    },
    corruption: {
      name: '腐化弓手',
      skills: ['corruption-arrow', 'void-hunt', 'corpsewake-trigger'],
      perSkill: {
        'corruption-arrow': [
          '主动累积腐化层换取伤害',
          '虚空触发感应腐化突变',
          '腐化等级直接放大伤害',
        ],
        'void-hunt': [
          '腐化层数提升标记上限',
          '受到致命伤害时启动',
          '与献祭血契循环',
        ],
        'corpsewake-trigger': [
          '触发腐化箭矢循环',
          '腐化提升触发强度',
          '中毒+腐化双效果叠加',
        ],
      },
    },
  };

  const TAG_DISPLAY = {
    poison: '毒素', crit: '暴击', ricochet: '弹射',
    trigger: '触发', corruption: '腐化', projectile: '投射物',
  };

  /* =============================================================
     4. State
     ============================================================= */
  const skillById = Object.fromEntries(SKILLS.map(s => [s.id, s]));
  let activeBuild = 'venom';
  let selectedSkillId = 'venom-burst';

  /* =============================================================
     5. Render
     ============================================================= */
  function renderAll() {
    renderList();
    renderDetail();
    renderSynergy();
    renderBottom();
  }

  function renderList() {
    const list = document.getElementById('skillList');
    const buildSkills = BUILDS[activeBuild].skills;
    list.innerHTML = SKILLS.map(s => {
      const inBuild = buildSkills.includes(s.id);
      const selected = s.id === selectedSkillId;
      return `
        <div class="skill-item ${inBuild ? 'is-in-build' : ''} ${selected ? 'is-selected' : ''}"
             data-skill="${s.id}" data-tip="${s.name} · ${s.en}">
          <div class="skill-item-icon">
            <span class="skill-icon-glyph">${s.icon}</span>
          </div>
          <div class="skill-item-info">
            <div class="skill-item-name">${s.name}</div>
            <div class="skill-item-tags">${s.tags.map(t => TAG_DISPLAY[t]).join(' · ')}</div>
            <div class="skill-item-meta">冷却 ${s.cooldown} · 法力 ${s.mana}</div>
          </div>
          <div class="skill-item-affinity">◆</div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.skill-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedSkillId = el.dataset.skill;
        renderAll();
      });
    });
    bindHoverTooltips();
  }

  function renderDetail() {
    const s = skillById[selectedSkillId];
    const tagsHTML = s.tags.map(t =>
      `<span class="skill-tag tag-${t}">${TAG_DISPLAY[t]}</span>`
    ).join('');

    document.getElementById('skillDetail').innerHTML = `
      <div class="skill-detail-header">
        <div class="skill-detail-icon"><span class="skill-icon-glyph">${s.icon}</span></div>
        <div class="skill-detail-titles">
          <div class="skill-detail-name">${s.name}</div>
          <div class="skill-detail-en">${s.en}</div>
        </div>
      </div>

      <div class="skill-detail-tags">${tagsHTML}</div>

      <div class="skill-stats-grid">
        <div class="skill-stat-cell"><span class="label">伤害类型</span><span class="value">${s.damageType}</span></div>
        <div class="skill-stat-cell"><span class="label">缩放方向</span><span class="value">${s.scaling}</span></div>
        <div class="skill-stat-cell"><span class="label">冷却</span><span class="value">${s.cooldown}</span></div>
        <div class="skill-stat-cell"><span class="label">法力消耗</span><span class="value">${s.mana}</span></div>
      </div>

      <div class="skill-fantasy">
        <span class="skill-fantasy-label">技能 fantasy</span>
        ${s.fantasy}
      </div>

      <div class="skill-trigger">
        <span class="skill-trigger-label">运行时交互</span>
        ${s.trigger}
      </div>
    `;
  }

  function renderSynergy() {
    const s = skillById[selectedSkillId];
    const build = BUILDS[activeBuild];

    document.getElementById('skillSynBuildName').textContent = build.name;

    // Build interaction bullets — per skill if it's in build, otherwise generic
    const bullets = build.perSkill[s.id] || [
      '该技能不属于当前流派核心',
      '可作为辅助 / 工具技能使用',
      '切换流派以查看交互细节',
    ];
    document.getElementById('skillSynBullets').innerHTML = bullets
      .map(b => `<div class="skill-syn-bullet">${b}</div>`).join('');

    // Supports
    document.getElementById('skillSupports').innerHTML = s.supports
      .map(sup => `<div class="skill-support" data-tip="辅助宝石 — ${sup}"><span class="skill-support-name">${sup}</span></div>`)
      .join('');

    // Corruption mutation
    document.getElementById('skillCorruption').innerHTML = s.corruption
      .map(c => `<div class="skill-corruption-line ${c.kind}">${c.text}</div>`)
      .join('');

    bindHoverTooltips();
  }

  function renderBottom() {
    const s = skillById[selectedSkillId];

    document.getElementById('skillBottomTags').innerHTML = s.tags
      .map(t => `<span class="skill-tag tag-${t}">${TAG_DISPLAY[t]}</span>`)
      .join('');

    document.getElementById('skillBottomStats').innerHTML = s.runtime
      .map(r => `
        <div class="skill-bottom-stat ${r.key ? 'key' : ''}">
          <span class="skill-bottom-stat-label">${r.label}</span>
          <span class="skill-bottom-stat-value">${r.value}${r.unit ? `<span class="skill-bottom-stat-unit">${r.unit}</span>` : ''}</span>
        </div>
      `).join('');
  }

  /* =============================================================
     6. Build switcher
     ============================================================= */
  document.querySelectorAll('.skill-build-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.skill-build-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeBuild = btn.dataset.build;
      // Auto-select first skill in new build for clarity
      selectedSkillId = BUILDS[activeBuild].skills[0];
      renderAll();
    });
  });

  /* =============================================================
     7. Tooltip
     ============================================================= */
  const $floater = document.getElementById('floatingTooltip');
  const HOVER_DELAY = 80;
  let hoverTimer = null;

  function bindHoverTooltips() {
    document.querySelectorAll('[data-tip]').forEach(el => {
      if (el._tipBound) return;
      el._tipBound = true;
      el.addEventListener('mouseenter', (e) => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => showTip(el, e.clientX, e.clientY), HOVER_DELAY);
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
        <div class="tt-utility">
          <div class="tt-req" style="font-size: 11px; line-height: 1.5; color: var(--clr-hud-text); letter-spacing: 0.04em;">${text}</div>
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
    if (y + 100 > CANVAS_H - 20) y = CANVAS_H - 100 - 20;
    $floater.style.left = Math.max(20, x) + 'px';
    $floater.style.top  = Math.max(20, y) + 'px';
  }

  /* =============================================================
     8. Misc
     ============================================================= */
  document.getElementById('skillClose').addEventListener('click', () => {
    console.log('[CLOSE] would close skill panel');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('show-grid');
    if (e.key === '1') document.querySelector('[data-build="venom"]').click();
    if (e.key === '2') document.querySelector('[data-build="crit"]').click();
    if (e.key === '3') document.querySelector('[data-build="corruption"]').click();
  });

  /* Boot */
  renderAll();
})();
