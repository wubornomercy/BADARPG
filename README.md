# BAD ARPG

Dark Steel Pixel Loot ARPG — game project repo.

## Project structure

```
BAD_ARPG/
├── src/                     Phase 2+ runtime — PixiJS + TypeScript game source
│   ├── main.ts              entry: Pixi bootstrap, game loop, scene root
│   ├── tokens.ts            colors / timing / sim bounds (mirrors Phase 1 tokens.css)
│   ├── input.ts             keyboard + mouse polling
│   ├── sim.ts               SIM_BOUNDS enforcement + debug HUD
│   └── entities/            Player / Enemy / Projectile / LootDrop
├── runtime/                 Phase 1 UI/HUD foundation (HTML + CSS + vanilla JS blueprints)
├── blueprints/              Phase 1 spec docs (Figma blueprint v1.0 reference)
├── index.html               Vite entry (Phase 2)
├── package.json             npm scripts (dev / build / check / preview)
├── tsconfig.json
└── vite.config.ts
```

## Tech stack
- **PixiJS** v8 — WebGL renderer
- **TypeScript** 5
- **Vite** 5 — dev server + bundler
- **Aseprite** — pixel art (planned)
- **Bfxr** — sound effects (planned)

## Run locally

```powershell
npm install            # one-time
npm run dev            # starts Vite dev server on http://localhost:5173
npm run check          # tsc --noEmit type check
npm run build          # production bundle into dist/
npm run preview        # serve dist/ for verification
```

## Current phase

**Phase 2 — Combat Sandbox Foundation (V1)**.

Per Phase 2 directive, this is a SYSTEM VALIDATION phase, not content production. Goal: validate that the project's core promise — "high-readability interaction-driven pixel ARPG" — holds up in real runtime.

Implemented so far:
- ✅ Step 1 Combat Foundation: WASD movement (light accel/decel), dodge with i-frames, LMB primary attack, 1 enemy type (wraith) with contact damage + death feedback, loot drops with rarity beams
- ✅ Step 5 Sim Boundaries: hard caps for `MAX_PROJECTILES=80`, `MAX_ENEMIES=40`, `MAX_VFX=16`, `MAX_CHAIN_DEPTH=3`, `MAX_TRIGGER_DEPTH=2`

Pending:
- ⏳ Step 2 Projectile readability (player vs enemy vs corruption visual language)
- ⏳ Step 3 Combat readability priority hierarchy
- ⏳ Step 4 Interaction readability (skill → trigger → spread chain)
- ⏳ Step 6 Combat feel (hit-stop, screen shake, death burst tuning)
- ⏳ Step 7 Full test arena (waves, elite, miniboss, corruption zone)

## Controls (Combat Sandbox V1)

| Key | Effect |
|---|---|
| `WASD` / Arrows | Move (light accel ~0.2s to max, snappy decel) |
| LMB hold | Fire projectile toward cursor (220ms cooldown) |
| `Space` / `Shift` | Dodge — 220ms burst, i-frames, 700ms cooldown |

## Phase 1 — UI Foundation (locked, frozen)

7 UI blueprints completed at `runtime/`. See `runtime/README.md` for the full Phase 1 acceptance table and per-scene controls.

| Scene | URL |
|---|---|
| Main Menu | `runtime/index.html` |
| HUD | `runtime/hud.html` |
| Tooltip | `runtime/tooltip.html` |
| Inventory | `runtime/inventory.html` |
| Loot Presentation | `runtime/loot.html` |
| Character Panel | `runtime/character.html` |
| Skill Panel | `runtime/skill.html` |

These remain runnable directly via `file://` (no build step) — they are the design-token + visual-language reference for the Pixi runtime.
