# Missing Tokens Tracking System

## Overview
The Missing Tokens system automatically detects and logs any tokens (shapes, images, figure parts) that couldn't be rendered properly. This helps you identify which tokens need to be created when uploading Excel files.

## Features

### 1. Automatic Detection
- Tracks unknown shapes that default to circles
- Logs missing figure parts (img_* tokens)
- Records missing sprite images
- Counts how many times each token appears

### 2. Real-time Panel
A floating panel appears in the bottom-right corner showing:
- Token name
- Token type (unknown_shape, missing_figure_part, etc.)
- Count (how many times it appeared)
- Clear and Close buttons

### 3. Admin Page
Visit `/admin/missing-tokens` to see:
- Complete table of all missing tokens
- First seen and last seen timestamps
- Export to CSV functionality
- Auto-refresh toggle
- Clear all records

## Where It Appears

### During Testing
- **TestRunner page**: Panel shows up automatically when missing tokens are detected
- Helps students/teachers see what's not rendering

### During Upload
- **ItemUploadPage**: Panel appears after uploading Excel files
- Shows immediately which tokens from your Excel need to be created

### Admin Dashboard
- **MissingTokensPage**: Dedicated page for reviewing all missing tokens
- Access via: `/admin/missing-tokens`

## How to Use

### When Uploading Excel Files

1. Upload your Excel file with test items
2. If any tokens are missing, a panel will appear in the bottom-right
3. Click the panel to see details:
   - Token name (e.g., "hexagram", "img_cube_3d")
   - Type (unknown_shape, missing_figure_part)
   - Count (how many items use this token)

### Fixing Missing Tokens

#### For Unknown Shapes
1. Open `cognimap-fe-main/src/components/TokenRenderer.jsx`
2. Add the shape name to the `SHAPES` array:
   ```javascript
   const SHAPES = ['triangle', 'circle', 'square', 'star', 'diamond', 'hexagon', 'pentagon', 'arrow', 'octagon', 'cross', 'dot', 'heart', 'oval', 'rectangle', 'crescent', 'YOUR_NEW_SHAPE'];
   ```
3. Add the color to the `C` palette:
   ```javascript
   const C = {
     // Shape auto-colors
     triangle: '#6366F1', circle: '#0891B2', square: '#D97706',
     YOUR_NEW_SHAPE: '#YOUR_COLOR',
     // ...
   };
   ```
4. Add the SVG drawing code in `drawShapeSVG` switch statement:
   ```javascript
   case 'YOUR_NEW_SHAPE':
     inner = <polygon points="..." fill={fill} stroke={stroke} strokeWidth={sw} />;
     break;
   ```

#### For Missing Figure Parts
1. Open `cognimap-fe-main/src/components/TokenRenderer.jsx`
2. Find the `FigurePart` function
3. Add your renderer to the `shapes` object:
   ```javascript
   const shapes = {
     // existing shapes...
     your_new_figure: () => (
       <>
         <circle cx="50" cy="50" r="25" fill={fill} stroke={stk} strokeWidth="3" />
         {/* your SVG code */}
       </>
     ),
   };
   ```

#### For Missing Images
1. Add the image file to `cognimap-fe-main/public/`
2. Use naming convention: `apple.png`, `banana.png`, etc.
3. Reference in Excel as: `img_sprite_apple_5`

## API Functions

### Export Functions
```javascript
import { getMissingTokens, clearMissingTokens, logMissingToken } from './components/TokenRenderer';

// Get all missing tokens
const tokens = getMissingTokens();
// Returns: [{ token, type, count, firstSeen, lastSeen }, ...]

// Clear all records
clearMissingTokens();

// Manually log a missing token (usually automatic)
logMissingToken('hexagram', 'unknown_shape');
```

## Console Logging
Missing tokens are also logged to the browser console:
```
[TokenRenderer] Missing token: "hexagram" (type: unknown_shape)
```

## Export to CSV
1. Go to `/admin/missing-tokens`
2. Click "📥 Export CSV"
3. Opens a CSV file with all missing tokens
4. Share with developers or use for documentation

## Token Types

- `unknown_shape`: Shape name not in SHAPES array
- `missing_figure_part`: img_* token not implemented
- `missing_sprite`: Image file not found in /public/

## Best Practices

1. **Check after every upload**: Review the panel after uploading Excel files
2. **Export regularly**: Export CSV to track which tokens need implementation
3. **Clear periodically**: Clear old records to keep the list relevant
4. **Test thoroughly**: Run through test items to catch all missing tokens
5. **Document new tokens**: Add comments in TokenRenderer.jsx for custom tokens

## Troubleshooting

### Panel not appearing
- Check browser console for errors
- Ensure MissingTokensPanel is imported in the page
- Verify tokens are actually missing (not just rendering differently)

### False positives
- Some tokens intentionally default to circles (design choice)
- Check if the token is actually in your Excel file
- Verify token naming matches conventions

### Auto-refresh not working
- Check if auto-refresh is enabled (toggle button)
- Refresh interval is 2 seconds
- Browser may throttle intervals when tab is inactive

## Future Enhancements

Potential improvements:
- Filter by token type
- Search functionality
- Suggested fixes based on token name
- Integration with Excel upload validation
- Batch token creation wizard
