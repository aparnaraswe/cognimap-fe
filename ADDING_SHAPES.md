# Adding New Shapes to CogniMap — Complete Guide

## How the System Resolves a Token

Every token goes through three tiers in order. The first tier that can handle it wins:

```
Token string
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  TIER 1 — Built-in SVG  (TokenRenderer.jsx)              │
│  Shapes: circle, triangle, square, star, diamond,        │
│  hexagon, pentagon, arrow, octagon, cross, dot,          │
│  heart, oval, rectangle, crescent                        │
│  + any modifiers: _hollow, _md, _lg, red_, 3x_, etc.     │
└──────────────────────┬───────────────────────────────────┘
                       │ not found
                       ▼
┌──────────────────────────────────────────────────────────┐
│  TIER 1b — Custom DB Shapes  (Admin → Token Manager)     │
│  SVG code stored in database, fetched at runtime.        │
│  Supports same modifier syntax as built-in shapes.       │
└──────────────────────┬───────────────────────────────────┘
                       │ not found
                       ▼
┌──────────────────────────────────────────────────────────┐
│  TIER 2 — Sprite Sheet  (public/sprites/shapes.png)      │
│  PNG tiles at fixed positions, mapped via               │
│  public/sprites/shapes-manifest.json                     │
│  Progressive prefix lookup (see below)                   │
└──────────────────────┬───────────────────────────────────┘
                       │ not found
                       ▼
              ⊡  placeholder circle / text label


For Gs-domain tokens specifically, GsSymbolSVG has its own
SVG patterns (hourglass, wavy, nested, star_ring, etc.) that
also fall through to the sprite sheet before TextChip.
```

---

## Naming Convention

All token names must follow this pattern:

```
[count_][color_]baseshape[_modifier][_modifier][_size]
```

| Part | Rules | Examples |
|---|---|---|
| `count` | optional leading digit or word | `3_`, `two_` |
| `color` | optional colour prefix | `red_`, `blue_` |
| `baseshape` | **always lowercase, single word** | `circle`, `hourglass`, `wavy` |
| `modifier` | describes a variant | `striped`, `hollow`, `dot1`, `ring` |
| `size` | always **last**, always one of the approved suffixes | `_sm`, `_md`, `_lg`, `_xl` |

### Approved size suffixes (always last, always stripped during lookup)
`_xs`  `_sm`  `_md`  `_lg`  `_xl`  `_tiny`  `_small`  `_medium`  `_large`  `_extralarge`

### Good names
```
hourglass_striped_md       ✓   base=hourglass, modifier=striped, size=md
wavy_circle                ✓   base=wavy, modifier=circle
nested_triangles_lg        ✓   base=nested, modifier=triangles, size=lg
star_4ring                 ✓   base=star, modifier=4ring
diamond_dot2               ✓   base=diamond, modifier=dot2
blue_circle_hollow         ✓   colour=blue, base=circle, modifier=hollow
3_triangle_md              ✓   count=3, base=triangle, size=md
```

### Bad names
```
Hourglass_Striped          ✗   uppercase not allowed
hourglass-striped          ✗   use underscore, not hyphen
md_hourglass               ✗   size must come last
hourglass striped          ✗   no spaces
```

### Progressive prefix lookup
The sprite manifest lookup strips size modifiers and then progressively
removes trailing segments to find the best match:

```
"hourglass_striped_cross_md"  →  tries in order:
  1.  hourglass_striped_cross_md   (exact)
  2.  hourglass_striped_cross      (without _md size suffix)
  3.  hourglass_striped            (prefix, one less segment)
  4.  hourglass                    (prefix, base only)
  → first match wins
```

This means you can add a single manifest entry for `hourglass` and all
variants (`hourglass_md`, `hourglass_striped`, etc.) will fall through to it
unless they have their own more-specific entry.

---

## Option A — Add a Built-in SVG Shape (code only, no image file)

Use this for shapes that can be described mathematically (geometric outlines,
simple decorations). No image files needed.

### Step 1 — Add to `BUILT_IN_SHAPES` in `TokenRenderer.jsx` (~line 33)

```js
const BUILT_IN_SHAPES = [
  'triangle','circle','square','star','diamond','hexagon','pentagon',
  'arrow','octagon','cross','dot','heart','oval','rectangle','crescent',
  'hourglass',   // ← add your new shape here
];
```

### Step 2 — Add a `case` in `drawShapeSVG()` in `TokenRenderer.jsx` (~line 163)

```jsx
case 'hourglass':
  inner = <path d="M20,10 L80,10 L55,50 L80,90 L20,90 L45,50 Z"
            fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  break;
```

All SVG coordinates are in a 0–100 viewBox. The `fill`, `stroke`, and `sw`
variables are already set based on colour and hollow modifiers.

### Step 3 — Add a colour entry in `C` palette (~line 18)

```js
const C = {
  // ... existing colours ...
  hourglass: '#0891B2',   // default colour for this shape
};
```

### Step 4 — Also add to `GsSymbolSVG` in `GsTokenRenderer_additions.jsx`

Add an `if` block before the final fallback at the bottom of `GsSymbolSVG`
so Gs-domain stimuli (inside PipeArray / VsComparison) also render it:

```jsx
if (lc.startsWith('hourglass')) {
  return (
    <svg width={sz} height={sz} viewBox="0 0 100 100">
      <path d="M20,10 L80,10 L55,50 L80,90 L20,90 L45,50 Z"
        fill="rgba(8,145,178,0.15)" stroke="#0369A1" strokeWidth={sw}
        strokeLinejoin="round"/>
    </svg>
  );
}
```

---

## Option B — Add a Custom SVG Shape (admin panel, no code change)

Use this for shapes that can be described mathematically but should be
editable by admins without a code deploy.

1. Go to **Admin → Token Manager → SVG Shapes**
2. Enter:
   - **Shape name**: follow the naming convention (lowercase, underscores)
   - **SVG code**: the inner SVG content using `{fill}`, `{stroke}`, `{sw}`
     as template variables (substituted at render time)
   - **Default colour**: hex code via colour picker
3. A **live preview** shows the shape as you type
4. Click **Save Shape** — available immediately, no deploy needed

The SVG code format (ViewBox 0 0 100 100):
```xml
<path d="M20,10 L80,10 L55,50 L80,90 L20,90 L45,50 Z"
  fill="{fill}" stroke="{stroke}" strokeWidth="{sw}" strokeLinejoin="round"/>
```

---

## Option C — Add a Custom PNG Sprite (admin panel, no code change)

Use this for complex shapes that cannot be described with SVG paths —
photographic textures, hand-drawn art, highly detailed icons.

### Admin panel approach (zero developer intervention)

1. Go to **Admin → Token Manager → PNG Sprites**
2. Enter a **Token Name** (follows naming convention above)
3. Upload a PNG file (64×64 px recommended, transparent background)
4. Click **Upload & Register Shape**
5. The PNG is saved to `/sprites/custom/` and the manifest is updated automatically
6. The token is immediately available — use the name directly in items

This is the **recommended** approach for all new complex shapes.
No developer, no code deploy, no file editing needed.

---

## Option C-manual — Add a Sprite Sheet Shape (image file + manifest entry)

**⚠️ Requires developer.** Use only when you need the shape embedded in the
shared sprite sheet (e.g. for performance when adding many similar shapes at once).

Use this for complex shapes that cannot be described with SVG paths —
photographic textures, hand-drawn art, highly detailed icons.

### Sprite sheet specs

| Property | Value |
|---|---|
| File | `public/sprites/shapes.png` |
| Format | PNG-32 (with transparency / alpha channel) |
| Sheet size | 640 × 640 px (expandable — see below) |
| Tile size | **64 × 64 px** (fixed, do not change) |
| Grid | 10 columns × 10 rows = 100 slots |
| Padding | 4 px inside each tile (effective art area ≈ 56 × 56 px) |
| Background | Transparent |
| Colour space | sRGB |

### Current grid layout

```
     col 0        col 1       col 2        col 3       col 4
row 0  hourglass  hg_striped  hg_dot_top  hg_dot_bot  [empty]
row 1  wavy       wavy_circle wavy_square wavy_line    wavy_dashed
row 2  moon       crescent    crescent_hollow  [empty] [empty]
row 3  nested_circles  nested_squares  nested_tris  nt_outer_st  nt_inner_st
row 4  inner_square  inner_sq_lg  inner_sq_rot  rect_inner_sq  [empty]
row 5  star_ring  star_4ring  star_ring2dashed  [empty]  [empty]
row 6  diamond_dot1  diamond_dot2  [empty]  [empty]  [empty]
row 7  sq_striped  sq_striped_border  circle_shaded  circle_line  square_dot2
row 8  arrow_shaded  arrow_shaded_up  arrow_shaded_upper_right  [empty]  [empty]
row 9  [empty × 10]
```

Empty slots are available for new shapes.

### Step 1 — Paint the new tile

Open `public/sprites/shapes.png` in Photoshop / GIMP / Figma.

- Draw your shape in a **64 × 64 px** tile
- Keep 4 px padding on all sides (content fits in the 56 × 56 centre)
- Use a **transparent background** — the app will place it on dark or light backgrounds
- Export / flatten back to `shapes.png` (do NOT change the canvas size unless
  you are adding a new row — see "Expanding the sheet" below)
- Place the tile at grid position `(col × 64, row × 64)` from the top-left

### Step 2 — Add an entry to `shapes-manifest.json`

Open `public/sprites/shapes-manifest.json` and add one line to `"tokens"`:

```json
"my_new_shape": { "sheet": "shapes", "col": 5, "row": 2 }
```

That is all. No code change, no rebuild — the manifest is fetched live.

If you need a per-tile size different from 64×64 you can override it:
```json
"my_wide_shape": { "sheet": "shapes", "col": 5, "row": 2, "w": 128, "h": 64 }
```

### Expanding the sheet (adding more rows)

When all 100 slots are used:

1. Resize the canvas: add one or more rows of 64 px to the bottom
   (new height = `(current_rows + N) × 64`)
2. Update `"height"` in `shapes-manifest.json`:
   ```json
   "shapes": { "file": "/sprites/shapes.png", "width": 640, "height": 704, ... }
   ```
3. Add your new tile entries with the new row numbers

---

## Quick decision guide

```
New shape needed
       │
       ├─ Admin only (no developer available)?
       │     │
       │     ├─ Can it be drawn with SVG paths?
       │     │     YES → Option B  (Admin → Token Manager → SVG Shapes)
       │     │
       │     └─ NO (photo, texture, complex art)
       │           └─ Option C  (Admin → Token Manager → PNG Sprites)
       │
       └─ Developer available?
             │
             ├─ Simple geometric shape
             │     └─ Option A  (code in TokenRenderer.jsx)
             │
             └─ Complex shape embedded in shared sprite sheet
                   └─ Option C-manual  (edit shapes.png + manifest)
```

| | Option A | Option B | Option C (admin) | Option C-manual |
|---|---|---|---|---|
| Requires code deploy | **Yes** | No | No | No |
| Requires developer | **Yes** | No | No | **Yes** |
| Supports colour modifiers | Yes | Yes | No (fixed colour) | No (fixed colour) |
| Supports hollow/rotation | Yes | Yes | No | No |
| How to add | Edit `TokenRenderer.jsx` | Admin UI | Admin UI PNG upload | Edit PNG + JSON |
| Best for | Simple geometric, dev-managed | Math shapes, admin-managed | Complex art, admin-managed | Batch sheet additions |
