# BAD ARPG — Runtime Blueprint (Phase 1)

Static HTML/CSS/JS prototypes for Phase 1 UI Foundation. Pure structural blueprints — **not** final art.

## Scenes in this runtime
| Scene | URL | Status |
|---|---|---|
| Main Menu V1 | `index.html` | ✅ Locked |
| HUD V1 | `hud.html` | ✅ Locked |
| Tooltip V1 | `tooltip.html` | ✅ Locked |
| Inventory V1 | `inventory.html` | ✅ Locked |
| Loot Presentation V1 | `loot.html` | ✅ Locked |

## Visual Style — PIXEL DARK STEEL

Per Project Plan V10 §7, the project's visual identity is **Pixel Dark Steel**. The Phase 1 prototypes enforce pixel-art rendering globally even though final pixel assets will come from Aseprite later. Smooth modern web UI is **forbidden**.

### Pixel Discipline Rules (enforced in `layout.css`)
| Rule | Enforced via |
|---|---|
| No anti-aliased text | `-webkit-font-smoothing: none; font-smooth: never; text-rendering: geometricPrecision;` on `html, body` |
| No smooth image scaling | `image-rendering: pixelated; image-rendering: crisp-edges;` on `*` |
| No smooth SVG edges | `shape-rendering: crispEdges;` on `svg, svg *` |
| Pixel fonts only | Display = Jacquard 12 (gothic pixel), UI = Pixelify Sans (modern pixel), CJK = Zpix |
| No CSS `filter: blur()` | Replaced by banded layers / hard step shadows |
| No smooth shadows | `box-shadow` with `0` blur radius only — hard step bevel |
| No smooth gradients | Banded `linear-gradient` with hard color stops |
| All sizes multiples of `--px` (4px) | Tokens express positions in 4-multiple values |
| Step-based animations | `steps(4-8, end)` instead of cubic-bezier easing for ambient pulses |

### Font stack
```
--font-display: 'Jacquard 12', 'Zpix', 'Noto Serif SC', serif;
--font-ui:      'Pixelify Sans', 'Zpix', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
```
Latin chars render in pixel Latin fonts; CJK falls back to Zpix (CDN-loaded from jsDelivr).

### Tech stack (project-wide)
- **PixiJS** — final runtime renderer (Phase 2+)
- **TypeScript** — game logic
- **Aseprite** — pixel art authoring
- **Bfxr** — sound effects

Current HTML prototypes are **structural blueprints**, not the final render path. When Aseprite assets land, runtime will be ported to PixiJS WebGL renderer with pixel-perfect display.

## Localization (本地化)

All in-game display strings are **Simplified Chinese (zh-CN)**:
- Button labels, status text, area names, orb readouts, XP labels
- Loot label item names (HUD)
- Tooltip: item names, types, affixes, descriptions, tags, flavor, status
- Section labels, page titles, comparison labels

**Boundary:**
- Display strings → Chinese
- `BAD ARPG` logo → kept as English brand mark (Chinese gaming convention)
- Code (file names, class names, JS variables, CSS tokens, data attributes) → English
- Code comments / README / commit messages → English

**Font stack** (see `css/tokens.css`):
- Display: `Cinzel, Noto Serif SC, Source Han Serif SC, …, serif`
- UI:      `Inter, Noto Sans SC, PingFang SC, Microsoft YaHei, …, sans-serif`

Browser uses the first available font per glyph — Latin chars render in Cinzel/Inter, CJK chars fall back to Noto Sans/Serif SC (loaded from Google Fonts CDN).

> Translations in this Phase 1 prototype are working placeholders. Final game-content localization (item naming tone, flavor copy, term consistency) will be issued by the Game Director (ChatGPT) when content production phase begins.

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

### Tooltip (`tooltip.html`)
| Key / Action | Effect |
|---|---|
| Hover a showcase tooltip | After 80ms delay, floating duplicate appears next to cursor (fade in 120ms) |
| Move mouse while hovering | Floating tooltip follows with auto-offset (never blocks cursor) |
| Leave hover | Fade out 120ms |
| Click a showcase tooltip | Logs `[COMPARE] would replace NEW pane …` (stub — needs inventory data model) |
| `G` | Toggle 12-col / safe-area grid overlay |

### Inventory (`inventory.html`)
| Key / Action | Effect |
|---|---|
| Hover any slot with an item | Right preview panel updates instantly + after 80ms floating tooltip appears |
| Click a slot | Selects it (4px gold pixel edge) + locks preview panel |
| Mouse-down + drag on item | Drag ghost follows cursor (drop logic stubbed) |
| Click filter tab | Dims non-matching slots to 18% opacity (no DOM mutation) |
| Click 装备 / 分解 / 丢弃 in preview | Logs the intent to console (no real mutation) |
| Click × | Logs `[CLOSE] would close inventory panel` |
| `G` | Toggle 12-col / safe-area grid overlay |

### Loot Presentation (`loot.html`)
| Key / Action | Effect |
|---|---|
| `1` / `2` / `3` / `4` / `5` | Spawn one drop at random ground position with rarity 普通/魔法/稀有/传奇/神圣 |
| `B` | Spawn random build-enabling drop (Legendary or Heaven) |
| `R` | Spawn random rarity |
| `C` | Clear all drops |
| Click anywhere on the ground area | Spawn weighted-random drop at click position |
| (auto) | Slow atmospheric spawn cycle every 2.5–4.5s (weighted: 45% normal, 29% magic, 16% rare, 8% legendary, 2% heaven) |
| `G` | Toggle 12-col / safe-area grid overlay |

## Directory map
```
runtime/
├── index.html              # Main Menu — layer structure + content
├── hud.html                # HUD prototype — combat UI foundation
├── tooltip.html            # Tooltip prototype — loot evaluation foundation
├── inventory.html          # Inventory prototype — loot management foundation
├── loot.html               # Loot Presentation — dopamine / rarity hierarchy / world-space drops
├── css/
│   ├── tokens.css          # design tokens (single source of truth)
│   ├── layout.css          # viewport + canvas + dev grid (shared)
│   ├── scene.css           # menu: sky/moon/castle/fog/forest/campfire
│   ├── components.css      # menu: logo / buttons / version
│   ├── hud.css             # HUD: orbs / skillbar / xpbar / buffbar / area / corruption / damage / loot
│   ├── tooltip.css         # Tooltip: base / rarity / 3-tier affix / tags / comparison
│   ├── inventory.css       # Inventory: panel / equipment / grid / slot / preview / currency
│   └── loot.css            # Loot: world-bg / actors / drop / beam / aura / dust / ash / legend
├── js/
│   ├── main.js             # main menu: fit-to-window + button stubs + grid toggle
│   ├── hud.js              # HUD: fit + damage/loot spawners + debug toggles
│   ├── tooltip.js          # Tooltip: hover delay + auto offset + comparison stubs
│   ├── inventory.js        # Inventory: 35-item data + render + hover/select/filter/drag
│   └── loot.js             # Loot: item pool + spawn cycle + density mgr + manual triggers
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

## Tooltip V1 acceptance vs spec

| Spec item | Implemented |
|---|---|
| Base width 420px, padding 18px, section gap 12px, affix gap 6px | ✅ (tokens) |
| Header = Item Name + Item Type, name larger than type | ✅ |
| Core stats block (Damage / Armor / Attack Speed / Crit) | ✅ |
| Affix 3-tier hierarchy (Build Enabling > Core Power > Support) | ✅ visually distinct |
| Tier 1 build enabling — gold left-edge + ◆ marker + name highlight + "BUILD ENABLING" tag | ✅ no MMO glow |
| Tier 2 = prefix/suffix lines, default emphasis | ✅ |
| Tier 3 = dim support stats, smaller font | ✅ |
| Utility block: Requirements + Tags (poison/crit/ricochet/trigger/corruption) | ✅ all 5 demonstrated |
| Bottom block: optional Flavor + Item Value + Corruption Status | ✅ Uncorrupted / Corrupted +3 |
| Rarity colors (Normal #8C9198 / Magic #5A7FCF / Rare #D2B15A / Legendary #E1A84A / Heaven #F4F2E8) | ✅ tokens shared with HUD loot |
| 5 test items: Normal / Magic / Rare / Legendary / Heaven | ✅ Cracked Shortbow / Cunning Cap / Reaver's Gauntlet / Stormcaller's Talon / Venomspike Loop |
| Build-enabling items showcased | ✅ Ricochet Chain, Venom Bloom, Corpsewake Trigger, Apostle's Volley |
| Comparison runtime: current left, new right | ✅ Stormcaller → Ricochet Apostle Bow |
| Comparison delta colors (upgrade #7BC47F / downgrade #C86B6B / neutral #A7ADB7) | ✅ on core stats AND affixes |
| Motion: fade in 120ms / fade out 120ms / hover delay 80ms | ✅ (`tt-fade-in`, `tt-fade-out`, `tt-hover-delay`) |
| Auto offset (tooltip never blocks cursor center) | ✅ JS clamps and flips if overflow |
| Typography Inter only, no fantasy body font | ✅ |
| No glow, no oversized title, no parchment, no MMO scroll | ✅ |
| All hex from `tokens.css` (no literal hex in tooltip.css/html) | ✅ |

## Inventory V1 acceptance vs spec

| Spec item | Implemented |
|---|---|
| Panel 1240 × 720, centered, `#111418` @ 92%, dark metallic pixel border | ✅ (tokens + chunky 2px border + 4 rivets + 8px hard drop shadow) |
| 4 zones: LEFT equipment · CENTER grid · RIGHT tooltip/comparison · BOTTOM currency | ✅ |
| Grid 10 × 6 = 60 slots, 64×64, gap 6px | ✅ |
| 8 equipment slots: Weapon / Helmet / Chest / Gloves / Boots / Amulet / Ring 1 / Ring 2 | ✅ (2×4 layout) |
| Empty equipment slot visible (Ring 2) — dashed border + type label | ✅ "戒指2" |
| 35 test items spanning all 5 rarities (Normal/Magic/Rare/Legendary/Heaven) | ✅ |
| Build Enabling items: poison / crit / ricochet / trigger / corruption tags | ✅ 6 legendary + 3 heaven items |
| Slot rarity colour edges (chunky pixel border) | ✅ normal gray / magic blue / rare gold / legendary orange-gold / heaven cream |
| Empty slot low contrast, occupied slot slight brightness lift | ✅ |
| Hover +6% brightness, 120ms | ✅ |
| Selected — subtle 4px gold pixel edge | ✅ `outline` not blur |
| Build Enabling ◆ marker in slot corner | ✅ small gold ◆ in top-right of legendary/heaven slots |
| Filter tabs: All / Weapons / Armor / Accessories / Materials | ✅ 全部 / 武器 / 护甲 / 饰品 / 材料 (filtering dims to 18%) |
| Tooltip integration: inherits TOOLTIP_SYSTEM_V1 fully | ✅ floating tooltip built from item data uses `.tooltip-{rarity}`, tier-1 affixes, tags, comparison |
| Hover 80ms delay, fade-in 120ms, auto-offset | ✅ |
| Right preview panel updates on hover (instant) + locks on click | ✅ |
| Comparison vs currently-equipped item of same slot | ✅ delta tags green/red/new |
| 3 action buttons: 装备 / 分解 / 丢弃 | ✅ pixel chunky buttons with hard bevel |
| Bottom currency: Gold / Corruption Shards / Craft Materials | ✅ 金币 / 腐化碎片 / 工艺材料 with delta gain indicators |
| All pixel discipline (no blur, no rounded corners, hard step shadows, banded bg) | ✅ |
| Inventory open animation 160ms fade | ✅ via `--inv-fade-in` token (used in JS for show/hide) |

## Loot Presentation V1 acceptance vs spec

| Spec item | Implemented |
|---|---|
| 5 elements per drop: ground item / label / beam / drop FX / ambient FX | ✅ all 5 |
| Normal: no beam, label only | ✅ `--loot-beam-h-normal: 0px` |
| Magic: very faint pixel shimmer beam (subtle) | ✅ 8×56 beam @ 35-55% opacity, slow pulse |
| Rare: short beam + low-frequency pulse | ✅ 10×96 banded beam, 2.4s pulse |
| Legendary: visible segmented beam + pixel ash | ✅ 14×144 banded beam + ash rise particles |
| Heaven: atmosphere-changing (ambient dim + white-gold flare + corruption repel + low-freq aura) | ✅ 18×200 beam + banded radial dim ring + expanding corruption-repel ring (3.6s) |
| Rarity colors inherit HUD/Tooltip tokens (Normal/Magic/Rare/Legendary/Heaven) | ✅ same `--clr-loot-*` |
| Build-enabling: ◆ marker + subtle gold edge + special pixel pulse | ✅ ◆ in label header + gold-tinted border + tag pill |
| Drop FX 0.25–0.8s pixel dust burst | ✅ 4–12 dust particles burst in 500ms `steps(6, end)` |
| Density limit 8 simultaneous, oldest fades | ✅ JS array shift + 180ms fade-out |
| Label fade in 120 / out 180ms | ✅ token-driven |
| Combat actors visible without obstruction (loot ≠ UI overlay) | ✅ player + 3 enemies + projectile remain readable through drops |
| World-space anchoring (not floating UI) | ✅ each drop anchored at ground X/Y with pedestal shadow |
| Pixel discipline (no blur, banded only, hard step shadows) | ✅ `image-rendering: pixelated`, banded beams, hard text shadows |
| Required tags demonstrated: poison / crit / ricochet / trigger / corruption | ✅ in build-enabling drops + ambient pool |
| No rainbow / no MMO fireworks / no mobile explosion | ✅ low-saturation, restrained excitement |

## What is intentionally NOT here

- Final pixel art (castle / forest / campfire are SVG placeholders, will be replaced by Aseprite pixel exports in Phase 2)
- Sound (event names declared in `BLUEPRINT_SPEC.md §9`, hooks added later)
- Actual navigation (buttons log to console only)
- PixiJS (this phase is HTML blueprint; PixiJS comes after blueprint sign-off)

## Source of truth for design decisions

`../blueprints/MAIN_MENU_V1/BLUEPRINT_SPEC.md` — superseded as a Figma instruction, retained as the **token / hierarchy / acceptance reference** document. All hex values in `tokens.css` mirror that spec exactly.
