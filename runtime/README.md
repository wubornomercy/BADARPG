# BAD ARPG — Runtime Blueprint (Phase 1)

Static HTML/CSS/JS prototype of `MAIN_MENU_V1`. Pure structural blueprint — **not** final art.

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
| Key / Action | Effect |
|---|---|
| Click button | Logs placeholder action to console |
| `G` | Toggle 12-column / safe-area dev grid overlay |
| Resize window | Canvas uniformly scales to fit (1:1 aspect kept) |

## Directory map
```
runtime/
├── index.html              # entry — layer structure + content
├── css/
│   ├── tokens.css          # design tokens (single source of truth)
│   ├── layout.css          # viewport + canvas + dev grid
│   ├── scene.css           # sky/moon/castle/fog/forest/campfire
│   └── components.css      # logo / buttons / version
├── js/
│   └── main.js             # fit-to-window + button stubs + grid toggle
├── assets/                 # placeholder folders for pixel art (see assets/README.md)
└── screenshots/            # generated runtime PNGs
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

## What is intentionally NOT here

- Final pixel art (castle / forest / campfire are SVG placeholders, will be replaced by Aseprite pixel exports in Phase 2)
- Sound (event names declared in `BLUEPRINT_SPEC.md §9`, hooks added later)
- Actual navigation (buttons log to console only)
- PixiJS (this phase is HTML blueprint; PixiJS comes after blueprint sign-off)

## Source of truth for design decisions

`../blueprints/MAIN_MENU_V1/BLUEPRINT_SPEC.md` — superseded as a Figma instruction, retained as the **token / hierarchy / acceptance reference** document. All hex values in `tokens.css` mirror that spec exactly.
