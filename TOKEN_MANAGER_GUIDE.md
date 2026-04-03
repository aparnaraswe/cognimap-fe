# Token Manager - Admin Guide

## Overview
The Token Manager allows admins to add new SVG shapes and upload PNG sprite images without editing code directly.

## Access
**URL:** `/admin/tokens` (add to your admin navigation)

**Permissions:** Super Admin or Psychologist

---

## Features

### 1. Add SVG Shapes

**What it does:** Generates code for new SVG shapes that you can add to TokenRenderer.jsx

**Steps:**
1. Go to **📐 SVG Shapes** tab
2. Enter shape name (e.g., "hexagram", "octastar")
3. Choose default color
4. Write SVG code:
   ```jsx
   <polygon points="50,12 90,88 10,88" fill={fill} stroke={stroke} strokeWidth={sw} />
   ```
5. Click **Generate Code**
6. Copy the generated code
7. Paste into `TokenRenderer.jsx`:
   - Add to `SHAPES` array
   - Add to `C` palette
   - Add to `drawShapeSVG` switch statement

**Example:**
```javascript
// Input
Shape Name: hexagram
Color: #8B5CF6
SVG Code: <polygon points="50,15 65,40 90,40 70,55 80,80 50,65 20,80 30,55 10,40 35,40" fill={fill} stroke={stroke} strokeWidth={sw} />

// Output (Generated Code)
// Add to SHAPES array:
const SHAPES = [..., 'hexagram'];

// Add to C palette:
const C = {
  ...
  hexagram: '#8B5CF6',
};

// Add to drawShapeSVG switch:
case 'hexagram':
  inner = <polygon points="50,15 65,40 90,40 70,55 80,80 50,65 20,80 30,55 10,40 35,40" fill={fill} stroke={stroke} strokeWidth={sw} />;
  break;
```

---

### 2. Upload PNG Sprites

**What it does:** Uploads PNG images to `/public/` folder for use as sprites

**Steps:**
1. Go to **🖼️ PNG Sprites** tab
2. Click or drag-drop PNG image
3. Preview appears
4. Click **Upload Sprite**
5. File is saved to `/public/` folder
6. Use in Excel as: `img_sprite_filename_5`

**Requirements:**
- File format: PNG, JPG, GIF (PNG recommended)
- Size: Max 5MB
- Recommended dimensions: 128x128px or 256x256px
- Transparent background recommended

**Example:**
```
Upload: dragon.png
→ Saved to: /public/dragon.png
→ Use in Excel: img_sprite_dragon_5
```

---

### 3. View Existing Tokens

**What it does:** Shows all currently available shapes and sprites

**Tabs:**
- **📐 SVG Shapes:** Lists all 15 existing shapes
- **🖼️ PNG Sprites:** Lists all 12 existing sprites

**Usage examples shown:**
- `triangle` → Renders SVG triangle
- `blue_circle` → Renders blue SVG circle
- `img_sprite_apple_5` → Shows 5 apple images
- `img_seesaw_left=4apples_right=2oranges` → Seesaw with fruits

---

## SVG Shape Guidelines

### Coordinate System
- ViewBox: `0 0 100 100`
- Center: `(50, 50)`
- Recommended size: Fill 80-90% of viewBox

### Required Variables
Always use these variables for dynamic styling:
- `{fill}` - Shape fill color
- `{stroke}` - Stroke color
- `{sw}` - Stroke width

### Example Shapes

**Triangle:**
```jsx
<polygon points="50,12 90,88 10,88" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
```

**Hexagram (6-pointed star):**
```jsx
<polygon points="50,15 65,40 90,40 70,55 80,80 50,65 20,80 30,55 10,40 35,40" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
```

**Crescent:**
```jsx
<>
  <circle cx="50" cy="50" r="38" fill={fill} stroke={stroke} strokeWidth={sw} />
  <circle cx="62" cy="50" r="32" fill="white" />
</>
```

---

## PNG Sprite Guidelines

### File Naming
- Use lowercase
- No spaces (use hyphens)
- Descriptive names
- Examples: `dragon.png`, `unicorn.png`, `robot-blue.png`

### Image Specs
- **Format:** PNG (with transparency)
- **Size:** 128x128px or 256x256px
- **Background:** Transparent
- **Style:** Clear, recognizable, child-friendly

### Usage in Excel
```
Filename: dragon.png
Token: img_sprite_dragon_5

Filename: robot-blue.png
Token: img_sprite_robot-blue_3
```

---

## Backend API

### Upload Sprite
```
POST /api/tokens/upload-sprite
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
  sprite: [file]

Response:
{
  "success": true,
  "filename": "dragon.png",
  "name": "dragon",
  "path": "/public/dragon.png",
  "size": 15234,
  "usage": "img_sprite_dragon_5"
}
```

### List Sprites
```
GET /api/tokens/sprites
Authorization: Bearer {token}

Response:
{
  "sprites": [
    {
      "filename": "apple.png",
      "name": "apple",
      "usage": "img_sprite_apple_5"
    },
    ...
  ]
}
```

### Delete Sprite
```
DELETE /api/tokens/sprite/:filename
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Sprite deleted"
}
```

---

## Workflow

### Adding a New SVG Shape

1. **Design the shape**
   - Sketch on paper or use design tool
   - Plan coordinates for 100x100 viewBox

2. **Generate SVG code**
   - Use Token Manager or write manually
   - Test coordinates

3. **Add to TokenRenderer.jsx**
   ```javascript
   // 1. Add to SHAPES array (line ~32)
   const SHAPES = [..., 'hexagram'];
   
   // 2. Add to C palette (line ~20)
   const C = {
     ...
     hexagram: '#8B5CF6',
   };
   
   // 3. Add to drawShapeSVG switch (line ~95)
   case 'hexagram':
     inner = <polygon points="..." fill={fill} stroke={stroke} strokeWidth={sw} />;
     break;
   ```

4. **Test in Excel**
   ```
   sequence: hexagram → triangle → ?
   ```

5. **Verify rendering**
   - Upload Excel
   - Check token validation
   - Take test to see shape

---

### Adding a New PNG Sprite

1. **Prepare image**
   - 128x128px or 256x256px
   - PNG with transparency
   - Clear, recognizable design

2. **Upload via Token Manager**
   - Go to PNG Sprites tab
   - Upload file
   - Note the usage token

3. **Use in Excel**
   ```
   sequence: img_sprite_dragon_5
   ```

4. **Verify rendering**
   - Upload Excel
   - Check token validation
   - Take test to see sprite

---

## Troubleshooting

### SVG Shape Not Rendering
- Check if added to all 3 places in TokenRenderer.jsx
- Verify SVG syntax is correct
- Check coordinates are within 0-100 range
- Ensure using `{fill}`, `{stroke}`, `{sw}` variables

### PNG Sprite Not Loading
- Check file is in `/public/` folder
- Verify filename matches token (case-sensitive)
- Check file extension is `.png`
- Ensure file size < 5MB

### Upload Fails
- Check file format (must be image)
- Check file size (max 5MB)
- Verify admin permissions
- Check backend is running

### Token Validation Shows Missing
- For SVG: Add to TokenRenderer.jsx
- For PNG: Upload file to `/public/`
- Restart frontend dev server
- Clear browser cache

---

## Best Practices

### SVG Shapes
✅ Use simple, clear shapes
✅ Center shapes at (50, 50)
✅ Fill 80-90% of viewBox
✅ Use consistent stroke width
✅ Test at different sizes
✅ Use semantic names

❌ Don't make shapes too complex
❌ Don't use absolute positioning
❌ Don't hardcode colors
❌ Don't exceed viewBox bounds

### PNG Sprites
✅ Use consistent dimensions
✅ Use transparent backgrounds
✅ Use clear, recognizable images
✅ Optimize file size
✅ Use descriptive filenames
✅ Test visibility at small sizes

❌ Don't use huge files (>1MB)
❌ Don't use white backgrounds
❌ Don't use unclear images
❌ Don't use special characters in filenames

---

## Future Enhancements

Potential improvements:
- Live SVG preview in Token Manager
- Drag-and-drop SVG code editor
- Batch sprite upload
- Sprite sheet generator
- Token usage analytics
- Auto-generate token documentation
- Visual token picker for Excel
- Token categories/tags
