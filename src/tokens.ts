/**
 * BAD ARPG — Runtime tokens (Phase 2)
 * Mirrors the values in `runtime/css/tokens.css` so Pixi entities use the
 * same color/spacing/timing language as the Phase 1 HTML blueprints.
 */

// =========================================================================
// CANVAS
// =========================================================================
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

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
  HOVER_DELAY:   80,
  MOTION_HOVER:  120,
  MOTION_PRESS:  80,
  DODGE_DURATION: 220,        // dodge i-frame window
  DODGE_COOLDOWN: 700,
  HIT_STOP:       50,         // hit-stop pause on enemy hit
  DAMAGE_LIFESPAN: 450,
  LOOT_FADEIN:    120,
  LOOT_FADEOUT:   180,
} as const;

// =========================================================================
// COMBAT TUNING
// =========================================================================
export const TUNE = {
  // Player
  PLAYER_MAX_SPEED:    360,   // px/s
  PLAYER_ACCEL:        1800,  // px/s^2 (≈ 0.2s to max — responsive)
  PLAYER_DECEL:        2400,  // px/s^2 (snappy stop)
  PLAYER_HP:           100,
  PLAYER_RADIUS:       14,
  DODGE_SPEED_MULT:    3.0,   // burst velocity multiplier
  // Attack
  PROJ_SPEED:          720,   // px/s
  PROJ_LIFE:           1200,  // ms
  PROJ_DAMAGE:         24,
  PROJ_RADIUS:         5,
  ATTACK_CD:           220,   // ms between shots
  // Enemy
  ENEMY_SPEED:         140,
  ENEMY_HP:            48,
  ENEMY_RADIUS:        14,
  ENEMY_DAMAGE:        12,    // contact damage
  ENEMY_CONTACT_CD:    600,
  // Spawn
  ENEMY_SPAWN_INTERVAL: 1800, // ms
  ENEMY_INITIAL_COUNT:  6,
} as const;
