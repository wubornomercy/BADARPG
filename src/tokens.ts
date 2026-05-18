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
  // Projectile palette — see PROJECTILE VISUAL LANGUAGE in Phase 2 spec
  projPlayer:     0xE7C66A,   // brighter core
  projPlayerTrail:0xA88A40,
  projEnemy:      0xC86B6B,   // red/orange enemy emphasis
  projEnemyTrail: 0x8A3A3F,
  projCorruption: 0x6E48A4,   // purple-black, unstable
  projTrigger:    0xE1A84A,   // gold trigger-spawned
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
  DODGE_DURATION: 140,        // dodge i-frame window — shorter / harder
  DODGE_COOLDOWN: 800,
  // Hit-stop DISABLED per user feedback ("flicker/freeze nauseating").
  // Values kept at 0 so call sites remain; flip non-zero to re-enable.
  HIT_STOP_NORMAL: 0,
  HIT_STOP_CRIT:   0,
  HIT_STOP_ELITE:  0,
  HIT_STOP_DEATH:  0,
  HIT_STOP_HURT:   0,
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
  // Player movement — snap controls, no slide
  PLAYER_MAX_SPEED:    320,   // px/s (slightly slower than V1, feels weightier)
  PLAYER_ACCEL:        7200,  // px/s^2 — ~45ms to max (instant ARPG feel)
  PLAYER_DECEL:        9600,  // px/s^2 — ~33ms to zero (snappy stop)
  PLAYER_HP:           100,
  PLAYER_RADIUS:       14,
  // Dodge — short, hard, no slide tail
  DODGE_SPEED_MULT:    4.5,   // burst velocity multiplier
  // Recoil DISABLED per user feedback ("uncomfortable, pushes back").
  // Set non-zero to re-enable.
  RECOIL_SPEED:        0,
  // Attack
  PROJ_SPEED:          820,   // px/s — faster, more decisive
  PROJ_LIFE:           1100,  // ms
  PROJ_DAMAGE:         24,
  PROJ_RADIUS:         5,
  ATTACK_CD:           240,   // ms between shots
  // Crit — punch through the floor when it lands
  CRIT_CHANCE:         0.20,
  CRIT_MULT:           2.5,
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
  // Screen shake DISABLED per user feedback ("nauseating").
  // Values 0 = no shake; flip non-zero to re-enable per-event.
  SHAKE_HIT:    0,
  SHAKE_CRIT:   0,
  SHAKE_DEATH:  0,
  SHAKE_HURT:   0,
  // Spawn
  ENEMY_SPAWN_INTERVAL: 1800,
  ENEMY_INITIAL_COUNT:  6,
  // Foot dust
  FOOTSTEP_VELOCITY_THRESHOLD: 80,
  // Corruption zones
  CORRUPTION_ZONE_COUNT:       3,
  CORRUPTION_ZONE_RADIUS:      180,
  CORRUPTION_ZONE_DOT:         4,    // damage per second while standing in
  CORRUPTION_ZONE_DOT_TICK:    500,  // ms between ticks
} as const;
