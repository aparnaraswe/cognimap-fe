# Custom SVG Shapes - Database-Driven System

## Overview
Custom SVG shapes are now stored in the database and loaded dynamically. No code changes needed!

## How It Works

### 1. Admin Creates Shape
- Go to `/admin/tokens` → SVG Shapes tab
- Enter shape name (e.g., `hexagram`, `octastar`)
- Choose default color
- Write SVG code using `{fill}`, `{stroke}`, `{sw}` variables
- Click "Save Shape"
- Shape is immediately available!

### 2. System Loads Shapes
- TokenRenderer automatically loads custom shapes from database on first render
- Shapes are cached in memory for performance
- No page refresh needed after adding shapes

### 3. Use in Excel
Just use the shape name like built-in shapes:
```
sequence: hexagram → triangle → ?
sequence: blue_hexagram → red_circle → ?
sequence: three_hexagram → two_triangle → ?
```

## Database Schema

```sql
CREATE TABLE custom_svg_shapes (
    id              UUID PRIMARY KEY,
    shape_name      VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100),
    svg_code        TEXT NOT NULL,
    default_color   VARCHAR(7) DEFAULT '#8B5CF6',
    category        VARCHAR(50),
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Create Shape
```
POST /api/tokens/svg-shape
Authorization: Bearer {token}
Content-Type: application/json

{
  "shapeName": "hexagram",
  "svgCode": "<polygon points='...' fill={fill} stroke={stroke} strokeWidth={sw} />",
  "defaultColor": "#8B5CF6",
  "category": "geometric",
  "description": "Six-pointed star"
}

Response:
{
  "success": true,
  "shape": {...},
  "usage": "hexagram"
}
```

### List All Shapes
```
GET /api/tokens/svg-shapes
Authorization: Bearer {token}

Response:
{
  "shapes": [
    {
      "id": "...",
      "shape_name": "hexagram",
      "svg_code": "...",
      "default_color": "#8B5CF6",
      ...
    }
  ]
}
```

### Get Single Shape
```
GET /api/tokens/svg-shape/:shapeName
Authorization: Bearer {token}
```

### Update Shape
```
PUT /api/tokens/svg-shape/:shapeName
Authorization: Bearer {token}
Content-Type: application/json

{
  "svgCode": "...",
  "defaultColor": "#FF0000"
}
```

### Delete Shape
```
DELETE /api/tokens/svg-shape/:shapeName
Authorization: Bearer {token}
```

## SVG Code Guidelines

### Coordinate System
- ViewBox: `0 0 100 100`
- Center: `(50, 50)`
- Recommended size: Fill 80-90% of viewBox

### Required Variables
Always use these for dynamic styling:
- `{fill}` - Shape fill color
- `{stroke}` - Stroke color  
- `{sw}` - Stroke width

### Example Shapes

**Hexagram (6-pointed star):**
```jsx
<polygon points="50,15 65,40 90,40 70,55 80,80 50,65 20,80 30,55 10,40 35,40" 
         fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
```

**Crescent Moon:**
```jsx
<><circle cx="50" cy="50" r="38" fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx="62" cy="50" r="32" fill="white" /></>
```

**Octastar (8-pointed star):**
```jsx
<polygon points="50,5 60,35 90,35 65,55 75,85 50,65 25,85 35,55 10,35 40,35" 
         fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
```

## Migration

Run the migration to create the table:
```bash
cd cognimap-be-main
node scripts/run-migration-custom-svg.js
```

## Permissions

- **Create/Update:** super_admin, psychologist
- **View:** All authenticated users
- **Delete:** super_admin only

## Advantages Over Hardcoded Shapes

✅ No code editing required
✅ No server restart needed
✅ Instant availability after creation
✅ Centralized management via UI
✅ Audit trail (who created what, when)
✅ Easy to update/delete
✅ Consistent with sprite upload workflow

## Token Validation

Custom shapes are automatically included in token validation:
- Missing custom shapes show in validation warnings
- Built-in + custom shapes both checked
- No special handling needed in Excel

## Performance

- Shapes loaded once on first render
- Cached in memory for subsequent renders
- Minimal database queries
- No performance impact vs hardcoded shapes

## Troubleshooting

### Shape not rendering
1. Check shape name matches exactly (case-sensitive)
2. Verify SVG code uses `{fill}`, `{stroke}`, `{sw}` variables
3. Check browser console for errors
4. Verify shape is active in database

### Shape not in validation
1. Refresh the page to reload custom shapes
2. Check database connection
3. Verify user has authentication token

### SVG code errors
1. Test SVG code in browser first
2. Ensure coordinates are within 0-100 range
3. Use proper SVG syntax (self-closing tags, quotes)
4. Avoid complex transforms (use simple shapes)
