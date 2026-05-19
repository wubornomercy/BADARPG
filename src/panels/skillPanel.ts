/**
 * Skill Panel runtime — populates #skillPanel from the real SkillManager
 * registry (STARTER_SKILLS). Implements Phase 1 SKILL_PANEL_V1 spec on
 * top of the Phase 2A Pixi-runtime panel overlay.
 *
 * Per spec:
 *   LEFT   skill list (6-8 entries, here exactly 4 starters)
 *   CENTER selected skill detail (fantasy / damage / scaling / runtime
 *          interaction / corruption interaction)
 *   RIGHT  synergy bullets / compatible supports / corruption mutation
 *   BOTTOM tag chips + runtime stats (DPS / cooldown / mana / etc.)
 *
 * Build switcher = 3 "lenses" (毒蚀弹射 / 暴击触发 / 腐化弓手). Each
 * lens defines per-skill synergy bullets so the selected skill's right
 * panel updates when both selection AND build change.
 */
import type { SkillManager } from '../systems/skills/core/SkillManager.js';
import type { SkillDefinition } from '../systems/skills/types/SkillDefinition.js';
import { DamageType } from '../systems/combat/types/DamageType.js';
import { refreshTooltipTargets } from '../tooltip-hover.js';

// =========================================================================
// Build "lenses" — three thematic perspectives on the same skill registry.
// Per skill, a list of 2-3 bullets describing how it participates in that
// build, plus the supports + corruption mutation appropriate to it.
// =========================================================================
type BuildLensId = 'venom' | 'crit' | 'corruption';

interface BuildLens {
  id:     BuildLensId;
  label:  string;
  /** Per-skill-id bullets describing the build interaction. */
  bullets: Record<string, string[]>;
  /** Per-skill-id compatible support gems. */
  supports: Record<string, string[]>;
  /** Per-skill-id corruption mutation (kind: up = green, down = red). */
  corruption: Record<string, { kind: 'up' | 'down'; text: string }[]>;
}

const BUILD_LENSES: BuildLens[] = [
  {
    id: 'venom',
    label: '毒蚀弹射',
    bullets: {
      corrupt_bolt: [
        '基础攻击为毒素层叠提供高频铺垫',
        '弹射使毒素扩散到附近敌人',
        '腐化等级提升每发毒素层数',
      ],
      venom_nova: [
        '环身爆发瞬间叠满目标毒素层',
        '与暴击触发器联动重置冷却',
        '腐化扩大爆发半径 +24%',
      ],
      shadow_dash: [
        '位移到敌群中央以释放蛇毒绽放',
        '疾冲无敌帧规避腐化反噬',
        '腐化层增加额外位移距离',
      ],
      corruption_field: [
        '提供持续毒素地形',
        '弹射与触发都受地形增益',
        '与尸蚀触发链式联动',
      ],
    },
    supports: {
      corrupt_bolt:     ['毒素连锁', '多重射击', '弹射强化'],
      venom_nova:       ['毒素连锁', '尸蚀触发', '回响爆发'],
      shadow_dash:      ['位移强化', '影刃延伸'],
      corruption_field: ['毒素连锁', '尸蚀触发', '回响爆发'],
    },
    corruption: {
      corrupt_bolt:     [{ kind: 'up', text: '+18% 毒素扩散范围' }, { kind: 'down', text: '-8% 物理伤害' }],
      venom_nova:       [{ kind: 'up', text: '+24% 毒素扩散范围' }, { kind: 'down', text: '-12% 护甲效率' }],
      shadow_dash:      [{ kind: 'up', text: '+14% 疾冲距离' }, { kind: 'down', text: '+8% 自伤反弹' }],
      corruption_field: [{ kind: 'up', text: '+28% 持续时间' }, { kind: 'down', text: '-10% 移动速度' }],
    },
  },
  {
    id: 'crit',
    label: '暴击触发',
    bullets: {
      corrupt_bolt: [
        '高攻速提供大量暴击 roll',
        '每发暴击重置触发冷却',
        '攻速堆叠决定触发频率',
      ],
      venom_nova: [
        '暴击触发齐射 + 链式爆发',
        '高暴击率 = 高触发率',
        '触发回响形成连环爆炸',
      ],
      shadow_dash: [
        '位移后下一击保证暴击',
        '与暴击共鸣形成 burst window',
        '腐化提供额外暴击伤害',
      ],
      corruption_field: [
        '范围内目标暴击伤害 +30%',
        '触发回响在地形内叠加',
        '触发频率不消耗法力',
      ],
    },
    supports: {
      corrupt_bolt:     ['暴击共鸣', '多重射击', '回响爆发'],
      venom_nova:       ['暴击共鸣', '触发回响', '多重射击'],
      shadow_dash:      ['位移强化', '暴击触发'],
      corruption_field: ['暴击共鸣', '触发回响'],
    },
    corruption: {
      corrupt_bolt:     [{ kind: 'up', text: '+12% 暴击率' }, { kind: 'down', text: '-6% 攻击速度' }],
      venom_nova:       [{ kind: 'up', text: '+22% 暴击伤害' }, { kind: 'down', text: '-15% 法力上限' }],
      shadow_dash:      [{ kind: 'up', text: '位移后保证暴击' }, { kind: 'down', text: '+12% 冷却时间' }],
      corruption_field: [{ kind: 'up', text: '+18% 暴击率' }, { kind: 'down', text: '-10% 持续时间' }],
    },
  },
  {
    id: 'corruption',
    label: '腐化弓手',
    bullets: {
      corrupt_bolt: [
        '每次命中累积自身腐化层',
        '腐化层数线性放大伤害',
        '触发突变事件释放虚空冲击',
      ],
      venom_nova: [
        '消耗腐化层换取额外爆发',
        '突变扩散范围 ±40%',
        '腐化等级 ≥ 5 时触发尸蚀',
      ],
      shadow_dash: [
        '位移时清空 1 层腐化转化为伤害',
        '腐化反噬期间无敌帧',
        '虚空触发链接到下次释放',
      ],
      corruption_field: [
        '地形腐化持续累积层数',
        '腐化层数提升地形伤害',
        '突变期间地形覆盖范围 +50%',
      ],
    },
    supports: {
      corrupt_bolt:     ['腐化共鸣', '献祭血契', '虚空触发'],
      venom_nova:       ['腐化共鸣', '虚空触发', '突变回响'],
      shadow_dash:      ['虚空触发', '献祭血契'],
      corruption_field: ['腐化共鸣', '虚空触发', '突变扩散'],
    },
    corruption: {
      corrupt_bolt:     [{ kind: 'up', text: '+24% 腐化伤害' }, { kind: 'down', text: '-15% 物理减伤' }],
      venom_nova:       [{ kind: 'up', text: '+32% 腐化伤害' }, { kind: 'down', text: '-20% 物理减伤' }],
      shadow_dash:      [{ kind: 'up', text: '突进可清腐化' }, { kind: 'down', text: '+12% 自伤反弹' }],
      corruption_field: [{ kind: 'up', text: '+40% 腐化扩散' }, { kind: 'down', text: '-25% 物理减伤' }],
    },
  },
];

// =========================================================================
// Tag display — map skill internal tags to UI categories + chip classes.
// =========================================================================
const TAG_DISPLAY: Record<string, { label: string; chipClass: string }> = {
  poison:     { label: '毒素',   chipClass: 'tag-poison' },
  projectile: { label: '投射物', chipClass: 'tag-projectile' },
  aoe:        { label: '范围',   chipClass: 'tag-trigger' },
  spell:      { label: '法术',   chipClass: 'tag-ricochet' },
  dot:        { label: '持续',   chipClass: 'tag-corruption' },
  basic:      { label: '基础',   chipClass: 'tag-crit' },
  movement:   { label: '位移',   chipClass: 'tag-ricochet' },
};

function tagChip(t: string): string {
  const t2 = TAG_DISPLAY[t] ?? { label: t, chipClass: 'tag-projectile' };
  return `<span class="skill-tag ${t2.chipClass}">${t2.label}</span>`;
}

function damageTypeLabel(d?: DamageType): string {
  switch (d) {
    case DamageType.PHYSICAL:  return '物理';
    case DamageType.POISON:    return '毒素';
    case DamageType.FIRE:      return '火焰';
    case DamageType.COLD:      return '冰冷';
    case DamageType.LIGHTNING: return '闪电';
    default: return '—';
  }
}

function behaviorLabel(t: string): string {
  switch (t) {
    case 'PROJECTILE': return '投射物';
    case 'NOVA':       return '环身爆发';
    case 'DASH':       return '位移';
    case 'BEAM':       return '光束';
    case 'GROUND_AOE': return '地面区域';
    default: return t;
  }
}

/** Crude DPS estimate from base damage × cast rate. Display only. */
function estimateDps(def: SkillDefinition): string {
  if (def.baseDamage == null) return '—';
  // Approximate: per-cast damage / cooldown (or 1s if no cooldown)
  const interval = def.cooldown > 0 ? def.cooldown : 1;
  const dps = def.baseDamage / interval;
  return Math.round(dps).toString();
}

// =========================================================================
// State + render
// =========================================================================
interface PanelState {
  manager: SkillManager;
  buildId: BuildLensId;
  selectedId: string;
}

let state: PanelState | null = null;

function getLens(id: BuildLensId): BuildLens {
  return BUILD_LENSES.find(b => b.id === id) ?? BUILD_LENSES[0];
}

function buildSwitcherHTML(activeId: BuildLensId): string {
  return BUILD_LENSES.map(b =>
    `<button class="skill-build-btn ${b.id === activeId ? 'is-active' : ''}" data-build="${b.id}">${b.label}</button>`
  ).join('');
}

function skillListHTML(skills: SkillDefinition[], selectedId: string, lens: BuildLens): string {
  return skills.map(s => {
    const inBuild = (lens.bullets[s.id]?.length ?? 0) > 0;
    const cls = ['skill-item'];
    if (s.id === selectedId) cls.push('is-selected');
    if (inBuild) cls.push('is-in-build');
    const tagsText = s.tags.slice(0, 3).map(t => TAG_DISPLAY[t]?.label ?? t).join(' · ');
    const cdText = s.cooldown > 0 ? `冷却 ${s.cooldown} 秒` : '即时';
    const manaText = s.manaCost > 0 ? `法力 ${s.manaCost}` : '无消耗';
    return `<div class="${cls.join(' ')}" data-skill-id="${s.id}" data-tip="${s.name}|${s.description}">
      <div class="skill-item-icon"><span class="skill-icon-glyph">${s.icon}</span></div>
      <div class="skill-item-info">
        <div class="skill-item-name">${s.name}</div>
        <div class="skill-item-tags">${tagsText}</div>
        <div class="skill-item-meta">${cdText} · ${manaText}</div>
      </div>
      <div class="skill-item-affinity">◆</div>
    </div>`;
  }).join('');
}

function detailColHTML(def: SkillDefinition): string {
  const enName = def.id.toUpperCase().replace(/_/g, ' ');
  const tagsHTML = def.tags.map(tagChip).join('');
  const dt = damageTypeLabel(def.damageType);
  const bh = behaviorLabel(def.behaviorType);
  const cd = def.cooldown > 0 ? `${def.cooldown} 秒` : '即时';
  const mana = def.manaCost > 0 ? def.manaCost.toString() : '0';
  const scaling = def.canCrit ? '攻击力 + 暴击' : (def.damageType === DamageType.POISON ? '攻击力 + 毒素伤害' : '攻击力');
  const triggerText = (() => {
    if (def.behaviorType === 'PROJECTILE') {
      return '命中后产生穿透 / 弹射 / 分裂判定，所有 on-hit 词缀生效。';
    }
    if (def.behaviorType === 'NOVA') {
      return '半径内全体敌人立刻受击，每个目标独立 roll 暴击 / 触发。';
    }
    if (def.behaviorType === 'DASH') {
      return '疾冲期间无敌帧；穿越敌人不触发碰撞伤害。';
    }
    if (def.behaviorType === 'GROUND_AOE') {
      return '地形按 tick 间隔对范围内敌人造成持续伤害，DOT 不暴击。';
    }
    return '该技能直接执行 ' + bh + ' 行为，无额外触发逻辑。';
  })();

  return `
    <div class="skill-detail-header">
      <div class="skill-detail-icon"><span class="skill-icon-glyph">${def.icon}</span></div>
      <div class="skill-detail-titles">
        <div class="skill-detail-name">${def.name}</div>
        <div class="skill-detail-en">${enName}</div>
      </div>
    </div>
    <div class="skill-detail-tags">${tagsHTML}</div>
    <div class="skill-stats-grid">
      <div class="skill-stat-cell"><span class="label">行为</span><span class="value">${bh}</span></div>
      <div class="skill-stat-cell"><span class="label">伤害</span><span class="value">${dt}${def.baseDamage != null ? ` (${def.baseDamage})` : ''}</span></div>
      <div class="skill-stat-cell"><span class="label">缩放</span><span class="value">${scaling}</span></div>
      <div class="skill-stat-cell"><span class="label">冷却 / 法力</span><span class="value">${cd} · ${mana}</span></div>
    </div>
    <div class="skill-fantasy">
      <span class="skill-fantasy-label">技能 fantasy</span>
      ${def.description}
    </div>
    <div class="skill-trigger">
      <span class="skill-trigger-label">运行时交互</span>
      ${triggerText}
    </div>`;
}

function synergyColHTML(def: SkillDefinition, lens: BuildLens): string {
  const bullets = lens.bullets[def.id] ?? [
    '该技能不属于当前流派核心',
    '可作为辅助 / 工具技能使用',
    '切换流派以查看交互细节',
  ];
  const supports = lens.supports[def.id] ?? ['（无推荐辅助）'];
  const corr = lens.corruption[def.id] ?? [];

  return `
    <div class="skill-syn-section">
      <div class="skill-section-label">流派交互</div>
      <div class="skill-syn-build-name">${lens.label}</div>
      ${bullets.map(b => `<div class="skill-syn-bullet">${b}</div>`).join('')}
    </div>
    <div class="skill-syn-section">
      <div class="skill-section-label">兼容辅助</div>
      <div class="skill-supports">
        ${supports.map(s => `<div class="skill-support" data-tip="${s}|辅助槽位（占位）— 后续 support gem 系统接入。"><span class="skill-support-name">${s}</span></div>`).join('')}
      </div>
    </div>
    <div class="skill-syn-section">
      <div class="skill-section-label">腐化突变</div>
      <div class="skill-corruption">
        ${corr.length === 0
          ? '<div class="skill-corruption-line">（该技能在当前腐化等级未生成突变）</div>'
          : corr.map(c => `<div class="skill-corruption-line ${c.kind}">${c.text}</div>`).join('')
        }
      </div>
    </div>`;
}

function bottomHTML(def: SkillDefinition): string {
  const tagsHTML = def.tags.map(tagChip).join('');
  const dps = estimateDps(def);
  const cd = def.cooldown > 0 ? def.cooldown.toString() : '—';
  const cdUnit = def.cooldown > 0 ? '秒' : '';
  const mana = def.manaCost.toString();
  const projCount: string | number = def.behaviorType === 'PROJECTILE'
    ? (def.projectile?.chainCount ?? 0) + (def.projectile?.forkCount ?? 0) + 1
    : '—';

  return `
    <div class="skill-bottom-tags">
      <span class="skill-bottom-tags-label">标签</span>
      <div style="display:flex; gap:6px;">${tagsHTML}</div>
    </div>
    <div class="skill-bottom-stats">
      <div class="skill-bottom-stat key"><span class="skill-bottom-stat-label">DPS</span><span class="skill-bottom-stat-value">${dps}</span></div>
      <div class="skill-bottom-stat"><span class="skill-bottom-stat-label">冷却</span><span class="skill-bottom-stat-value">${cd}${cdUnit ? `<span class="skill-bottom-stat-unit">${cdUnit}</span>` : ''}</span></div>
      <div class="skill-bottom-stat"><span class="skill-bottom-stat-label">法力</span><span class="skill-bottom-stat-value">${mana}</span></div>
      <div class="skill-bottom-stat key"><span class="skill-bottom-stat-label">投射物</span><span class="skill-bottom-stat-value">${projCount}</span></div>
      <div class="skill-bottom-stat"><span class="skill-bottom-stat-label">行为</span><span class="skill-bottom-stat-value" style="font-size:14px;">${behaviorLabel(def.behaviorType)}</span></div>
    </div>`;
}

function render() {
  if (!state) return;
  const { manager, buildId, selectedId } = state;
  const skills = manager.list();
  if (skills.length === 0) return;

  const lens = getLens(buildId);
  const def = manager.get(selectedId) ?? skills[0];

  const $switcher = document.getElementById('skillBuildSwitcher');
  const $list     = document.getElementById('skillList');
  const $detail   = document.getElementById('skillDetailCol');
  const $synergy  = document.getElementById('skillSynergyCol');
  const $bottom   = document.getElementById('skillBottom');

  if ($switcher) $switcher.innerHTML = buildSwitcherHTML(buildId);
  if ($list)     $list.innerHTML     = skillListHTML(skills, def.id, lens);
  if ($detail)   $detail.innerHTML   = detailColHTML(def);
  if ($synergy)  $synergy.innerHTML  = synergyColHTML(def, lens);
  if ($bottom)   $bottom.innerHTML   = bottomHTML(def);

  bindHandlers();
  // Re-scan data-tip targets so the tooltip-hover module picks up new nodes
  refreshTooltipTargets();
}

function bindHandlers() {
  document.querySelectorAll<HTMLElement>('#skillBuildSwitcher .skill-build-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state) return;
      state.buildId = btn.dataset.build as BuildLensId;
      // Apply build via BuildManager — swaps stat modifiers on player.
      // BuildManager is exposed as window.__bad_builds + window.__bad.player
      // by main.ts at boot; we read it lazily so the panel module stays
      // import-independent from the orchestrator.
      const w = window as unknown as {
        __bad_builds?: { applyBuild(id: string, sm: unknown): boolean };
        __bad?:        { player?: { statManager: unknown } };
      };
      const bm = w.__bad_builds;
      const sm = w.__bad?.player?.statManager;
      if (bm && sm) bm.applyBuild(state.buildId, sm);
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('#skillList .skill-item').forEach(row => {
    row.addEventListener('click', () => {
      if (!state) return;
      state.selectedId = row.dataset.skillId ?? state.selectedId;
      render();
    });
  });
}

/**
 * One-time wiring at boot. Must be called AFTER main.ts has registered
 * the starter skills with the SkillManager.
 */
export function initSkillPanel(manager: SkillManager) {
  const skills = manager.list();
  state = {
    manager,
    buildId: 'venom',
    selectedId: skills[0]?.id ?? 'corrupt_bolt',
  };
  render();
}
