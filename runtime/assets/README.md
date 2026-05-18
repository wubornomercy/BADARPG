# BAD ARPG — Asset Placeholder Structure

Phase 1 ships with **SVG silhouette placeholders inlined in `index.html`**.
Phase 2+ replaces them with Aseprite-exported pixel art dropped into the folders below.

## Folder map

```
assets/
├── castle/       # far_castle_silhouette.png       (680x320, 1x exported alpha)
├── forest/       # tree_01.png … tree_N.png        (variable 140-220 tall)
│                 # stake_01.png …                  (~40 tall)
│                 # ruin_01.png …                   (~24 tall)
├── campfire/     # fire_core.gif      (or sprite sheet — flame animation frames)
│                 # fire_outer.gif
│                 # stones.png
├── logo/         # logo_full.png      (620x140 master export)
│                 # logo_brackets.png
│                 # logo_crest.png
└── ui/           # btn_main_default.png   (320x54, also stretched/9-slice option)
                  # btn_main_hover.png
                  # btn_main_pressed.png
                  # btn_main_disabled.png
                  # corner_ornament_tl.png  (8x8)
                  # corner_ornament_tr.png
                  # corner_ornament_bl.png
                  # corner_ornament_br.png
```

## Naming convention
- **lowercase_snake_case**
- Numbered variants use 2 digits: `tree_01`, `tree_02`, ...
- Pixel scale: assets are authored at **1x** (no anti-aliasing). Runtime scales up uniformly.
- States: `<name>_<state>.png` where state ∈ {default, hover, pressed, disabled}.

## File format rules
| Type | Format | Notes |
|---|---|---|
| Static silhouettes | PNG-8 | Indexed palette, max 16 colors per asset |
| Animated flame | GIF or PNG sprite sheet | If sprite sheet, name `fire_core_sheet_8x.png` (8 frames horizontal) |
| Icons | PNG-8 | 1px alpha edge only — no anti-aliased halos |

## What goes where
- **Background silhouettes** (castle, far structures) → `castle/`
- **Mid-ground props** (trees, stakes, ruins) → `forest/`
- **Foreground focal** (campfire, stones, flame frames) → `campfire/`
- **Logo composition pieces** → `logo/`
- **Reusable UI widgets** (buttons, frames, corner ornaments) → `ui/`

## When replacing SVG with PNG
1. Drop the PNG in the right folder.
2. In `index.html`, replace the inline `<svg>...</svg>` block with `<img src="assets/.../foo.png" />`.
3. Match the existing positioning class (`.castle-svg`, `.forest-svg`, `.campfire-svg`) — they already define the correct rectangle.
4. **Do not change positions or sizes** without a corresponding update to `BLUEPRINT_SPEC.md`.

## Out of scope (Phase 1)
- Audio (`sfx/` will be added in Phase 2 — names already reserved in `BLUEPRINT_SPEC.md §9`)
- Localization (only English UI in V1)
- High-DPI variants (single 1x source, runtime scaling only)
