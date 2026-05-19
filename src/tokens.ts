/**
 * BAD ARPG — Runtime tokens (Phase 2)
 * Mirrors the values in `runtime/css/tokens.css` so Pixi entities use the
 * same color/spacing/timing language as the Phase 1 HTML blueprints.
 */

// =========================================================================
// CANVAS / WORLD
// =========================================================================
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

// World is bigger than viewport. Camera follows player; world stays a
// fixed 3200x3200 arena per Phase 2A spec.
export const WORLD_W = 3200;
export const WORLD_H = 3200;

// Open combat arena at the center; ruins/corruption pits outside.
export const ARENA_CENTER_X = WORLD_W / 2;
export const ARENA_CENTER_Y = WORLD_H / 2;
export const ARENA_HALF = 700;  // ~1400x1400 open combat arena

// =========================================================================
// SIMULATION BOUNDARIES (Step 5 of Phase 2 directive)
// These are tuned to prevent system-design runaway. Not final numbers.
// =========================================================================
export const SIM_BOUNDS = {
  MAX_PROJECTILES_ON_SCREEN: 80,
  MAX_CHAIN_DEPTH:           3,
  MAX_TRIGGER_DEPTH:         2,
  MAX_ACTIVE_ENEMIES:        40,
  MAX_MAJOR_VFX:             16,
} as const;

// =========================================================================
// COLORS (32-bit RGB, 0xRRGGBB — matches CSS hex equivalents)
// =========================================================================
export const COLOR = {
  // Background / atmosphere
  skyTop:        0x0A0C10,
  skyBottom:     0x1A1D22,
  groundTop:     0x181C24,
  groundBot:     0x0F1218,
  silCastle:     0x16181D,
  silForest:     0x23262B,
  frameOuter:    0x1A1D22,
  frameInner:    0x2A2E35,
  frameRim:      0x3A4048,
  // HUD text
  hudText:       0xBFC5CE,
  hudTextDim:    0x8C9198,
  hudTextStrong: 0xD6DBE3,
  // HP / mana
  hpCore:        0x7E1F24,
  hpHigh:        0xB2383F,
  manaCore:      0x264766,
  manaHigh:      0x5C8CC7,
  // Loot rarities
  rarityNormal:    0x8C9198,
  rarityMagic:     0x5A7FCF,
  rarityRare:      0xD2B15A,
  rarityLegendary: 0xE1A84A,
  rarityHeaven:    0xF4F2E8,
  // Build-enabling / tier 1
  tier1:           0xE1A84A,
  // Damage numbers
  dmgNormal:    0xD2D6DC,
  dmgCrit:      0xE7C66A,
  // Combat actors (placeholders)
  player:       0xBFC5CE,
  playerHit:    0xFFFFFF,
  enemy:        0x5A2A2E,
  enemyHit:     0xC86B6B,
  // Projectile palette — see PROJECTILE VISUAL LANGUAGE in Phase 2 spec.
  // COMBAT_FOUNDATION_V1 codifies element-specific colors below; the
  // generic projPlayer/projEnemy palette stays as the default ownership
  // tint.
  projPlayer:      0xE7C66A,   // brighter core
  projPlayerTrail: 0xA88A40,
  projEnemy:       0xC86B6B,   // red/orange enemy emphasis
  projEnemyTrail:  0x8A3A3F,
  projCorruption:  0x7A4D8F,   // COMBAT_V1 spec: corruption #7A4D8F
  projPoison:      0x69A94C,   // COMBAT_V1 spec: poison #69A94C
  projCrit:        0xE7C66A,   // COMBAT_V1 spec: crit #E7C66A (= dmgCrit)
  projTrigger:     0xE1A84A,   // gold trigger-spawned
  // Corruption
  corruption:    0x3C1F4A,
  corruptionHi:  0x6E48A4,
  // Semantic
  upgrade:    0x7BC47F,
  downgrade:  0xC86B6B,
  danger:     0xC0392B,
} as const;

// =========================================================================
// TIMING (milliseconds unless noted)
// =========================================================================
export const TIME = {
  HOVER_DELAY:    80,
  MOTION_HOVER:   120,
  MOTION_PRESS:   80,
  // COMBAT_FOUNDATION_V1: dash 0.16s / cooldown 2.4s / i-frame 0.08s
  // The dash itself is 160ms (longer commitment than before), but
  // invuln is only the first 80ms (vs. full window) — players have to
  // time the entry, not the exit. Cooldown 3× longer to make dashes
  // meaningful instead of spammable.
  DODGE_DURATION:     160,
  DODGE_IFRAME:       80,
  DODGE_COOLDOWN:     2400,
  // Spec mini hit-stops — much shorter than the previous nauseating
  // values, kept small enough to read as "thock" not "freeze".
  HIT_STOP_NORMAL: 30,    // 0.03s
  HIT_STOP_CRIT:   60,    // 0.06s
  HIT_STOP_ELITE:  80,    // 0.08s
  HIT_STOP_DEATH:  0,     // no kill-confirm freeze (covered by death burst)
  HIT_STOP_HURT:   0,     // player taking dmg doesn't pause the world
  DAMAGE_LIFESPAN: 480,
  LOOT_FADEIN:    120,
  LOOT_FADEOUT:   180,
  FOOTSTEP_INTERVAL: 150,
  IMPACT_FRAME:   90,
  DEATH_BURST:    420,
} as const;

// =========================================================================
// COMBAT TUNING — Combat Feel Foundation V2 (grounded ARPG, no float)
// =========================================================================
export const TUNE = {
  // Player movement — COMBAT_FOUNDATION_V1 spec values.
  // Slower base speed (260) + slower accel (2200) than V2's "instant"
  // 320/7200 — gives the player tactile sense of weight while still
  // staying out of the floaty zone. Decel slightly higher than accel
  // so direction changes feel decisive.
  PLAYER_MAX_SPEED:    260,
  PLAYER_ACCEL:        2200,  // ~120ms to max (was 45ms — still very responsive)
  PLAYER_DECEL:        2600,  // ~100ms to zero
  // PLAYER_HP / radius kept as fallbacks; real hp comes from baseline.ts.
  PLAYER_HP:           1200,
  PLAYER_RADIUS:       12,    // 24×24 hitbox per spec (radius = half)
  // Dash — 120px / 0.16s = 750 px/s burst. 750 / 260 = 2.88 mult.
  DODGE_SPEED_MULT:    2.88,
  // Recoil DISABLED per user feedback ("uncomfortable, pushes back").
  RECOIL_SPEED:        0,
  // Attack — spec: 680 / 6 / 1.2s.
  PROJ_SPEED:          680,
  PROJ_LIFE:           1200,
  PROJ_DAMAGE:         24,
  PROJ_RADIUS:         6,
  ATTACK_CD:           240,
  // Crit — spec: 12% / 180% multiplier.
  // These are the runtime fallback; real values flow through StatManager
  // (CRIT_CHANCE / CRIT_MULTIPLIER baseline). Kept here for legacy paths
  // and for the simple "multiplier=2.5x" applied to damage where stats
  // aren't plumbed yet.
  CRIT_CHANCE:         0.12,
  CRIT_MULT:           1.80,
  // Enemy
  ENEMY_SPEED:         140,
  ENEMY_HP:            48,
  ENEMY_RADIUS:        14,
  ENEMY_DAMAGE:        12,
  ENEMY_CONTACT_CD:    600,
  ENEMY_KNOCKBACK:     220,   // px/s burst when hit
  ENEMY_KNOCKBACK_CRIT:380,
  ENEMY_STAGGER_NORMAL: 160,  // ms
  ENEMY_STAGGER_CRIT:   280,
  ENEMY_KNOCKBACK_DECAY: 12,  // higher = decays faster
  // Death feedback
  DEATH_PARTICLE_COUNT:      16,
  DEATH_PARTICLE_COUNT_CRIT: 22,
  // Screen shake — spec values are much smaller than V2 (which was
  // nauseating). Spec: normal 0 / crit 2 / elite hit 4 / 80ms duration.
  // Re-enabling because at these magnitudes the shake reads as "thock"
  // not "nausea". Set any back to 0 to disable that event again.
  SHAKE_HIT:        0,    // normal hit — no shake (spec)
  SHAKE_CRIT:       2,    // crit
  SHAKE_DEATH:      0,    // covered by death burst, no shake
  SHAKE_HURT:       4,    // player taking dmg = "elite hit" magnitude
  SHAKE_ELITE_HIT:  4,    // hit an elite enemy
  SHAKE_DURATION_MS: 80,
  // Spawn
  ENEMY_SPAWN_INTERVAL: 1800,
  ENEMY_INITIAL_COUNT:  6,
  // Foot dust
  FOOTSTEP_VELOCITY_THRESHOLD: 80,
  // Corruption zones (environment)
  CORRUPTION_ZONE_COUNT:       3,
  CORRUPTION_ZONE_RADIUS:      180,
  CORRUPTION_ZONE_DOT:         4,    // damage per second while standing in
  CORRUPTION_ZONE_DOT_TICK:    500,  // ms between ticks

  // =======================================================================
  // COMBAT_FOUNDATION_V1 — Build mechanic rules (commit B)
  // These are pure data constants consumed by:
  //   - PoisonAilmentManager (TBD)
  //   - ProjectileBehavior.ricochet (existing chainCount path)
  //   - SkillManager.trigger (existing trigger path)
  //   - main.ts corruption meter
  // =======================================================================

  // Poison ailment — per spec
  POISON_TICK_RATE:        4,    // ticks per second
  POISON_DURATION:         2.8,  // seconds
  POISON_MAX_STACKS:       12,
  // Per-tick damage = baseHit × POISON_DOT_FRACTION
  POISON_DOT_FRACTION:     0.18,

  // Ricochet — per spec
  RICOCHET_COUNT:          1,    // bounces granted by Venom Ricochet build
  RICOCHET_RANGE_PX:       180,  // max target search radius

  // Trigger — per spec
  TRIGGER_CHANCE:          0.18,
  TRIGGER_COOLDOWN_MS:     400,

  // Corruption — per spec
  CORRUPTION_MAX:                  100,
  CORRUPTION_PROTOTYPE_LIMIT:      40,    // soft cap during V1 testing
  CORRUPTION_GAIN_PER_ELITE_KILL:  1,
  CORRUPTION_ENEMY_DMG_MULT_PER_PT:  0.006,  // +0.6% incoming damage / point
  CORRUPTION_LOOT_QUALITY_PER_PT:    0.008,  // +0.8% rarity weight / point
} as const;
