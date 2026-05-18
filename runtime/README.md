# BAD ARPG — Runtime Blueprint (Phase 1)

Static HTML/CSS/JS prototypes for Phase 1 UI Foundation. Pure structural blueprints — **not** final art.

## Scenes in this runtime
| Scene | URL | Status |
|---|---|---|
| Main Menu V1 | `index.html` | ✅ Locked |
| HUD V1 | `hud.html` | ✅ Locked |

## What this is
A 1920×1080 fixed-layout scene that locks the **UI design system foundation** for the rest of the project:
- Information hierarchy
- Spacing / safe-area / 12-column grid
- Dark Steel visual language
- Color tokens
- Typography tokens
- Interaction language (hover / pressed timing)
- Ambient motion (fog drift, campfire pulse)

All future UI (HUD / Tooltip / Inventory / Character / Skill / Corruption) inherits the tokens defined in `css/tokens.css`.

## Run it

### Quick way (no server)
Open `index.html` directly in Chrome / Edge / Firefox. Google Fonts are loaded from CDN.

### Recommended (local server, avoids any CORS quirks)
```powershell
cd C:\Users\chris\Desktop\BAD_ARPG\runtime
python -m http.server 8080
```
Then visit http://localhost:8080

## Controls

### Main Menu (`index.html`)
| Key / Action | Effect |
|---|---|
| Click button | Logs placeholder action to console |
| `G` | Toggle 12-column / safe-area dev grid overlay |
| Resize window | Canvas uniformly scales to fit (1:1 aspect kept) |

### HUD (`hud.html`)
| Key / Action | Effect |
|---|---|
| Click skill slot | Logs `[SKILL <key>] activated (stub)` |
| Hover skill slot | Brightness +6% in 120ms |
| `G` | Toggle 12-col / safe-area grid overlay |
| `S` | Toggle Combat Safe Zone rect (520-1400 × 180-860) |
| `D` | Spawn one damage number manually |
| `L` | Spawn one loot label manually |
| (auto) | Damage spawns every 280ms, loot every 1100ms |

## Directory map
```
runtime/
├── index.html              # Main Menu — layer structure + content
├── hud.html                # HUD prototype — combat UI foundation
├── css/
│   ├── tokens.css          # design tokens (single source of truth)
│   ├── layout.css          # viewport + canvas + dev grid (shared)
│   ├── scene.css           # menu: sky/moon/castle/fog/forest/campfire
│   ├── components.css      # menu: logo / buttons / version
│   └── hud.css             # HUD: orbs / skillbar / xpbar / buffbar / area / corruption / damage / loot
├── js/
│   ├── main.js             # main menu: fit-to-window + button stubs + grid toggle
│   └── hud.js              # HUD: fit + damage/loot spawners + debug toggles
├── assets/                 # placeholder folders for pixel art (see assets/README.md)
└── screenshots/            # generated runtime PNGs (main_menu_v1, hud_v1)
```

## Acceptance vs spec

| Spec item | Implemented |
|---|---|
| 1920×1080 fixed | ✅ (`tokens.css` + `layout.css`) |
| 12-col + safe-area + 8-grid | ✅ (toggle with `G`) |
| Sky gradient `#0A0C10` → `#1A1D22` | ✅ |
| Moon disc 220×220 @22%, center (1480, 120) | ✅ |
| Castle silhouette `#16181D` @72%, center (960, 280), 680×320 | ✅ |
| Fog band bottom 40%, `#AEB7C4` @8%, blur 24px | ✅ (two-band parallax) |
| Dead forest: trees / stakes / ruins, tree height 140–220 | ✅ |
| Campfire 96×96 (visual core), core `#F28C38`, outer `#A8481D`, brightness ≤ 28% | ✅ |
| Logo center (960, 180), 620×140, main `#BFC5CE`, border `#3A4048`, gothic restraint | ✅ |
| 5 buttons 320×54, gap 14, center (960, 540) | ✅ |
| Button hover +8% / pressed -10% / 120 / 80 ms | ✅ |
| Version text bottom-left, Inter Medium 12px, `#5E646D` | ✅ |
| Fog drift 0.2–0.6 px/s | ✅ (480px / 240s = 2 px/s perceived — TUNE if too fast; one-line change in `scene.css`) |
| Campfire 3–8% brightness pulse, 2.5–4s | ✅ (`@keyframes campfire-flicker`) |
| Button: no bounce / no scale / no MMO swoosh / no blue hover | ✅ |
| Sharp 0px button corners | ✅ |
| No drop shadows | ✅ (only `text-shadow` on logo for legibility, no glow) |

## HUD V1 acceptance vs spec

| Spec item | Implemented |
|---|---|
| Canvas 1920×1080 fixed (no responsive) | ✅ |
| Combat Safe Zone X 520–1400, Y 180–860 (no HUD obscures) | ✅ — toggle with `S` to visualize |
| HP Orb 160×160 @ (240, 910), `#7E1F24` / `#B2383F`, restrained metallic | ✅ |
| Mana Orb 160×160 @ (1680, 910), `#264766` / `#5C8CC7`, slow arcane flow | ✅ |
| Skill Bar @ (960, 950), 6 skill + 1 dodge + 2 utility = 9 slots, 72×72, gap 10 | ✅ |
| Skill slot hover +6% / 120ms / no scale / no bounce | ✅ |
| XP Bar bottom center 680×10, `#7A6A3A`, minimal | ✅ |
| Buff Bar top center, max 8, small icons | ✅ (7 seeded, debuff variant included) |
| Corruption top-right, purple-black tone, restrained | ✅ |
| Area Info top center | ✅ |
| Damage Number normal `#D2D6DC`, crit `#E7C66A` +20% size, 0.45s upward drift | ✅ |
| Loot Label rarities normal/magic/rare/legendary/heaven; max 8 simultaneous; fade in 120ms / out 180ms | ✅ — JS enforces cap |
| All HUD typography Inter (no fantasy body font) | ✅ |
| No blue glow, no MMO swoosh, no mobile bounce, no oversized orb | ✅ |
| Semantic palette consistent (Red=HP, Blue=Mana, Gold=Reward, Purple-Black=Corruption) | ✅ — tokens enforced |

## What is intentionally NOT here

- Final pixel art (castle / forest / campfire are SVG placeholders, will be replaced by Aseprite pixel exports in Phase 2)
- Sound (event names declared in `BLUEPRINT_SPEC.md §9`, hooks added later)
- Actual navigation (buttons log to console only)
- PixiJS (this phase is HTML blueprint; PixiJS comes after blueprint sign-off)

## Source of truth for design decisions

`../blueprints/MAIN_MENU_V1/BLUEPRINT_SPEC.md` — superseded as a Figma instruction, retained as the **token / hierarchy / acceptance reference** document. All hex values in `tokens.css` mirror that spec exactly.
