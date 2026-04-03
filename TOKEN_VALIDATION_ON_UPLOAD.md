# Token Validation on Upload

## Overview
When you upload an Excel file with test items, the system now **immediately validates all tokens** and shows which ones are missing - before students ever see them.

## How It Works

### 1. Upload Excel File
- Go to **Admin → Item Bank → Upload Items**
- Drop or select your Excel file
- Click "Upload"

### 2. Automatic Validation
After upload completes, the system:
- Extracts all tokens from `sequence` and `option` columns
- Validates each token against TokenRenderer
- Checks:
  - ✅ Shapes exist in SHAPES array
  - ✅ Colors exist in C palette
  - ✅ Images exist in /public/ folder
  - ✅ Figure parts are implemented
  - ✅ Sprite images are available

### 3. Results Display

#### All Tokens Valid ✅
```
┌─────────────────────────────────┐
│ ✅ All Tokens Valid             │
│ All 45 items can be rendered   │
│ correctly                       │
└─────────────────────────────────┘
```

#### Missing Tokens Found ⚠️
```
┌──────────────────────────────────────────────────┐
│ ⚠️ Missing Tokens Found                          │
│ 3 tokens need to be created                     │
│                                    [📥 Export CSV]│
├──────────────────────────────────────────────────┤
│ Token          │ Type           │ Count │ Items  │
├──────────────────────────────────────────────────┤
│ hexagram       │ unknown_shape  │   5   │ GF_001,│
│                │                │       │ GF_002 │
├──────────────────────────────────────────────────┤
│ img_dragon_5   │ missing_sprite │   2   │ GV_015 │
├──────────────────────────────────────────────────┤
│ img_cube_3d    │ missing_figure │   1   │ GV_020 │
└──────────────────────────────────────────────────┘
⚠️ Action Required: Add these tokens to 
TokenRenderer.jsx before assigning to students
```

## What Gets Validated

### Shape Tokens
- `triangle`, `circle`, `square`, `hexagram` ❌
- `blue_triangle`, `red_circle`
- `two_circles`, `three_squares`
- `small_triangle`, `large_circle`
- `triangle_up`, `arrow_right`

### Image Tokens
- `img_sprite_apple_5` ✅
- `img_sprite_dragon_5` ❌ (dragon.png not in /public/)
- `img_seesaw_left=4apples_right=2oranges` ✅
- `img_bar_10` ✅
- `img_cube_3d` ❌ (not implemented)

### Figure Parts
- `img_circle_missing_quarter` ✅
- `img_star_missing_point` ✅
- `img_hexagon_missing_two_sides` ❌ (not implemented)

### Position Tokens
- `pos_triangle_top_left` ✅
- `pos_circle_center` ✅

## Export to CSV

Click **📥 Export CSV** to download a spreadsheet with:
- Token name
- Type (unknown_shape, missing_sprite, etc.)
- Reason (why it failed validation)
- Count (how many items use it)
- Items (which itemIds contain this token)

Share this with developers to implement missing tokens.

## Token Types

| Type | Description | Fix |
|------|-------------|-----|
| `unknown_shape` | Shape not in SHAPES array | Add to SHAPES array in TokenRenderer.jsx |
| `missing_sprite` | Image file not found | Add image to /public/ folder |
| `missing_figure_part` | Figure renderer not implemented | Add to FigurePart shapes object |

## Validation Logic

### Shapes
```javascript
// Valid if shape name is in SHAPES array
SHAPES = ['triangle', 'circle', 'square', 'star', ...]

// Examples:
'triangle' → ✅ valid
'hexagram' → ❌ unknown_shape
'blue_triangle' → ✅ valid (has 'triangle')
```

### Images
```javascript
// Sprites: must exist in /public/
'img_sprite_apple_5' → ✅ (apple.png exists)
'img_sprite_dragon_5' → ❌ (dragon.png missing)

// Figure parts: must be in FigurePart shapes object
'img_circle_missing_quarter' → ✅ (implemented)
'img_cube_3d' → ❌ (not implemented)
```

### Text/Numbers
```javascript
// Always valid - rendered as text
'42' → ✅ valid (number)
'Which word fits best?' → ✅ valid (text)
```

## Benefits

1. **Catch errors early** - Before assigning to students
2. **No surprises** - Know exactly what needs to be created
3. **Save time** - Don't wait for students to report issues
4. **Better UX** - Students never see broken tokens
5. **Documentation** - Export CSV for developer reference

## Workflow

```
1. Upload Excel
   ↓
2. System validates all tokens
   ↓
3. Shows results immediately
   ↓
4. If missing tokens:
   - Export CSV
   - Add tokens to TokenRenderer.jsx
   - Re-upload Excel
   - Verify all tokens valid ✅
   ↓
5. Assign to students (confident all tokens work!)
```

## Example: Adding Missing Token

If validation shows `hexagram` is missing:

1. **Open** `cognimap-fe-main/src/components/TokenRenderer.jsx`

2. **Add to SHAPES array:**
```javascript
const SHAPES = [
  'triangle', 'circle', 'square', 'star', 
  'diamond', 'hexagon', 'pentagon', 'arrow', 
  'octagon', 'cross', 'dot', 'heart', 
  'oval', 'rectangle', 'crescent',
  'hexagram' // ← Add here
];
```

3. **Add color:**
```javascript
const C = {
  // Shape auto-colors
  triangle: '#6366F1', 
  circle: '#0891B2', 
  // ...
  hexagram: '#8B5CF6', // ← Add here
};
```

4. **Add SVG drawing:**
```javascript
case 'hexagram':
  // Draw 6-pointed star (Star of David)
  inner = (
    <>
      <polygon points="50,15 65,40 90,40 70,55 80,80 50,65 20,80 30,55 10,40 35,40" 
               fill={fill} stroke={stroke} strokeWidth={sw} />
    </>
  );
  break;
```

5. **Re-upload Excel** - Should now show ✅ All Tokens Valid

## Notes

- Validation happens **client-side** (fast, no server load)
- Only validates tokens that will be rendered
- Plain text and numbers always pass validation
- Case-insensitive for shape names
- Supports plurals (e.g., "circles" → "circle")

## Future Enhancements

- Preview rendering of each token
- Suggest similar tokens for typos
- Auto-generate missing token templates
- Batch token creation wizard
- Integration with Excel template generator
