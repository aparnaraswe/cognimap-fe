# Testing Token Validation System

## Quick Test Guide

### Test 1: Upload with Valid Tokens (Should Show ✅)

1. Go to **Admin → Setup & Assign**
2. Upload your current Excel file (without fake tokens)
3. After upload, you should see:
   ```
   ✅ All Tokens Valid
   All XX items can be rendered correctly
   ```

### Test 2: Upload with Missing Tokens (Should Show ⚠️)

1. **Edit your Excel file** and add fake tokens:
   - In any `sequence` column, add: `hexagram → octastar → ?`
   - In any `option1` column, add: `img_sprite_dragon_5`
   - In any `option2` column, add: `img_cube_3d`

2. **Save and upload** the Excel file

3. **Expected result** - Red warning box appears:
   ```
   ⚠️ Missing Tokens Found
   3 tokens need to be created
   
   Token              | Type              | Count | Items
   -------------------|-------------------|-------|-------------
   hexagram           | unknown_shape     |   1   | GF_001
   octastar           | unknown_shape     |   1   | GF_001
   img_sprite_dragon_5| missing_sprite    |   1   | GF_002
   img_cube_3d        | missing_figure... |   1   | GF_003
   ```

4. **Click "📥 Export CSV"** - Downloads CSV with all missing tokens

### Test 3: Multiple Pages

Token validation appears on:
- ✅ **Admin → Item Bank → Upload Items** (ItemUploadPage)
- ✅ **Admin → Setup & Assign** (SetupAssignPage - Step 1)

### Test 4: Real-time Panel (During Test)

1. Assign the test with fake tokens to a student
2. Student logs in and starts test
3. When question with fake token appears:
   - Token shows as default (circle or "?")
   - Floating panel appears in bottom-right
   - Shows missing token details

## Fake Tokens to Test

### Unknown Shapes
```
hexagram
octastar
pentagon_rotated
ultraviolet_triangle
mega_large_circle
```

### Missing Sprites
```
img_sprite_dragon_5
img_sprite_unicorn_3
img_sprite_phoenix_7
```

### Missing Figure Parts
```
img_cube_3d
img_pyramid_missing_face
img_hexagon_missing_two_sides
img_star_missing_two_points
img_sphere_3d
```

### Missing Seesaws
```
img_seesaw_left=5dragons_right=3unicorns
img_seesaw_left=2phoenixes_right=?
```

## Expected Behavior

### ✅ Valid Upload
- Green checkmark box
- "All XX items can be rendered correctly"
- No warning messages
- Can proceed to assign students

### ⚠️ Invalid Upload
- Red warning box at top
- Table showing all missing tokens
- Export CSV button
- Can still proceed (but warned)

## Validation Rules

### Always Valid
- Plain text: `"Which word fits best?"`
- Numbers: `42`, `3.14`, `-5`
- Known shapes: `triangle`, `circle`, `square`, `star`, `diamond`, `hexagon`, `pentagon`, `arrow`, `octagon`, `cross`, `dot`, `heart`, `oval`, `rectangle`, `crescent`
- Known sprites: `apple`, `banana`, `cherry`, `coconut`, `grape`, `lemon`, `orange`, `peach`, `pear`, `pineapple`, `strawberry`, `watermelon`

### Invalid (Will Show Warning)
- Unknown shapes: `hexagram`, `octastar`, `nonagon`
- Missing sprites: `dragon`, `unicorn`, `phoenix`
- Unimplemented figures: `img_cube_3d`, `img_sphere_3d`

## CSV Export Format

```csv
Token,Type,Reason,Count,Items
hexagram,unknown_shape,Shape not in SHAPES array,5,"GF_001; GF_002; GF_003; GF_004; GF_005"
img_dragon_5,missing_sprite,Image dragon.png not found,2,"GV_015; GV_020"
img_cube_3d,missing_figure_part,Image token not implemented,1,"GV_025"
```

## Console Logging

Open browser DevTools (F12) → Console tab

You should see:
```
[TokenRenderer] Missing token: "hexagram" (type: unknown_shape)
[TokenRenderer] Missing token: "img_dragon_5" (type: missing_sprite)
[TokenRenderer] Missing token: "img_cube_3d" (type: missing_figure_part)
```

## Troubleshooting

### "All tokens valid" but I added fake tokens
- Check if fake tokens are actually in the Excel columns that get validated
- Only `sequence`, `option1`, `option2`, `option3`, `option4`, `option5`, `option6` are checked
- Tokens in `prompt` or other columns are not validated

### Validation not showing
- Check browser console for errors
- Verify backend is returning `items` in upload response
- Check network tab: `/api/items/upload` response should include `items` array

### False positives
- Some tokens may be valid but show as invalid if validation logic is too strict
- Check TokenValidator.jsx validation rules
- May need to add token to whitelist

### Export CSV not working
- Check browser console for errors
- Verify browser allows downloads
- Try different browser

## Performance

- Validation is **client-side** (fast, no server load)
- Validates ~1000 items in < 100ms
- No impact on upload speed
- Results appear immediately after upload

## Next Steps After Finding Missing Tokens

1. **Export CSV** - Get full list
2. **Open TokenRenderer.jsx**
3. **Add missing shapes** to SHAPES array
4. **Add missing colors** to C palette
5. **Add missing SVG code** to drawShapeSVG
6. **Add missing images** to /public/ folder
7. **Add missing figure parts** to FigurePart shapes object
8. **Re-upload Excel** - Verify ✅ All tokens valid
9. **Assign to students** - Confident everything works!

## Success Criteria

✅ Upload valid Excel → Green checkmark
✅ Upload with fake tokens → Red warning table
✅ Export CSV → Downloads correctly
✅ Shows correct token names, types, counts
✅ Shows which items use each token
✅ Validation appears on both upload pages
✅ No console errors
✅ Fast performance (< 100ms)
