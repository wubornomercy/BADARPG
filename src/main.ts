/**
 * BAD ARPG — First Playable Vertical Slice (Phase 2A)
 * Entry point. Scene-aware: main menu (HTML) → arena (Pixi) → panels (HTML).
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import { CANVAS_W, CANVAS_H, WORLD_W, WORLD_H, ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_HALF, COLOR, TUNE, TIME } from './tokens.js';
import { initInput, endFrameInput, mouse, isActionHeld, wasActionPressed } from './input.js';
import { getBinding } from './keybinds.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { LootDrop } from './entities/loot.js';
import { DebugHud, sim, canSpawnEnemy } from './sim.js';
import { StatDebugPanel } from './systems/stats/debug/StatDebugPanel.js';
import { StatType } from './systems/stats/types/StatType.js';
import {
  DamagePipeline,
  DamageType,
  CombatEventType,
  CombatDebugPanel,
  type CombatEntity,
  type DamageContext,
} from './systems/combat/index.js';
import {
  SkillManager,
  SkillBehaviorType,
  SkillTargetingType,
  SkillEventType,
  ProjectileBehavior, NovaBehavior, DashBehavior, BeamBehavior, GroundAOEBehavior,
  STARTER_SKILLS,
  SKILL_CORRUPT_BOLT, SKILL_VENOM_NOVA, SKILL_SHADOW_DASH, SKILL_CORRUPTION_FIELD,
  SkillDebugPanel,
  type SkillWorld,
  type SkillContext,
  type ProjectileEntity,
} from './systems/skills/index.js';
import {
  ItemManager, AffixManager, LootGenerator, EquipmentManager,
  ItemDebugPanel,
  STARTER_BASES, STARTER_AFFIXES,
  ItemRarity,
} from './systems/items/index.js';
import {
  MonsterManager, MonsterSpawner, MonsterDirector, MonsterProjectileManager,
  EliteManager, AggroManager,
  MonsterDebugPanel,
  STARTER_MONSTERS, ELITE_VOLATILE,
  MeleeChaseAI, RangedKiteAI, ChargerAI, SuicideAI, SummonerAI,
  computeXPReward, computeLootMultiplier,
  type MonsterRuntime, type MonsterFactory, type AIContext,
} from './systems/monsters/index.js';
import { MonsterArchetype } from './systems/monsters/types/MonsterArchetype.js';
import { requestShake, computeShake, requestHitStop, isInHitStop } from './feel.js';
import { Scene, getScene, setScene, shouldGameTick, isPanelOpen, onSceneChange, getReturnScene } from './scene.js';
import { follow as cameraFollow, getCameraOffset, screenToWorld } from './camera.js';
import { buildWorld, spawnCorruptionZones, updateCorruptionZones } from './world.js';
import { populatePanels } from './panel-stubs.js';
import { initSettingsUI } from './settings-ui.js';
import { initTooltipHover, refreshTooltipTargets } from './tooltip-hover.js';

(async () => {
  // ---------------------------------------------------------------------
  // Pixi bootstrap — inserted into #pixiHost (not body)
  // ---------------------------------------------------------------------
  const app = new Application();
  await app.init({
    width: CANVAS_W,
    height: CANVAS_H,
    background: 0x050608,
    antialias: false,
    resolution: 1,
    autoDensity: false,
  });
  app.renderer.canvas.style.imageRendering = 'pixelated';

  const pixiHost = document.getElementById('pixiHost')!;
  pixiHost.appendChild(app.canvas);

  // Scale the entire .canvas wrapper (which includes Pixi + HTML overlays)
  // uniformly to fit the viewport.
  const canvasWrap = document.getElementById('canvas')!;
  function fit() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
    canvasWrap.style.width  = CANVAS_W + 'px';
    canvasWrap.style.height = CANVAS_H + 'px';
    canvasWrap.style.transform = `scale(${scale})`;
    canvasWrap.style.transformOrigin = 'center center';
    canvasWrap.style.position = 'absolute';
    canvasWrap.style.left = ((vw - CANVAS_W) / 2) + 'px';
    canvasWrap.style.top  = ((vh - CANVAS_H) / 2) + 'px';
  }
  window.addEventListener('resize', fit, { passive: true });
  fit();

  initInput(app.canvas as HTMLCanvasElement, CANVAS_W, CANVAS_H);

  // ---------------------------------------------------------------------
  // Static panel population (one-time) + settings + tooltip hover
  // ---------------------------------------------------------------------
  populatePanels();
  initSettingsUI();
  initTooltipHover();
  refreshTooltipTargets();   // re-scan after panels populated

  // ---------------------------------------------------------------------
  // URL-param scene override — useful for headless screenshots + debugging
  //   ?scene=play    -> jump to PLAYING on load
  //   ?scene=inv     -> open inventory panel
  //   ?scene=char    -> open character panel
  //   ?scene=skill   -> open skill panel
  // ---------------------------------------------------------------------
  const sceneParam = new URL(location.href).searchParams.get('scene');
  if (sceneParam === 'play')     setScene('PLAYING');
  if (sceneParam === 'pause')    setScene('PAUSE');
  if (sceneParam === 'inv')      setScene('PANEL_INV');
  if (sceneParam === 'char')     setScene('PANEL_CHAR');
  if (sceneParam === 'skill')    setScene('PANEL_SKILL');
  if (sceneParam === 'settings') setScene('PANEL_SETTINGS');

  // ---------------------------------------------------------------------
  // World scene graph
  // ---------------------------------------------------------------------
  const worldRoot = new Container();
  worldRoot.label = 'worldRoot';
  app.stage.addChild(worldRoot);

  const world = buildWorld();
  worldRoot.addChild(world);

  const corruptionLayer = spawnCorruptionZones();
  worldRoot.addChild(corruptionLayer);

  const layerGroundFx    = new Container();
  const layerLoot        = new Container();
  // Single y-sorted layer for player + enemies. Per-frame each actor's
  // container.zIndex is set to round(y) so actors lower on the screen
  // render in front of actors higher up — the depth illusion that makes
  // overlapping sprites feel grounded instead of like paper cut-outs.
  const layerActors      = new Container();
  layerActors.sortableChildren = true;
  const layerProjectiles = new Container();
  const layerImpactFx    = new Container();
  const layerFloatText   = new Container();
  worldRoot.addChild(
    layerGroundFx, layerLoot, layerActors, layerProjectiles,
    layerImpactFx, layerFloatText,
  );

  // Player spawned at arena center
  const player = new Player();
  player.x = ARENA_CENTER_X;
  player.y = ARENA_CENTER_Y;
  player.container.zIndex = Math.round(player.y);
  layerActors.addChild(player.container);

  // ---------------------------------------------------------------------
  // Entity lists
  // ---------------------------------------------------------------------
  const enemies: Enemy[] = [];
  const lootDrops: LootDrop[] = [];

  // Initial seed of monsters happens AFTER the MonsterDirector is wired up
  // (see "Monster ecosystem" block below). The director also owns ongoing
  // pacing — no inline top-up loop needed.

  // ---------------------------------------------------------------------
  // Debug HUD (Pixi overlay, top-right)
  // ---------------------------------------------------------------------
  const hud = new DebugHud();
  app.stage.addChild(hud.container);

  // ---------------------------------------------------------------------
  // Stat debug panel (F8 toggle) — developer-only HTML overlay reading
  // straight from the player's StatManager.
  // ---------------------------------------------------------------------
  const statDebug = new StatDebugPanel();
  statDebug.attach(player.statManager);
  let lastStatDebugRenderAt = 0;

  // ---------------------------------------------------------------------
  // Damage pipeline — single owner of every combat math operation.
  // Cross-cutting reactions (lifesteal, HUD flash, kill counter) live
  // here as event listeners. Per-attack VFX stay inline at the call
  // site because they depend on hit-local data (direction, position).
  // ---------------------------------------------------------------------
  const combat = new DamagePipeline();
  const corruptionSource: CombatEntity = {
    id:    'corruption',
    hp:    1,
    hpMax: 1,
    x:     0,
    y:     0,
    alive: true,
  };

  // ---------------------------------------------------------------------
  // Skill system — single owner of cast logic, projectile spawning, and
  // skill events. SkillWorld is a thin adapter over the enemies array.
  // ---------------------------------------------------------------------
  const skillWorld: SkillWorld = {
    enemiesInRadius(cx, cy, r) {
      const out: CombatEntity[] = [];
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const dx = e.x - cx, dy = e.y - cy;
        if (dx * dx + dy * dy <= r * r) out.push(e);
      }
      return out;
    },
  };
  const skills = new SkillManager(combat, skillWorld);
  skills.worldBounds = { minX: -40, minY: -40, maxX: WORLD_W + 40, maxY: WORLD_H + 40 };
  skills.registerBehavior(SkillBehaviorType.PROJECTILE,  new ProjectileBehavior());
  skills.registerBehavior(SkillBehaviorType.NOVA,        new NovaBehavior());
  skills.registerBehavior(SkillBehaviorType.DASH,        new DashBehavior());
  skills.registerBehavior(SkillBehaviorType.BEAM,        new BeamBehavior());
  skills.registerBehavior(SkillBehaviorType.GROUND_AOE,  new GroundAOEBehavior());
  skills.registerAll(STARTER_SKILLS);
  skills.trackCaster(player);
  // Q W E R bindings (slot 0..3). Slot 0 is also fired by RMB ("primary").
  player.equippedSkills[0] = SKILL_CORRUPT_BOLT.id;
  player.equippedSkills[1] = SKILL_VENOM_NOVA.id;
  player.equippedSkills[2] = SKILL_SHADOW_DASH.id;
  player.equippedSkills[3] = SKILL_CORRUPTION_FIELD.id;

  // Render projectiles via Pixi Graphics. The skill system has no Pixi
  // dependency — we hang a Graphics off `renderHandle` on spawn and clean
  // up on death. Per-frame position sync happens inside the ticker.
  const PROJ_COLORS: Record<string, [number, number]> = {
    physical:  [COLOR.projPlayer,     COLOR.projPlayerTrail],
    poison:    [COLOR.projCorruption, 0x3C1F4A],
    fire:      [0xE07A3E,             0x8A3A1F],
    cold:      [0x5C8CC7,             0x264766],
    lightning: [0xE7C66A,             0xA88A40],
  };
  skills.projectiles.setOnSpawn((p) => {
    const g = new Graphics();
    const [core, halo] = PROJ_COLORS[p.damageType] ?? PROJ_COLORS.physical;
    // Chunky pixel diamond — sized up vs the original so the projectile
    // reads clearly even on the dark Pixel Dark Steel background.
    g.rect(-2, -6, 4, 12).fill(core);
    g.rect(-6, -2, 12, 4).fill(core);
    g.rect(-1, -7, 2, 1).fill(halo);
    g.rect(-1, 6,  2, 1).fill(halo);
    g.rect(-7, -1, 1, 2).fill(halo);
    g.rect(6,  -1, 1, 2).fill(halo);
    g.rect(-2, -2, 4, 4).fill(0xFFFFFF);
    g.x = Math.round(p.x);
    g.y = Math.round(p.y);
    layerProjectiles.addChild(g);
    p.renderHandle = g;
  });
  skills.projectiles.setOnDeath((p) => {
    const g = p.renderHandle as Graphics | null;
    if (g) { g.destroy(); p.renderHandle = null; }
  });

  // Lifesteal — fires on every non-DOT hit dealt by the player.
  combat.events.on(CombatEventType.ON_HIT, (ev) => {
    if (ev.source !== (player as unknown as CombatEntity)) return;
    if (ev.isDOT || ev.finalDamage <= 0) return;
    const ls = player.statManager.getFinalStat(StatType.LIFE_STEAL) / 100;
    if (ls > 0) player.hp = Math.min(player.hpMax, player.hp + ev.finalDamage * ls);
  });
  // Player hit feedback — flash sprite whenever the player takes damage.
  combat.events.on(CombatEventType.ON_DAMAGE_TAKEN, (ev) => {
    if (ev.target === (player as unknown as CombatEntity) && ev.finalDamage > 0) {
      player.applyHitReactions(performance.now());
    }
  });
  // Player death → auto-respawn at arena center with full HP/mana and a
  // 1.5 s i-frame window so the player isn't insta-killed by the same
  // pack that just downed them. Until a proper death/respawn UI ships,
  // this keeps the play loop unblocked instead of stranding the player
  // in `alive=false` (which makes every skill cast return CASTER_DEAD).
  combat.events.on(CombatEventType.ON_KILL, (ev) => {
    if (ev.target !== (player as unknown as CombatEntity)) return;
    const now = performance.now();
    player.alive = true;
    player.hp   = player.hpMax;
    player.mana = player.maxMana;
    player.x = ARENA_CENTER_X;
    player.y = ARENA_CENTER_Y;
    player.dodgeUntil    = now + 1500; // grants isInvulnerable for the i-frame window
    player.hitFlashUntil = now + 200;
    player.castingUntil  = 0;
  });
  // Per-hit VFX on enemies — pipeline owns math, listener owns visuals.
  combat.events.on(CombatEventType.ON_HIT, (ev) => {
    if (ev.source !== (player as unknown as CombatEntity)) return;
    if (ev.wasDodged || ev.finalDamage <= 0) return;
    const tgt = ev.target as unknown as Enemy;
    if (tgt === (player as unknown as Enemy) || tgt.id === corruptionSource.id) return;
    const meta = ev.metadata ?? {};
    const hx = (meta.hitX as number | undefined) ?? tgt.x;
    const hy = (meta.hitY as number | undefined) ?? tgt.y;
    const dirX = (meta.dirX as number | undefined) ?? 0;
    const dirY = (meta.dirY as number | undefined) ?? 0;
    const tNow = performance.now();
    spawnDamageNumber(hx, hy - 16, Math.round(ev.finalDamage), ev.wasCrit);
    if (!ev.isDOT) {
      spawnImpactBurst(hx, hy, ev.wasCrit);
      requestHitStop(ev.wasCrit ? TIME.HIT_STOP_CRIT : TIME.HIT_STOP_NORMAL, tNow);
      requestShake(ev.wasCrit ? TUNE.SHAKE_CRIT : TUNE.SHAKE_HIT, ev.wasCrit ? 220 : 110, tNow);
      if (typeof tgt.applyHitReactions === 'function') {
        tgt.applyHitReactions(tNow, dirX, dirY, ev.wasCrit);
      }
    }
  });
  // Death burst + loot drop on kill.
  combat.events.on(CombatEventType.ON_KILL, (ev) => {
    if (ev.source !== (player as unknown as CombatEntity)) return;
    const tgt = ev.target as unknown as Enemy;
    if (tgt === (player as unknown as Enemy) || tgt.id === corruptionSource.id) return;
    const meta = ev.metadata ?? {};
    const dirX = (meta.dirX as number | undefined) ?? 0;
    const dirY = (meta.dirY as number | undefined) ?? 0;
    const tNow = performance.now();
    tgt.diedThisFrame = true;
    requestHitStop(TIME.HIT_STOP_DEATH, tNow);
    requestShake(TUNE.SHAKE_DEATH, 160, tNow);
    spawnDeathBurst(tgt.x, tgt.y, dirX, dirY, tNow, ev.wasCrit);
    sim.kills++;
    dropLoot(tgt.x, tgt.y, tNow);
  });

  // F9 toggle — combat-pipeline debug log overlay.
  const combatDebug = new CombatDebugPanel();
  combatDebug.attach(combat);

  // F10 toggle — skill debug overlay.
  const skillDebug = new SkillDebugPanel();
  skillDebug.attach(skills);

  // ---------------------------------------------------------------------
  // Skill visual feedback — every cast lands a guaranteed visual cue so
  // the player can tell that Q/W/E/R actually fired even when no enemies
  // are in range. Behavior-aware:
  //   NOVA       → expanding ring at caster
  //   GROUND_AOE → persistent translucent patch at cast position
  //   default    → small spawn flash at caster
  // ---------------------------------------------------------------------
  const NOVA_COLOR_BY_TYPE: Record<string, number> = {
    physical:  0xE7C66A,
    poison:    COLOR.projCorruption,
    fire:      0xE07A3E,
    cold:      0x5C8CC7,
    lightning: 0xE7C66A,
  };
  skills.events.on(SkillEventType.ON_SKILL_CAST, (ev) => {
    const def = ev.skill;
    const ctx = ev.context;
    const tNow = performance.now();
    const colorKey = def.damageType ?? 'physical';
    const ringColor = NOVA_COLOR_BY_TYPE[colorKey] ?? 0xE7C66A;

    if (def.behaviorType === SkillBehaviorType.NOVA) {
      const radius = ((def.behaviorConfig?.radius as number | undefined) ?? 3.5) * 32;
      spawnNovaRing(ctx.castPosition.x, ctx.castPosition.y, radius, ringColor, tNow);
    } else if (def.behaviorType === SkillBehaviorType.GROUND_AOE) {
      const radius   = ((def.behaviorConfig?.radius   as number | undefined) ?? 3.0) * 32;
      const duration = ((def.behaviorConfig?.duration as number | undefined) ?? 4) * 1000;
      spawnGroundPatch(ctx.castPosition.x, ctx.castPosition.y, radius, ringColor, duration, tNow);
    } else if (def.behaviorType === SkillBehaviorType.DASH) {
      // Existing dodge i-frame ring already provides the visual.
    } else {
      // PROJECTILE / BEAM / others — small caster-side flash.
      spawnCastFlash(ev.caster.x, ev.caster.y, ringColor, tNow);
    }
  });

  // ---------------------------------------------------------------------
  // Itemization core — registries + generator + equipment + debug panel.
  // Loot now produces rolled ItemDefinition objects (rarity / implicits /
  // affixes) instead of opaque rarity-only drops.
  // ---------------------------------------------------------------------
  const itemRegistry = new ItemManager();
  itemRegistry.registerAll(STARTER_BASES);
  const affixRegistry = new AffixManager();
  affixRegistry.registerAll(STARTER_AFFIXES);
  const lootGen = new LootGenerator(itemRegistry, affixRegistry);
  const equipment = new EquipmentManager(itemRegistry, affixRegistry, player.statManager);

  // F11 toggle — item / loot debug overlay.
  const itemDebug = new ItemDebugPanel();
  itemDebug.attach(lootGen, itemRegistry, affixRegistry);

  // ---------------------------------------------------------------------
  // Skill bar HUD — wire each slot to its actual skill (glyph + cooldown).
  // The overlay element uses the existing `.slot-cd-overlay` style; we
  // drive it with a conic-gradient sweep that fills as the cooldown
  // elapses (classic ARPG pie-wipe).
  // ---------------------------------------------------------------------
  const SLOT_BIND_TO_SKILL: Record<string, string | undefined> = {
    primary: SKILL_CORRUPT_BOLT.id,
    skill1:  SKILL_CORRUPT_BOLT.id,
    skill2:  SKILL_VENOM_NOVA.id,
    skill3:  SKILL_SHADOW_DASH.id,
    skill4:  SKILL_CORRUPTION_FIELD.id,
  };
  document.querySelectorAll<HTMLElement>('.hud-skill-bar .slot').forEach((slotEl) => {
    const bind = slotEl.dataset.keybind;
    if (!bind) return;
    const skillId = SLOT_BIND_TO_SKILL[bind];
    if (skillId) {
      const def = skills.get(skillId);
      if (def) {
        const glyphEl = slotEl.querySelector<HTMLElement>('.slot-glyph');
        if (glyphEl) glyphEl.textContent = def.icon;
      }
    }
    if (!slotEl.querySelector('.slot-cd-overlay')) {
      const ov = document.createElement('div');
      ov.className = 'slot-cd-overlay';
      slotEl.appendChild(ov);
    }
  });

  /** Per-frame cooldown render. Conic-gradient pie sweep — classic ARPG. */
  function updateSkillSlotHUD(nowMs: number): void {
    document.querySelectorAll<HTMLElement>('.hud-skill-bar .slot').forEach((slotEl) => {
      const bind = slotEl.dataset.keybind;
      if (!bind) return;
      const ov = slotEl.querySelector<HTMLElement>('.slot-cd-overlay');
      if (!ov) return;
      // Dodge slot has its own cooldown source on the Player.
      if (bind === 'dodge') {
        const remaining = Math.max(0, player.dodgeReadyAt - nowMs);
        const total = TIME.DODGE_COOLDOWN;
        if (remaining > 0) {
          const sweepDeg = (1 - remaining / total) * 360;
          slotEl.classList.add('is-cooling-down');
          ov.style.background = `conic-gradient(transparent 0deg ${sweepDeg}deg, rgba(10,12,16,0.78) ${sweepDeg}deg 360deg)`;
          ov.textContent = remaining >= 1000 ? Math.ceil(remaining / 1000).toString() : (remaining / 1000).toFixed(1);
        } else {
          slotEl.classList.remove('is-cooling-down');
          ov.textContent = '';
        }
        return;
      }
      const skillId = SLOT_BIND_TO_SKILL[bind];
      if (!skillId) return;
      const def = skills.get(skillId);
      if (!def) return;
      const totalMs = def.cooldown * 1000;
      if (totalMs <= 0) {
        slotEl.classList.remove('is-cooling-down');
        ov.textContent = '';
        return;
      }
      const remaining = skills.cooldowns.remaining(skillId, nowMs);
      if (remaining > 0) {
        const sweepDeg = (1 - remaining / totalMs) * 360;
        slotEl.classList.add('is-cooling-down');
        ov.style.background = `conic-gradient(transparent 0deg ${sweepDeg}deg, rgba(10,12,16,0.78) ${sweepDeg}deg 360deg)`;
        ov.textContent = remaining >= 1000 ? Math.ceil(remaining / 1000).toString() : (remaining / 1000).toFixed(1);
      } else {
        slotEl.classList.remove('is-cooling-down');
        ov.textContent = '';
      }
    });
  }

  /** Pickup radius in pixels (spec: 1.25 world units × 32 px/unit). */
  const PICKUP_RADIUS_PX = 40;

  // F12 console hook for emergency debugging — no on-screen UI.
  // Paste into the browser console:
  //   window.__bad.skills        — SkillManager
  //   window.__bad.player        — Player runtime state
  //   window.__bad.sim           — fps / projectile / enemy counts
  (window as any).__bad = {
    get skills() { return skills; },
    get player() { return player; },
    sim,
  };

  // ---------------------------------------------------------------------
  // Monster ecosystem — registries, spawner, director, AI tick.
  // The director owns pacing + composition; main.ts only provides the
  // entity factory (Pixi-bound Enemy) + the world-state callbacks for
  // the AI context.
  // ---------------------------------------------------------------------
  const monsterMgr = new MonsterManager();
  monsterMgr.registerDefinitions(STARTER_MONSTERS);
  monsterMgr.registerAIs([
    new MeleeChaseAI(), new RangedKiteAI(), new ChargerAI(),
    new SuicideAI(),    new SummonerAI(),
  ]);
  const eliteMgr = new EliteManager();
  const monsterFactory: MonsterFactory = (def, level, pos, opts) => {
    const m = new Enemy(pos.x, pos.y, def, level);
    if (opts.summonerId) m.summonerId = opts.summonerId;
    // Elite visual hint (e.g. TITANIC 1.25 sprite scale) applies after
    // the modifier — EliteManager.applyTo runs in MonsterSpawner.
    if (opts.eliteModifierId) {
      const def = eliteMgr.get(opts.eliteModifierId);
      if (def?.renderHints?.scale) m.baseVisualScale = def.renderHints.scale;
    }
    m.container.zIndex = Math.round(m.y);
    enemies.push(m);
    layerActors.addChild(m.container);
    sim.enemyCount++;
    return m;
  };
  const monsterSpawner = new MonsterSpawner(monsterMgr, eliteMgr, monsterFactory);
  const monsterDirector = new MonsterDirector(monsterSpawner, {
    dispatchIntervalSec: 4,
  });
  const monsterProjectiles = new MonsterProjectileManager();
  monsterProjectiles.setOnSpawn((p) => {
    const g = new Graphics();
    g.rect(-3, -1, 6, 2).fill(0xC86B6B);
    g.rect(-1, -3, 2, 6).fill(0xC86B6B);
    g.rect(-1, -1, 2, 2).fill(0xF4E2C0);
    g.x = Math.round(p.x); g.y = Math.round(p.y);
    layerProjectiles.addChild(g);
    p.renderHandle = g;
  });
  monsterProjectiles.setOnDeath((p) => {
    const g = p.renderHandle as Graphics | null;
    if (g) { g.destroy(); p.renderHandle = null; }
  });

  // Initial spawn — one wave at startup so the arena isn't empty.
  monsterDirector.dispatchOne({ now: 0, player: { x: player.x, y: player.y }, activeMonsters: enemies });

  // Aggro on damage taken — set on the monster when it's the target.
  combat.events.on(CombatEventType.ON_DAMAGE_TAKEN, (ev) => {
    if (ev.target === (player as unknown as CombatEntity)) return;
    const m = ev.target as unknown as Enemy;
    if (typeof (m as any).aggroUntil === 'number') {
      AggroManager.acquire(m as unknown as MonsterRuntime, performance.now());
    }
  });

  // XP + volatile death + loot multiplier — all on ON_KILL when the
  // killed target is a monster owned by the live `enemies` array.
  combat.events.on(CombatEventType.ON_KILL, (ev) => {
    const m = ev.target as unknown as Enemy;
    if (typeof (m as any).definition === 'undefined') return; // not a monster
    const isElite = m.eliteModifierIds.length > 0;
    const xp = computeXPReward(m.definition, m.level, isElite);
    const levels = player.gainXP(xp);
    if (levels > 0) {
      // Refill HP / mana on level-up — small QoL touch.
      player.hp = player.hpMax;
      player.mana = player.maxMana;
    }
    // Volatile elite — fire an AOE blast through the pipeline.
    if (m.eliteModifierIds.includes(ELITE_VOLATILE.id)) {
      const def = eliteMgr.get(ELITE_VOLATILE.id)!.onDeathExplosion!;
      const radiusPx = def.radius * 32;
      const dxp = player.x - m.x, dyp = player.y - m.y;
      if (dxp * dxp + dyp * dyp <= radiusPx * radiusPx && player.alive && !player.isInvulnerable(performance.now())) {
        combat.resolve(m, player, {
          sourceEntityId: m.id,
          targetEntityId: player.id,
          sourceTags:     [...def.tags],
          baseDamage:     def.baseDamage,
          damageType:     def.damageType,
          canCrit:        false,
          canBeBlocked:   false,
          canBeDodged:    false,
        });
      }
    }
    // Loot multiplier: bonus drops on top of the single base drop.
    const mult = computeLootMultiplier(m.definition, m.level, isElite);
    const extraGuaranteed = Math.floor(mult) - 1;
    for (let i = 0; i < extraGuaranteed; i++) {
      dropLoot(m.x + (Math.random() - 0.5) * 24, m.y + (Math.random() - 0.5) * 24, performance.now());
    }
    if (Math.random() < (mult - Math.floor(mult))) {
      dropLoot(m.x + (Math.random() - 0.5) * 24, m.y + (Math.random() - 0.5) * 24, performance.now());
    }
    // Clean up elite modifiers from the dying monster's StatManager.
    if (isElite) eliteMgr.removeFrom(m as unknown as MonsterRuntime);
  });

  // F12 — monster debug overlay.
  const monsterDebug = new MonsterDebugPanel();
  monsterDebug.attach(monsterDirector, () => enemies as unknown as readonly MonsterRuntime[]);

  // Per-frame state mutated by closures below.
  let nextSpawnAt = 0; void nextSpawnAt; // legacy compat for the removed inline spawner

  // ---------------------------------------------------------------------
  // HUD bridge — wire player state to HTML HUD overlay
  // ---------------------------------------------------------------------
  const $hudHp        = document.getElementById('hudHp')!;
  const $hpFluid      = document.getElementById('hpFluid')!;
  const $hudCorrupt   = document.getElementById('hudCorruption')!;
  let corruptionMeter = 0;  // 0-100, gained from standing in corruption zones

  function updateHtmlHud() {
    $hudHp.textContent = `${Math.max(0, Math.floor(player.hp))}`;
    const pct = Math.max(0, Math.min(100, player.hp / player.hpMax * 100));
    ($hpFluid as HTMLElement).style.height = pct + '%';
    $hudCorrupt.textContent = `${Math.floor(corruptionMeter)}%`;
  }
  updateHtmlHud();

  // ---------------------------------------------------------------------
  // Scene wiring: menu buttons + panel hotkeys + ESC
  // ---------------------------------------------------------------------
  document.getElementById('menuNewGame')?.addEventListener('click', () => {
    setScene('PLAYING');
  });
  // The other menu buttons are placeholders for V1
  document.getElementById('menuCharacter')?.addEventListener('click', () => {
    // Treat as "go to character panel directly" — useful demo of integration
    setScene('PANEL_CHAR');
  });
  document.getElementById('menuSettings')?.addEventListener('click', () => {
    setScene('PANEL_SETTINGS');
  });
  document.getElementById('menuExit')?.addEventListener('click', () => {
    console.log('[EXIT] would close runtime');
  });
  // Panel close buttons — return to wherever we came from (MENU/PLAYING/PAUSE)
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => setScene(getReturnScene()));
  });

  // Pause overlay buttons
  document.getElementById('pauseResume')?.addEventListener('click', () => {
    setScene('PLAYING');
  });
  document.getElementById('pauseSettings')?.addEventListener('click', () => {
    // Open Settings; closing Settings will return to PAUSE per getReturnScene
    setScene('PANEL_SETTINGS');
  });
  document.getElementById('pauseToMenu')?.addEventListener('click', () => {
    setScene('MENU');
  });

  // Keyboard panel toggles + ESC (action-aware, reads rebindable keybinds)
  window.addEventListener('keydown', (e) => {
    // ESC / menuBack: PLAYING <-> PAUSE (pause overlay), panel -> return scene
    if (e.code === getBinding('menuBack')) {
      if (isPanelOpen())                  setScene(getReturnScene());
      else if (getScene() === 'PLAYING')  setScene('PAUSE');
      else if (getScene() === 'PAUSE')    setScene('PLAYING');
      // MENU: ESC no-op
      return;
    }
    // Other hotkeys disabled during MENU + PAUSE (only ESC works in those)
    const s = getScene();
    if (s === 'MENU' || s === 'PAUSE') return;
    if (e.code === getBinding('openInventory'))
      setScene(s === 'PANEL_INV'   ? getReturnScene() : 'PANEL_INV');
    if (e.code === getBinding('openCharacter'))
      setScene(s === 'PANEL_CHAR'  ? getReturnScene() : 'PANEL_CHAR');
    if (e.code === getBinding('openSkill'))
      setScene(s === 'PANEL_SKILL' ? getReturnScene() : 'PANEL_SKILL');
  });

  // When entering PLAYING from MENU, reset player position
  onSceneChange((s) => {
    if (s === 'PLAYING' && (player.hp <= 0 || !player.alive)) {
      // Soft "respawn" on returning from menu after death
      player.hp = player.hpMax;
      player.alive = true;
      player.x = ARENA_CENTER_X;
      player.y = ARENA_CENTER_Y;
    }
  });

  // ---------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------
  let lastTime = performance.now();
  let fpsAccum = 0; let fpsFrames = 0; let fpsTimer = 0;

  app.ticker.add(() => {
    const now = performance.now();
    const rawDt = now - lastTime;
    lastTime = now;

    fpsAccum += rawDt; fpsFrames++; fpsTimer += rawDt;
    if (fpsTimer >= 250) {
      sim.fps = (fpsFrames / fpsAccum) * 1000;
      sim.frameMs = fpsAccum / fpsFrames;
      fpsAccum = 0; fpsFrames = 0; fpsTimer = 0;
    }

    // ===== Camera + render position =====
    // Always update camera so the view follows the player even when
    // panels are open (per spec — "combat 不暂停").
    cameraFollow(player.x, player.y);
    const cam = getCameraOffset();
    const shk = computeShake(now);
    worldRoot.position.set(cam.x + shk.x, cam.y + shk.y);

    // Visibility: hide game world entirely while in MENU (HTML menu is shown)
    worldRoot.visible = getScene() !== 'MENU';
    hud.container.visible = getScene() !== 'MENU';

    // Pause game tick during MENU
    if (!shouldGameTick()) {
      hud.update();
      endFrameInput();
      return;
    }

    // Global hit-stop freeze
    const dt = isInHitStop(now) ? 0 : Math.min(rawDt, 33);

    // ----- Corruption zone DOT -----
    const corruptionDot = updateCorruptionZones(now, player.x, player.y);
    if (corruptionDot > 0) {
      const dotCtx: DamageContext = {
        sourceEntityId: corruptionSource.id,
        targetEntityId: player.id,
        sourceTags:     ['dot', 'corruption'],
        baseDamage:     corruptionDot,
        damageType:     DamageType.POISON,
        canCrit:        false,
        canBeBlocked:   false,
        canBeDodged:    false,
        isDOT:          true,
      };
      combat.resolve(corruptionSource, player, dotCtx);
      corruptionMeter = Math.min(100, corruptionMeter + 0.5);
      requestShake(2, 60, now);
    } else {
      // Slow decay when out of corruption
      corruptionMeter = Math.max(0, corruptionMeter - 0.04);
    }

    // ----- Pickup input (F by default) -----
    if (wasActionPressed('pickup')) {
      let nearestIdx = -1;
      let nearestSq = PICKUP_RADIUS_PX * PICKUP_RADIUS_PX;
      for (let i = 0; i < lootDrops.length; i++) {
        const d = lootDrops[i];
        if (!d.alive || !d.item) continue;
        const dx = d.x - player.x, dy = d.y - player.y;
        const ds = dx * dx + dy * dy;
        if (ds < nearestSq) { nearestSq = ds; nearestIdx = i; }
      }
      if (nearestIdx >= 0) {
        const d = lootDrops[nearestIdx];
        if (d.item && player.pushInventory(d.item)) {
          d.alive = false; // sweep handles container.destroy()
        }
      }
    }

    // ----- Movement input (rebindable 'move' action — default LMB held) -----
    const worldMouse = screenToWorld(mouse.world.x, mouse.world.y);
    if (isActionHeld('move')) {
      player.setMoveTarget(worldMouse.x, worldMouse.y);
    } else {
      player.clearMoveTarget();
    }

    // ----- Player tick -----
    player.update(dt, now, spawnFootstepDust);

    // ----- Skill input → SkillExecutor -----
    // RMB ("primary") = slot 0 (matches the existing muscle-memory).
    // Q W E R                    = slots 0, 1, 2, 3.
    // Held / repeated presses are rate-limited by skill cooldown + cast time.
    const dxAim = worldMouse.x - player.x;
    const dyAim = worldMouse.y - player.y;
    const magAim = Math.hypot(dxAim, dyAim) || 1;
    const aimX = dxAim / magAim;
    const aimY = dyAim / magAim;

    function castSlot(slot: number) {
      const id = player.equippedSkills[slot];
      if (!id) return;
      const def = skills.get(id);
      if (!def) return;
      // Cast position: ground target = cursor, everything else = caster.
      const isGroundTarget = def.targetingType === SkillTargetingType.GROUND_TARGET;
      const ctx: SkillContext = {
        casterId:     player.id,
        skillId:      id,
        castPosition: isGroundTarget ? { x: worldMouse.x, y: worldMouse.y } : { x: player.x, y: player.y },
        direction:    { x: aimX, y: aimY },
        runtimeTags:  [],
      };
      const r = skills.cast(player, id, ctx, now);
      if (!r.ok && r.reason) skillDebug.logCastFailure(id, r.reason);
    }

    if (isActionHeld('primary')) castSlot(0);
    if (isActionHeld('skill1'))  castSlot(0);
    if (isActionHeld('skill2'))  castSlot(1);
    if (isActionHeld('skill3'))  castSlot(2);
    if (isActionHeld('skill4'))  castSlot(3);

    // ----- Monster director (pacing + composition) -----
    monsterDirector.update({
      now, player: { x: player.x, y: player.y }, activeMonsters: enemies as unknown as readonly MonsterRuntime[],
    });

    // ----- Monster AI tick + entity update -----
    const aiCtx: AIContext = {
      now, dtSec: dt / 1000,
      player: {
        id: player.id, x: player.x, y: player.y,
        statManager: player.statManager, alive: player.alive,
        isInvulnerable: (n: number) => player.isInvulnerable(n),
      },
      damage: combat,
      spawnProjectile: (owner, origin, dir, cfg) => {
        monsterProjectiles.spawn({
          owner, origin, dir,
          speed: cfg.speed,
          damage: cfg.damage,
          damageType: cfg.damageType,
          tags: cfg.tags,
          radius: cfg.radius,
          maxDistance: cfg.maxDistance,
          now,
        });
      },
      spawnSummon: (defId, pos, ownerId) => {
        return monsterSpawner.spawn({
          definitionId: defId,
          position:     pos,
          summonerId:   ownerId,
          eliteChance:  0,
        });
      },
      livingSummonsOf: (ownerId) => enemies.filter((m) => m.alive && m.summonerId === ownerId).length,
      enemiesInRadius: (cx, cy, r) => {
        const out: CombatEntity[] = [];
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = e.x - cx, dy = e.y - cy;
          if (dx * dx + dy * dy <= r * r) out.push(e);
        }
        return out;
      },
    };
    for (const e of enemies) {
      if (!e.alive) continue;
      const ai = monsterMgr.aiFor(e.definition);
      if (ai) ai.tick(e as unknown as MonsterRuntime, aiCtx);
      e.update(dt, now);
    }

    // ----- Entity separation (no-overlap physics) -----
    // Push overlapping pairs apart so player and enemies feel like real
    // bodies instead of free-passing sprites. Mass is asymmetric: player
    // is heavier than a single enemy (30/70 split); enemies vs enemies
    // are even (50/50). Player phases through during dodge i-frames.
    const PLAYER_R   = TUNE.PLAYER_RADIUS;
    const ENEMY_R    = TUNE.ENEMY_RADIUS;
    const PE_MIN_SQ  = (PLAYER_R + ENEMY_R) ** 2;
    const EE_MIN     = ENEMY_R * 2;
    const EE_MIN_SQ  = EE_MIN * EE_MIN;
    const playerPhase = player.isInvulnerable(now);

    if (!playerPhase) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dsq = dx * dx + dy * dy;
        if (dsq >= PE_MIN_SQ || dsq <= 0.0001) continue;
        const dist = Math.sqrt(dsq);
        const overlap = (PLAYER_R + ENEMY_R) - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        player.x -= nx * overlap * 0.30;
        player.y -= ny * overlap * 0.30;
        e.x      += nx * overlap * 0.70;
        e.y      += ny * overlap * 0.70;
      }
    }
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dsq = dx * dx + dy * dy;
        if (dsq >= EE_MIN_SQ || dsq <= 0.0001) continue;
        const dist = Math.sqrt(dsq);
        const overlap = EE_MIN - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        // Per-role separation strength (spec patch 3): SWARM=0.35 lets
        // swarms partially overlap; non-SWARM=0.80 keeps them apart.
        const strength = Math.min(a.separationStrength, b.separationStrength);
        const halfPush = overlap * strength * 0.5;
        a.x -= nx * halfPush;
        a.y -= ny * halfPush;
        b.x += nx * halfPush;
        b.y += ny * halfPush;
      }
    }
    // Clamp post-separation positions back into the world.
    const WBOUND = 40;
    player.x = Math.max(WBOUND, Math.min(WORLD_W - WBOUND, player.x));
    player.y = Math.max(WBOUND, Math.min(WORLD_H - WBOUND, player.y));
    for (const e of enemies) {
      if (!e.alive) continue;
      e.x = Math.max(WBOUND, Math.min(WORLD_W - WBOUND, e.x));
      e.y = Math.max(WBOUND, Math.min(WORLD_H - WBOUND, e.y));
    }
    // Y-sort: lower-y actors render behind higher-y actors (depth illusion).
    // Pixi reads container.zIndex when parent has sortableChildren=true.
    player.container.x = Math.round(player.x);
    player.container.y = Math.round(player.y);
    player.container.zIndex = Math.round(player.y);
    for (const e of enemies) {
      if (!e.alive) continue;
      e.container.x = Math.round(e.x);
      e.container.y = Math.round(e.y);
      e.container.zIndex = Math.round(e.y);
    }

    // ----- Contact damage check (post-separation) -----
    for (const e of enemies) {
      if (!e.alive) continue;
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < TUNE.PLAYER_RADIUS + TUNE.ENEMY_RADIUS && e.canContact(now)) {
        if (!player.isInvulnerable(now)) {
          const contactCtx: DamageContext = {
            sourceEntityId: e.id,
            targetEntityId: player.id,
            sourceTags:     ['melee', 'attack'],
            baseDamage:     TUNE.ENEMY_DAMAGE,
            damageType:     DamageType.PHYSICAL,
            canCrit:        false,
            canBeBlocked:   true,
            canBeDodged:    true,
          };
          combat.resolve(e, player, contactCtx);
        }
        e.applyContactCooldown(now);
        requestShake(TUNE.SHAKE_HURT, 220, now);
        requestHitStop(TIME.HIT_STOP_HURT, now);
      }
    }

    // ----- Skill system tick (pending casts, projectile collisions, ground AOE ticks) -----
    skills.update(now, dt / 1000);
    // Sync projectile graphics to entity positions.
    for (const p of skills.projectiles.all()) {
      const g = p.renderHandle as Graphics | null;
      if (!g) continue;
      g.x = Math.round(p.x);
      g.y = Math.round(p.y);
    }
    sim.projectileCount = skills.projectiles.count();

    for (const v of vfxList) v.update(dt, now);
    for (const d of dmgList) d.update(dt, now);
    for (const l of lootDrops) l.update(dt, now);
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].alive) {
        enemies[i].container.destroy();
        enemies.splice(i, 1);
        sim.enemyCount--;
      }
    }
    for (let i = vfxList.length - 1; i >= 0; i--) {
      if (!vfxList[i].alive) {
        vfxList[i].container.destroy();
        vfxList.splice(i, 1);
        sim.vfxCount = Math.max(0, sim.vfxCount - 1);
      }
    }
    for (let i = dmgList.length - 1; i >= 0; i--) {
      if (!dmgList[i].alive) {
        dmgList[i].container.destroy();
        dmgList.splice(i, 1);
      }
    }

    // HUD updates
    updateHtmlHud();
    updateSkillSlotHUD(now);
    hud.update();

    // Throttle the stat debug panel to ~5 Hz so DOM writes stay cheap.
    if (statDebug.isVisible() && now - lastStatDebugRenderAt > 200) {
      statDebug.render();
      lastStatDebugRenderAt = now;
    }
    // CombatDebugPanel + SkillDebugPanel render reactively from their
    // event listeners; just keep references alive so their keydown
    // handlers stay registered for the app lifetime.
    void combatDebug;
    void skillDebug;
    void itemDebug;
    void equipment;
    void monsterDebug;

    // ----- Monster projectile tick + render sync -----
    monsterProjectiles.update({
      dtSec: dt / 1000,
      now,
      pipeline: combat,
      player,
      worldBounds: { minX: -40, minY: -40, maxX: WORLD_W + 40, maxY: WORLD_H + 40 },
      isPlayerInvulnerable: (n) => player.isInvulnerable(n),
    });
    for (const p of monsterProjectiles.all()) {
      const g = p.renderHandle as Graphics | null;
      if (!g) continue;
      g.x = Math.round(p.x); g.y = Math.round(p.y);
    }

    endFrameInput();
  });

  // ---------------------------------------------------------------------
  // VFX systems (unchanged from V2)
  // ---------------------------------------------------------------------
  type Vfx = {
    container: Container, alive: boolean, spawnAt: number,
    update: (dt: number, now: number) => void,
  };
  const vfxList: Vfx[] = [];

  function spawnImpactBurst(x: number, y: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const c = isCrit ? 0xFFFFFF : 0xF4F2E8;
    const rim = isCrit ? COLOR.tier1 : 0xD2D6DC;
    const g = new Graphics();
    g.rect(-4, -1, 8, 2).fill(c);
    g.rect(-1, -4, 2, 8).fill(c);
    g.rect(-7, -2, 3, 4).fill(rim);
    g.rect(4, -2, 3, 4).fill(rim);
    g.rect(-2, -7, 4, 3).fill(rim);
    g.rect(-2, 4, 4, 3).fill(rim);
    cnt.addChild(g);
    const lifeMs = TIME.IMPACT_FRAME;
    const spawn = performance.now();
    vfxList.push({
      container: cnt, alive: true, spawnAt: spawn,
      update(_dt, n) {
        const t = (n - spawn) / lifeMs;
        if (t >= 1) { this.alive = false; return; }
        cnt.scale.set(1 + t * 0.8);
        cnt.alpha = 1 - t;
      },
    });
    sim.vfxCount++;
  }

  function spawnDeathBurst(x: number, y: number, dirX: number, dirY: number, now: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const count = isCrit ? TUNE.DEATH_PARTICLE_COUNT_CRIT : TUNE.DEATH_PARTICLE_COUNT;
    const particles: { g: Graphics, vx: number, vy: number }[] = [];
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 220 + Math.random() * 320;
      const g = new Graphics().rect(-2, -2, 4, 4).fill(isCrit ? COLOR.tier1 : COLOR.enemyHit);
      cnt.addChild(g);
      particles.push({ g, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
    }
    const ring = new Graphics();
    cnt.addChild(ring);
    vfxList.push({
      container: cnt, alive: true, spawnAt: now,
      update(dtMs, n) {
        const t = (n - now) / TIME.DEATH_BURST;
        if (t >= 1) { this.alive = false; return; }
        const dt = dtMs / 1000;
        for (const p of particles) {
          p.g.x += p.vx * dt;
          p.g.y += p.vy * dt;
          p.g.alpha = Math.max(0, 1 - t * 1.4);
          p.vx *= 0.90;
          p.vy *= 0.90;
        }
        ring.clear();
        const r = 8 + t * 56;
        const rcol = isCrit ? COLOR.tier1 : 0xD6DBE3;
        const a = Math.max(0, 1 - t * 1.6);
        for (let k = 0; k < 3; k++) {
          ring.circle(0, 0, r + k * 2).stroke({ color: rcol, width: 1, alpha: a * (1 - k * 0.25) });
        }
      },
    });
    sim.vfxCount++;
  }

  function spawnMuzzleFlash(x: number, y: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const g = new Graphics()
      .rect(-3, -1, 6, 2).fill(0xFFFFFF)
      .rect(-1, -3, 2, 6).fill(0xFFFFFF);
    cnt.addChild(g);
    const life = 70;
    const start = performance.now();
    vfxList.push({
      container: cnt, alive: true, spawnAt: start,
      update(_dt, n) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.alpha = 1 - t;
        cnt.scale.set(1 + t * 0.4);
      },
    });
  }

  /**
   * Cast flash for PROJECTILE / BEAM skills — concentric rings + a
   * white core punch so it's impossible to miss against the dark
   * Pixel-Dark-Steel background.
   */
  function spawnCastFlash(x: number, y: number, color: number, now: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const core = new Graphics();
    const ring = new Graphics();
    cnt.addChild(core);
    cnt.addChild(ring);
    const life = 380;
    vfxList.push({
      container: cnt, alive: true, spawnAt: now,
      update(_dt, n) {
        const t = (n - now) / life;
        if (t >= 1) { this.alive = false; return; }
        const a = 1 - t;
        // Bright white core that punches outward — front-loaded.
        core.clear();
        const coreR = 8 + t * 38;
        core.circle(0, 0, coreR).fill({ color: 0xFFFFFF, alpha: a * a * 0.55 });
        // Triple concentric rings — reads on any background.
        ring.clear();
        const r1 = 16 + t * 52;
        ring.circle(0, 0, r1).stroke({ color, width: 4, alpha: a });
        ring.circle(0, 0, r1 - 5).stroke({ color: 0xFFFFFF, width: 2, alpha: a * 0.85 });
        ring.circle(0, 0, r1 + 7).stroke({ color, width: 2, alpha: a * 0.45 });
      },
    });
  }

  /**
   * Expanding ring for NOVA skills. Initial flash fill + bright white
   * inner edge + trailing color rings. Reads instantly even with no
   * enemies in the AOE.
   */
  function spawnNovaRing(x: number, y: number, radiusPx: number, color: number, now: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerImpactFx.addChild(cnt);
    const flash = new Graphics();
    const ring = new Graphics();
    cnt.addChild(flash);
    cnt.addChild(ring);
    const life = 640;
    vfxList.push({
      container: cnt, alive: true, spawnAt: now,
      update(_dt, n) {
        const t = (n - now) / life;
        if (t >= 1) { this.alive = false; return; }
        const a = 1 - t;
        // Initial fill flash — punches the eye on the first 180 ms.
        flash.clear();
        if (t < 0.28) {
          const ft = t / 0.28;
          flash.circle(0, 0, radiusPx * ft).fill({ color, alpha: 0.48 * (1 - ft) });
        }
        // Triple-line expanding ring.
        ring.clear();
        const r = radiusPx * Math.min(1, t * 1.1);
        ring.circle(0, 0, r).stroke({ color: 0xFFFFFF, width: 5, alpha: a });
        ring.circle(0, 0, r - 6).stroke({ color, width: 4, alpha: a });
        ring.circle(0, 0, r + 5).stroke({ color, width: 2, alpha: a * 0.55 });
      },
    });
  }

  /**
   * Persistent danger-zone disc for GROUND_AOE skills. Strong rim +
   * layered fill — visible across the entire skill duration.
   */
  function spawnGroundPatch(x: number, y: number, radiusPx: number, color: number, durationMs: number, now: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerGroundFx.addChild(cnt);
    const fill = new Graphics();
    const rim = new Graphics();
    cnt.addChild(fill);
    cnt.addChild(rim);
    vfxList.push({
      container: cnt, alive: true, spawnAt: now,
      update(_dt, n) {
        const t = (n - now) / durationMs;
        if (t >= 1) { this.alive = false; return; }
        const pulse = 0.85 + Math.sin(t * Math.PI * 6) * 0.15;
        // Layered fill — outer + inner discs give a soft gradient feel.
        fill.clear();
        fill.circle(0, 0, radiusPx).fill({ color, alpha: 0.34 + (1 - t) * 0.18 });
        fill.circle(0, 0, radiusPx * 0.7).fill({ color, alpha: 0.20 });
        // Triple rim — strong outer color, bright white mid, soft halo.
        rim.clear();
        rim.circle(0, 0, radiusPx).stroke({ color, width: 4, alpha: 0.95 * pulse * (1 - t * 0.4) });
        rim.circle(0, 0, radiusPx - 5).stroke({ color: 0xFFFFFF, width: 2, alpha: 0.55 * (1 - t * 0.3) });
        rim.circle(0, 0, radiusPx + 3).stroke({ color, width: 2, alpha: 0.50 * (1 - t) });
      },
    });
  }

  function spawnFootstepDust(x: number, y: number) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerGroundFx.addChild(cnt);
    const g = new Graphics()
      .rect(-2, -1, 4, 2).fill({ color: 0xAAB0BA, alpha: 0.42 });
    cnt.addChild(g);
    const start = performance.now();
    const life = 280;
    vfxList.push({
      container: cnt, alive: true, spawnAt: start,
      update(_dt, n) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.alpha = (1 - t) * 0.5;
        cnt.scale.x = 1 + t * 0.6;
      },
    });
  }

  // ---------------------------------------------------------------------
  // Damage numbers (in-world floating text)
  // ---------------------------------------------------------------------
  type DmgNum = {
    container: Container, alive: boolean, spawnAt: number,
    update: (dt: number, now: number) => void,
  };
  const dmgList: DmgNum[] = [];

  function spawnDamageNumber(x: number, y: number, value: number, isCrit: boolean) {
    const cnt = new Container();
    cnt.x = Math.round(x); cnt.y = Math.round(y);
    layerFloatText.addChild(cnt);
    const txt = new Text({
      text: isCrit ? `${value}!` : `${value}`,
      style: {
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: isCrit ? 24 : 18,
        fontWeight: '700',
        fill: isCrit ? COLOR.dmgCrit : COLOR.dmgNormal,
        align: 'center',
      },
    });
    txt.anchor.set(0.5, 1);
    cnt.addChild(txt);
    const start = performance.now();
    const life = TIME.DAMAGE_LIFESPAN;
    const drift = isCrit ? 56 : 38;
    const wob = (Math.random() - 0.5) * 18;
    dmgList.push({
      container: cnt, alive: true, spawnAt: start,
      update(_dt, n) {
        const t = (n - start) / life;
        if (t >= 1) { this.alive = false; return; }
        cnt.y = Math.round(y - t * drift);
        cnt.x = Math.round(x + wob * t);
        cnt.alpha = t < 0.85 ? 1 : (1 - t) / 0.15;
      },
    });
  }

  function dropLoot(x: number, y: number, now: number) {
    // Item level = monster level. V1 has no level scaling on enemies yet,
    // so floor at 1 — once enemy.level lands this becomes
    // ItemLevelCalculator.fromMonsterLevel(enemy.level).
    const item = lootGen.generate({ itemLevel: 1, position: { x, y } });
    if (!item) return;
    const base = itemRegistry.get(item.baseTypeId);
    const baseName = base?.name ?? '未知物品';
    const rarityLower =
      item.rarity === ItemRarity.RARE  ? 'rare'  :
      item.rarity === ItemRarity.MAGIC ? 'magic' :
                                          'normal';
    const drop = new LootDrop(x, y, rarityLower, now, baseName);
    drop.item = item;
    lootDrops.push(drop);
    layerLoot.addChild(drop.container);
    sim.lootDrops++;
  }
})();
