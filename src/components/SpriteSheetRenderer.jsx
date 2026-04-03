/**
 * SPRITE SHEET RENDERER  v1.0
 * ────────────────────────────────────────────────────────────────────────────
 * Provides sprite-sheet–based rendering as a fallback for tokens that the SVG
 * engine cannot render (unknown shapes, complex decorated variants, custom art).
 *
 * HOW IT WORKS
 * ─────────────
 *  1. A JSON manifest at /public/sprites/shapes-manifest.json maps token names
 *     to (sheet, col, row) or (sheet, x, y, w, h) coordinates.
 *  2. A sprite-sheet PNG (e.g. /public/sprites/shapes.png) contains all the
 *     custom shape images arranged in a grid.
 *  3. <SpriteToken token="hourglass_striped" sz={48} /> finds the manifest
 *     entry and renders the correct tile via CSS background-position clipping.
 *
 * MANIFEST FORMAT  /public/sprites/shapes-manifest.json
 * ───────────────────────────────────────────────────────
 *  {
 *    "version": 1,
 *    "sheets": {
 *      "shapes": {
 *        "file":    "/sprites/shapes.png",   ← path relative to /public
 *        "width":   640,                     ← total PNG width in px
 *        "height":  640,                     ← total PNG height in px
 *        "spriteW": 64,                      ← default sprite tile width
 *        "spriteH": 64                       ← default sprite tile height
 *      }
 *    },
 *    "tokens": {
 *      "hourglass_striped": { "sheet": "shapes", "col": 0, "row": 0 },
 *      "wavy_line":         { "sheet": "shapes", "col": 1, "row": 0 },
 *      "nested_circles":    { "sheet": "shapes", "x": 128, "y": 64, "w": 64, "h": 64, "sheet": "shapes" }
 *    }
 *  }
 *
 * LOOKUP STRATEGY (progressive prefix matching)
 * ───────────────────────────────────────────────
 *  For token "hourglass_striped_cross_md" the lookup tries (in order):
 *    1. "hourglass_striped_cross_md"  (exact)
 *    2. "hourglass_striped_cross"     (without size suffix _md)
 *    3. "hourglass_striped"           (progressive prefix)
 *    4. "hourglass"                   (base shape only)
 *  First match wins.
 *
 * ADDING NEW SPRITES
 * ───────────────────
 *  1. Add your shape image to the sprite sheet PNG at a new grid position.
 *  2. Add an entry to shapes-manifest.json:
 *       "my_shape": { "sheet": "shapes", "col": 2, "row": 3 }
 *  3. No code changes needed — the manifest is fetched at runtime.
 *
 * EXPORTS
 * ────────
 *  useSpriteManifest()               React hook — returns manifest or null
 *  loadSpriteManifest()              Async loader — call once to warm cache
 *  getSpriteManifestSync()           Sync accessor — returns cached manifest or null
 *  lookupSprite(token, manifest)     Pure util — returns spriteInfo or null
 *  SpriteToken({ token, sz })        React component — renders sprite or null
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';

// ── Size suffixes that should be stripped when doing fallback lookup ──────────
const SIZE_SUFFIX_RE = /_(xs|sm|md|lg|xl|tiny|small|medium|large|extralarge)$/i;

// ── Module-level manifest cache (singleton, shared across all instances) ──────
let _manifest   = null;   // null = not yet loaded; {} = loaded (may be empty)
let _loading    = false;
const _waiters  = [];     // resolve callbacks waiting for first load

/**
 * Async manifest loader.  Safe to call multiple times — resolves from cache
 * on subsequent calls.  Resolves to the manifest object (never throws).
 */
export async function loadSpriteManifest() {
  if (_manifest !== null) return _manifest;
  if (_loading) return new Promise(resolve => _waiters.push(resolve));

  _loading = true;
  try {
    const res = await fetch('/sprites/shapes-manifest.json');
    _manifest = res.ok ? await res.json() : { version: 1, sheets: {}, tokens: {} };
  } catch {
    _manifest = { version: 1, sheets: {}, tokens: {} };
  } finally {
    _loading = false;
    // Notify all pending waiters
    _waiters.forEach(fn => fn(_manifest));
    _waiters.length = 0;
  }
  return _manifest;
}

/**
 * Synchronous accessor — returns the cached manifest, or null if not yet loaded.
 * Use where hooks are unavailable (e.g. plain utility functions).
 */
export function getSpriteManifestSync() {
  return _manifest;
}

/**
 * React hook — subscribes to manifest loading and triggers a re-render once
 * the manifest is available.  Returns null on first render (before fetch
 * completes) and the manifest object once loaded.
 */
export function useSpriteManifest() {
  const [manifest, setManifest] = useState(_manifest);
  useEffect(() => {
    if (_manifest !== null) {
      // Already cached — update state synchronously on mount
      setManifest(_manifest);
    } else {
      // Kick off loading; setManifest will cause re-render when done
      loadSpriteManifest().then(m => setManifest(m));
    }
  }, []);
  return manifest;
}

/**
 * Look up a token in the manifest.
 *
 * @param {string}  token    — raw token string, e.g. "hourglass_striped_cross_md"
 * @param {object|null} manifest — manifest object from useSpriteManifest / loadSpriteManifest
 * @returns {{ file, x, y, w, h, sheetW, sheetH } | null}
 */
export function lookupSprite(token, manifest) {
  if (!manifest || !token) return null;

  const { tokens = {}, sheets = {} } = manifest;
  const lc = String(token).toLowerCase().trim();

  // Build ordered candidate list — most specific first
  const candidates = [];
  candidates.push(lc);

  // Sanitized form: replace non-alphanumeric runs with "_"
  // Handles tokens like "Reflection: horizontal reflection" → "reflection_horizontal_reflection"
  // which is how the backend stores and the manifest keys are named.
  const sanitized = lc.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (sanitized !== lc && !candidates.includes(sanitized)) candidates.push(sanitized);

  // Without trailing size modifier (_md, _lg, etc.)
  const withoutSize = lc.replace(SIZE_SUFFIX_RE, '');
  if (withoutSize !== lc && !candidates.includes(withoutSize)) candidates.push(withoutSize);

  // Also sanitized + without size suffix
  const sanitizedWithoutSize = sanitized.replace(SIZE_SUFFIX_RE, '');
  if (sanitizedWithoutSize !== sanitized && !candidates.includes(sanitizedWithoutSize)) candidates.push(sanitizedWithoutSize);

  // Progressive prefix: "a_b_c" → "a_b" → "a"
  // Run on both the original lc and the sanitized form to cover all bases
  const prefixBase = sanitized !== lc ? sanitized : lc;
  const parts = prefixBase.split('_');
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('_');
    if (!candidates.includes(prefix)) candidates.push(prefix);
  }

  let entry = null;
  for (const c of candidates) {
    if (tokens[c]) { entry = tokens[c]; break; }
  }
  if (!entry) return null;

  // ── Individual-file entry (admin-uploaded custom sprite) ──────────────────
  // Format: { "file": "/sprites/custom/my_shape.png" }
  if (entry.file && !entry.sheet) {
    const w = entry.w || 64;
    const h = entry.h || 64;
    return { file: entry.file, x: 0, y: 0, w, h, sheetW: w, sheetH: h };
  }

  // ── Sheet-based entry (built-in sprite sheet) ─────────────────────────────
  const sheetDef = sheets[entry.sheet];
  if (!sheetDef) return null;

  const spriteW = entry.w  !== undefined ? entry.w  : (sheetDef.spriteW || 64);
  const spriteH = entry.h  !== undefined ? entry.h  : (sheetDef.spriteH || 64);
  const x       = entry.x  !== undefined ? entry.x  : ((entry.col || 0) * spriteW);
  const y       = entry.y  !== undefined ? entry.y  : ((entry.row || 0) * spriteH);

  return {
    file:   sheetDef.file,
    x, y,
    w:      spriteW,
    h:      spriteH,
    sheetW: sheetDef.width,
    sheetH: sheetDef.height,
  };
}

/**
 * Renders a single sprite tile from a sprite sheet using CSS background clipping.
 *
 * Returns null if:
 *  - manifest not yet loaded
 *  - no entry found for this token (allows callers to fall back to SVG rendering)
 *
 * @param {{ token: string, sz?: number }} props
 */
export function SpriteToken({ token, sz = 48 }) {
  const manifest  = useSpriteManifest();
  const sprite    = lookupSprite(token, manifest);

  if (!sprite) return null;   // not found — let caller fall back

  const { file, x, y, w, h, sheetW, sheetH } = sprite;

  // Scale sprite tile to requested display size
  const scale         = sz / Math.max(w, h);
  const scaledSheetW  = Math.round(sheetW * scale);
  const scaledSheetH  = Math.round(sheetH * scale);
  const posX          = -Math.round(x * scale);
  const posY          = -Math.round(y * scale);

  return (
    <div
      title={token}
      style={{
        width:               sz,
        height:              sz,
        backgroundImage:     `url(${file})`,
        backgroundPosition:  `${posX}px ${posY}px`,
        backgroundSize:      `${scaledSheetW}px ${scaledSheetH}px`,
        backgroundRepeat:    'no-repeat',
        display:             'inline-block',
        flexShrink:          0,
        borderRadius:        3,
        imageRendering:      'auto',   // use 'pixelated' for pixel art sprites
      }}
    />
  );
}

export default SpriteToken;
