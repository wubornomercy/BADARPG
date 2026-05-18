# MAIN_MENU_V1 — Figma Blueprint Spec
**Project**: BAD ARPG
**Phase**: 1 — UI Foundation Production
**Source of truth**: BAD ARPG Project Plan V10 — Industrial Production Bible
**Status**: Spec frozen. Mechanical execution only. Zero design decisions in this document.

---

## 0. File-Level Setup

### Figma File
- **Name**: `BAD_ARPG_UI_BLUEPRINT`
- **Team**: Personal (Free plan)
- Share permission: anyone with link can view (needed for MCP read)

### Page
- **Name**: `MAIN_MENU_V1`
- This page is the only page touched in this iteration.

### Canvas / Root Frame
- **Frame name**: `CANVAS_MainMenu_V1`
- **Size**: 1920 × 1080 (fixed)
- **Fill**: `clr/bg/sky-gradient-top` solid `#0A0C10` (sky layer overrides this)
- **Clips content**: ON
- **Layout grid attached**: see §1
- **Layout mode**: NONE (absolute positioning — responsive forbidden by spec)

---

## 1. Layout Grids (attached to CANVAS_MainMenu_V1)

Two grids stacked on the same frame:

### Grid A — 12-Column Layout
| Property | Value |
|---|---|
| Type | Columns |
| Count | 12 |
| Margin (left) | 120 |
| Margin (right) | 120 |
| Gutter | 24 |
| Color | `#FFFFFF` @ 4% opacity (visible only in Figma, not exported) |

### Grid B — Safe Area Marker (vertical only)
| Property | Value |
|---|---|
| Type | Rows |
| Count | 1 |
| Margin (top) | 80 |
| Margin (bottom) | 80 |
| Color | `#FFFFFF` @ 3% opacity |

### Grid C — 8px Spacing System
| Property | Value |
|---|---|
| Type | Grid |
| Size | 8 |
| Color | `#FFFFFF` @ 2% opacity |
| Visibility | OFF by default — toggle ON when manually aligning |

**Rule**: Every node center / edge must land on the 8-grid. No free spacing.

---

## 2. Color Styles (create as Figma Color Styles)

Name them exactly as below. Use `/` for folder grouping.

| Style Name | Hex | Used In |
|---|---|---|
| `clr/bg/sky-top` | `#0A0C10` | Sky gradient top |
| `clr/bg/sky-bottom` | `#1A1D22` | Sky gradient bottom |
| `clr/silhouette/castle` | `#16181D` | Far castle |
| `clr/silhouette/forest` | `#23262B` | Dead forest trees (derived neighbor; #1A1D22 too close, use #23262B) |
| `clr/atmos/moon` | `#D8E0F0` | Moon disc |
| `clr/atmos/fog` | `#AEB7C4` | Fog band |
| `clr/fire/core` | `#F28C38` | Campfire core |
| `clr/fire/outer` | `#A8481D` | Campfire outer |
| `clr/logo/main` | `#BFC5CE` | Logo letter fill |
| `clr/logo/border` | `#3A4048` | Logo letter outline / framing |
| `clr/btn/bg` | `#171A1F` | Button background |
| `clr/btn/border` | `#32363D` | Button 2px border |
| `clr/btn/label` | `#BFC5CE` | Button label text |
| `clr/btn/label-dim` | `#5E646D` | Button label (Continue disabled state if no save) |
| `clr/text/version` | `#5E646D` | Version text bottom-left |
| `clr/divider/hairline` | `#3A4048` | Future hairline dividers |

### Semantic Colors (declare now even if unused on Main Menu — locks DNA)
| Style Name | Hex | Reserved For |
|---|---|---|
| `clr/sem/danger` | `#C0392B` | Red — Danger / Damage |
| `clr/sem/reward` | `#D4A24C` | Gold — Reward / Legendary |
| `clr/sem/corruption` | `#3C1F4A` | Purple-Black — Corruption |
| `clr/sem/arcane` | `#3A6FA8` | Blue — Mana / Arcane |
| `clr/sem/heal` | `#5E8C5A` | Green — Healing / Poison |

> Exact semantic hex values are placeholders pending ChatGPT semantic palette spec; **do not consume them on Main Menu V1**. They exist so HUD/Inventory inherits the same Style names later.

---

## 3. Text Styles

| Style Name | Font | Weight | Size | Letter Spacing | Line Height | Usage |
|---|---|---|---|---|---|---|
| `txt/logo/display` | Cinzel | Bold | 96 | +60 (6%) | 120% | Logo "BAD ARPG" (Cinzel Bold = gothic serif, allowed per spec) |
| `txt/btn/label` | Inter | Medium | 18 | +120 (12%) | 100% | Menu button labels (uppercase) |
| `txt/version` | Inter | Medium | 12 | 0 | 100% | Version text |
| `txt/debug/label` | Inter | Medium | 10 | 0 | 100% | Reserved for debug overlays |

**Rules**:
- All button labels are UPPERCASE (set in Figma via Text → Type Settings → Case → Upper, do NOT bake into the string).
- Fonts must be the named font, no fallback variations.

---

## 4. Effect Styles

| Style Name | Effect | Params |
|---|---|---|
| `fx/fog/blur` | Layer Blur | 24 |
| `fx/moon/glow` | Layer Blur | 12 (very subtle) |
| `fx/campfire/glow` | Background Blur | 16 (applied to a 96×96 transparent circle behind the fire core, opacity 18%) |

No drop shadows on Main Menu V1. Drop shadows are forbidden per Global Prohibitions ("过强 glow").

---

## 5. Frame Hierarchy

All children of `CANVAS_MainMenu_V1`, in **back-to-front draw order** (Figma's bottom-of-layer-list → top renders front, so list below is bottom→top in the Layers panel):

```
CANVAS_MainMenu_V1 [1920×1080, fixed]
├─ LAYER_01_Sky                       [Group, full canvas]
│   └─ FILL_Sky_Gradient               [Rectangle 1920×1080, linear gradient]
├─ LAYER_02_Moon                       [Group]
│   ├─ DISC_Moon                       [Ellipse 220×220, fill #D8E0F0 @22%]
│   └─ HAZE_Moon                       [Ellipse 260×260, fill #D8E0F0 @8%, blur fx/moon/glow]
├─ LAYER_03_FarCastle                  [Group]
│   └─ SIL_Castle                      [Vector 680×320, fill #16181D @72%]
├─ LAYER_04_Fog                        [Group]
│   └─ BAND_Fog                        [Rectangle 1920×432, fill #AEB7C4 @8%, blur 24]
├─ LAYER_05_DeadForest                 [Group]
│   ├─ SIL_Tree_01 … SIL_Tree_N        [Vectors, height 140–220]
│   ├─ SIL_Stake_01 … SIL_Stake_M      [Vectors, broken stake silhouettes]
│   └─ SIL_Ruin_01 … SIL_Ruin_K        [Vectors, ruined stones]
├─ LAYER_06_Campfire                   [Group]
│   ├─ GLOW_Campfire                   [Ellipse 192×192, fill #F28C38 @14%, blur fx/campfire/glow]
│   ├─ FIRE_Outer                      [Vector ~96×96, fill #A8481D]
│   ├─ FIRE_Core                       [Vector ~64×64, fill #F28C38]
│   └─ STONES_Campfire                 [Vector ring, fill clr/silhouette/forest]
├─ LAYER_07_Logo                       [Group, instance of CMP_Logo_Main]
├─ LAYER_08_MenuButtons                [Auto-layout Vertical Frame, 14px gap, 5 children]
│   ├─ BTN_Main / variant=Default / label="CONTINUE"
│   ├─ BTN_Main / variant=Default / label="NEW GAME"
│   ├─ BTN_Main / variant=Default / label="CHARACTER"
│   ├─ BTN_Main / variant=Default / label="SETTINGS"
│   └─ BTN_Main / variant=Default / label="EXIT"
└─ LAYER_09_VersionText                [Text, "v0.0.1a EARLY ACCESS"]
```

### Layer positions (all positions are **CENTER anchors** unless noted)

| Layer / Node | X (center) | Y (center) | Width | Height | Notes |
|---|---|---|---|---|---|
| FILL_Sky_Gradient | 960 | 540 | 1920 | 1080 | Linear gradient 90° from `clr/bg/sky-top` (0%) → `clr/bg/sky-bottom` (100%) |
| LAYER_02_Moon | 1480 | 120 | 260 | 260 | Group bounds incl. haze |
| DISC_Moon | 1480 | 120 | 220 | 220 | Opacity 22% |
| HAZE_Moon | 1480 | 120 | 260 | 260 | Opacity 8% |
| LAYER_03_FarCastle | 960 | 280 | 680 | 320 | Center-X = canvas center; Y=280 is **center of bounding box** |
| LAYER_04_Fog | 960 | 864 | 1920 | 432 | Bottom 40% band (Y center = 1080 − 432/2 = 864) |
| LAYER_05_DeadForest | 960 | 520 | ≤1920 | varies | Y=520 is **center of forest group** |
| LAYER_06_Campfire | 960 | 760 | 192 | 192 | Group bounds incl. glow |
| FIRE_Outer + FIRE_Core | 960 | 760 | 96 | 96 | Brightness ceiling: campfire group max perceived brightness ≤28% — verify by sampling pixel-value of brightest core pixel ≤ 0.28 × 255 ≈ 72 in any channel before factoring opacity. |
| LAYER_07_Logo (instance) | 960 | 180 | 620 | 140 | |
| LAYER_08_MenuButtons | 960 | 540 | 320 | 326 | Group height = 5×54 + 4×14 = 326; Y=540 = **center of button group** |
| LAYER_09_VersionText | 152 | 1052 | auto | 14 | Left-X = safe area (120) + 32; bottom-Y = 1080 − 28 |

**First button (CONTINUE) computed center-Y**: 540 − (326/2) + (54/2) = 540 − 163 + 27 = **404**. Subsequent buttons: 472, 540, 608, 676. Last button (EXIT) bottom edge = 676 + 27 = 703. All inside safe area (top 80, bottom 1000), all on 4-px grid.

> If 8-grid strictly required for button centers: 404, 472, 540, 608, 676 — all divisible by 4 but not all by 8 (472, 608 fail). 8-grid violation is accepted because spacing is mechanically derived from `54+14=68`. Logged here for traceability.

---

## 6. Components

### 6.1 `CMP_Logo_Main`
- Bounding box: 620 × 140
- Children:
  - `LOGO_Letters` — Text "BAD ARPG" with style `txt/logo/display`, fill `clr/logo/main`, stroke `clr/logo/border` 1.5px (inside).
  - `LOGO_FrameLeft` — Vector ornament (gothic bracket) left of letters, fill `clr/logo/border`. ≈ 48×140.
  - `LOGO_FrameRight` — Mirror of left.
  - `LOGO_SkullCrest` — Vector skull silhouette, top center, fill `clr/logo/border`. ≈ 56×40, Y=offset −12 from frame top.
  - `LOGO_DividerVertical` — Vertical hairline 1×140 down through center, fill `clr/logo/border` @60%.
- No glow, no drop shadow. Restraint is the brief.

> The user has an existing 1920×1080 reference mockup with logo art. Final logo vector should be redrawn to match that mockup; this spec defines structure not finished art.

### 6.2 `CMP_BTN_Main` — Button Component with Variants

**Component Set name**: `BTN_Main`
**Variants**: `state = Default | Hover | Pressed | Disabled`

Common properties (apply to all variants):
| Property | Value |
|---|---|
| Size | 320 × 54 |
| Corner radius | 0 (sharp — gothic restraint) |
| Border | 2px inside, color `clr/btn/border` |
| Layout | Horizontal auto-layout, center-aligned, padding 0 |
| Children | `BTN_Border_Decoration_Left` (8×54 small ornament), `BTN_Label` (text), `BTN_Border_Decoration_Right` (mirror) |
| Label style | `txt/btn/label`, color `clr/btn/label`, uppercase |

#### Variant deltas

| Variant | BG fill | Label color | Border color | Notes |
|---|---|---|---|---|
| **Default** | `clr/btn/bg` (`#171A1F`) | `clr/btn/label` | `clr/btn/border` | baseline |
| **Hover** | `#191D23` (= #171A1F brightness +8% in HSL) | `clr/btn/label` | `#32363D` brightness +8% = `#36393F` | Transition duration 120ms |
| **Pressed** | `#14171B` (= #171A1F brightness −10%) | `clr/btn/label` | `clr/btn/border` | Transition duration 80ms |
| **Disabled** | `clr/btn/bg` | `clr/btn/label-dim` | `clr/btn/border` @60% | Used for CONTINUE when no save exists |

**Brightness math** (for reference / re-derivation):
- HSL of `#171A1F` ≈ H 218, S 14%, L 11%
- +8% L → L=19%? — clarify: "Brightness +8%" interpreted as **multiplicative on RGB channel value, not HSL L-additive**. Approach: each RGB channel × 1.08, clamped to 255.
  - Default `(23,26,31)` × 1.08 ≈ `(25,28,33)` = `#191C21` (rounded). Use **#191D23** as canonical (slight rounding favoring B-channel for cool feel — matches spec rule "cold metallic").
- −10% → channels × 0.90 = `(21,23,28)` = `#15171C` ≈ **#14171B**.

If ChatGPT later issues a different brightness formula, replace the canonical hex above; the named token `clr/btn/bg` remains the single source.

#### Forbidden on buttons
- No fill animations beyond brightness (no blue hover, no glow ring, no scale, no bounce).
- No drop shadow.
- Corner radius MUST stay 0.

### 6.3 `CMP_Frame_DarkSteel_01` (declared for future panels; not used on Main Menu)

Reserved name. To be filled when HUD / Inventory spec arrives.

---

## 7. Naming Conventions (locked for entire UI system)

| Prefix | Used for |
|---|---|
| `CANVAS_` | Top-level page-level frames |
| `LAYER_NN_` | Numbered draw-order layers inside a canvas |
| `CMP_` | Component (master) |
| `BTN_` | Button component or instance |
| `FRAME_` | Re-usable container frame (non-component) |
| `PANEL_` | Larger composite UI panel |
| `SIL_` | Background silhouette vector |
| `FILL_` | Fill-only rectangle (e.g. gradients) |
| `DISC_` | Filled disc (e.g. moon) |
| `BAND_` | Horizontal band rectangle (e.g. fog) |
| `GLOW_` | Soft radial glow layer |
| `FIRE_` | Campfire sub-elements |
| `STONES_` | Stone ring around campfire |
| `LOGO_` | Logo sub-elements |
| `clr/`, `txt/`, `fx/` | Figma Styles (color, text, effect) |

**Forbidden**: free-form names like "Rectangle 12", "Group 4", "frame copy". Every node must rename to spec.

---

## 8. Motion Spec (out-of-scope for Figma, locked here for PixiJS step)

Static Figma blueprint is the source of layout. Motion below applies to STEP 3 PixiJS implementation only.

| Element | Motion | Params |
|---|---|---|
| Fog (`LAYER_04_Fog`) | Horizontal drift | Speed 0.2–0.6 px/s, loop seamless, single direction (right-to-left) |
| Campfire brightness | Pulse | Amplitude 3–8% of base brightness, period 2.5–4 s (randomized per cycle) |
| Moon haze | Opacity drift | ±2% around 8%, period 6–10 s |
| Button hover | Brightness lerp | 120ms ease-out |
| Button pressed | Brightness lerp | 80ms ease-out |
| Button release | Brightness lerp back to Default or Hover (depending on cursor) | 120ms |

**Forbidden**: bounce, scale, MMO swoosh, particles.

---

## 9. Audio Hooks (declared, not implemented in Figma)

Reserve event IDs only:
- `sfx.ui.button.hover` (one-shot, metallic, low freq)
- `sfx.ui.button.press`
- `sfx.ui.button.cancel`
- `sfx.ambient.wind` (loop, low freq)
- `sfx.ambient.campfire` (loop, low freq)

Sound design happens later. Names locked here.

---

## 10. Acceptance Criteria (Claude will check via `get_figma_data`)

The Figma file passes verification when ALL of the following match:

1. File contains exactly one page named `MAIN_MENU_V1`.
2. Page contains exactly one frame named `CANVAS_MainMenu_V1` sized 1920×1080.
3. All 9 LAYER_ groups exist in the documented draw order.
4. All Color Styles in §2 exist with exact hex and exact name.
5. All Text Styles in §3 exist.
6. Component `BTN_Main` exists with 4 variants (Default / Hover / Pressed / Disabled).
7. `LAYER_08_MenuButtons` contains 5 instances of `BTN_Main` in Default, with labels "CONTINUE", "NEW GAME", "CHARACTER", "SETTINGS", "EXIT" in that order.
8. Logo group exists with all sub-children renamed per §6.1.
9. No node has the default Figma-generated name (`Rectangle 1`, `Group 2`, etc.).
10. The 12-column + safe-area + 8-grid layout grids are attached to `CANVAS_MainMenu_V1`.

**On verification failure**: Claude outputs a diff report. User fixes. Re-verify. Loop until 0 diff. No exceptions.

---

## 11. Out of Scope (do NOT add to this file)

- Any HUD, Inventory, Tooltip, Skill, Passive Tree, Corruption UI element.
- Final pixel-art assets (campfire pixel sprite, tree pixels, etc.) — those live in Aseprite, not Figma.
- VFX particles, post-processing.
- Localization variants.
- Mobile / responsive variants (forbidden by spec).

---

## 12. Source-of-Truth Hierarchy

If conflicts arise:
1. BAD ARPG Project Plan V10 wins over this spec.
2. This spec wins over the SVG reference.
3. The SVG reference wins over Claude's PixiJS implementation.
4. ChatGPT issued amendments override all above, with explicit version bump.

This file is `BLUEPRINT_SPEC.md v1.0`. Any change → bump to v1.1 with changelog appended.
