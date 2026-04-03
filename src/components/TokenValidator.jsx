import React from 'react';

/**
 * TokenValidator - Validates tokens from uploaded items
 * Checks if all tokens can be rendered before students see them
 */

const SHAPES = ['triangle', 'circle', 'square', 'star', 'diamond', 'hexagon', 'pentagon', 'arrow', 'octagon', 'cross', 'dot', 'heart', 'oval', 'rectangle', 'crescent'];

const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'cyan', 'magenta', 'darkblue', 'lightblue', 'darkBlue', 'lightBlue', 'dark', 'black', 'white'];

const FIGURE_PARTS = [
  'circle_missing_quarter', 'quarter_circle', 'circle_quarter', 'half_circle',
  'square_missing_corner', 'square_corner', 'square_half',
  'diamond_missing_half', 'diamond_half',
  'triangle_half', 'triangle_piece', 'triangle_corner', 'triangle_side',
  'hexagon_side', 'rectangle_side', 'hexagon_missing_side',
  'star_missing_point', 'star_point',
  'correct_segment', 'mirrored_segment', 'rotated_segment',
  'complex_shape_missing_segment',
  'circle_small', 'triangle_small'
];

const SPRITE_IMAGES = ['apple', 'banana', 'cherry', 'coconut', 'grape', 'lemon', 'orange', 'peach', 'pear', 'pineapple', 'strawberry', 'watermelon'];

/**
 * Split a stimulus string into individual tokens (mirrors cat-engine.js parseStimulus)
 */
function parseStimulusTokens(str) {
  if (!str || typeof str !== 'string') return [];
  let s = str.trim();
  // Strip "Row N: " prefix (matrix items)
  s = s.replace(/^Row\s*\d+\s*:\s*/i, '');
  let parts;
  if (s.includes('→')) {
    parts = s.split(/\s*→\s*/);
  } else if (s.includes('::')) {
    parts = s.split(/\s*::\s*/).flatMap(h => h.split(/\s*:\s*/));
  } else if (s.includes('|')) {
    parts = s.split(/\s*\|\s*/);
  } else {
    parts = [s];
  }
  return parts.map(p => p.trim().replace(/^\[/, '').replace(/\]$/, '').trim()).filter(p => p && p !== '?');
}

/**
 * Extract all tokens from a v2-format item (stimulusRow1, stimulusRow2, optionA/B/C)
 */
function extractTokensFromItem(item) {
  const tokens = new Set();

  // v2 format: stimulusRow1 / stimulusRow2
  if (item.stimulusRow1) parseStimulusTokens(item.stimulusRow1).forEach(t => tokens.add(t));
  if (item.stimulusRow2) parseStimulusTokens(item.stimulusRow2).forEach(t => tokens.add(t));

  // v2 format: optionA / optionB / optionC
  ['optionA', 'optionB', 'optionC'].forEach(k => {
    if (item[k]) tokens.add(String(item[k]).trim());
  });

  // Legacy format fallback: sequence, option1..6
  if (item.sequence) {
    const seqStr = String(item.sequence);
    seqStr.split(/[→,\s]+/).filter(p => p && p !== '?').forEach(p => tokens.add(p.trim()));
  }
  for (let i = 1; i <= 6; i++) {
    if (item[`option${i}`]) tokens.add(String(item[`option${i}`]).trim());
  }

  return Array.from(tokens);
}

/**
 * Detect template placeholder stimuli — these are descriptions of visual exercises
 * that need image assets to be built, not shape tokens.
 * Matches patterns like:
 *   "symbol_matching stimulus: exact_match"
 *   "perceptual_cancellation stimulus: target_cancel"
 *   "Reflection: horizontal reflection"
 *   "Embedded figures: figure ground"
 */
function isTemplatePlaceholder(str) {
  if (!str) return false;
  const s = String(str).trim();
  // Pattern 1: "word stimulus: word"  (Gs-style)
  if (/\b\w+\s+stimulus:\s*\w+/i.test(s)) return true;
  // Pattern 2: "Category: description with spaces"  (Gv-style — has colon + space + words)
  if (/^[A-Za-z][A-Za-z\s_]+:\s+[A-Za-z]/.test(s)) return true;
  return false;
}

/**
 * Validate a single token — returns { valid, type, reason? }
 */

function validateToken(token) {
  if (!token || token === '?' || token === '') return { valid: true };

  const t = String(token).trim();

  // Pure numbers — always valid
  if (/^-?\d+\.?\d*$/.test(t)) return { valid: true, type: 'number' };

  // Template placeholder descriptions — not token errors, they need image assets
  // (handled separately by the upload skip logic → pending_items)
  if (isTemplatePlaceholder(t)) return { valid: true, type: 'template_placeholder' };

  // KEY RULE: real shape/image tokens NEVER contain spaces.
  // Any value with a space is plain text (e.g. "The 4th one", "Option 1", "3 steps",
  // "Different, position 3 changed", "Shapes 1 and 4") — always valid, never a token error.
  if (/\s/.test(t)) return { valid: true, type: 'text' };

  // Label tokens: label:Same, label:Different, label:Reversed etc — always valid text labels
  if (t.startsWith('label:')) return { valid: true, type: 'label' };

  // Position index tokens: pos_1, pos_2 … pos_N — always valid
  if (/^pos_\d+$/.test(t)) return { valid: true, type: 'position_index' };

  // Ratio tokens: ratio:partA:partB (each part validated recursively)
  if (t.startsWith('ratio:')) {
    const parts = t.slice(6).split(':').filter(Boolean);
    for (const p of parts) {
      const r = validateToken(p);
      if (!r.valid) return { valid: false, type: 'ratio_part_invalid', reason: `ratio part "${p}": ${r.reason}` };
    }
    return { valid: true, type: 'ratio' };
  }

  // Count tokens: N_shape_size  (e.g. 3_circle_md)
  if (/^\d+_/.test(t)) {
    const inner = t.replace(/^\d+_/, '');
    return validateShapeToken(inner);
  }

  // Position tokens
  if (t.startsWith('pos_')) return validateShapeToken(t.slice(4).replace(/_?(top|bottom|left|right|center|top_left|top_right|bottom_left|bottom_right)$/, ''));

  // Image tokens
  if (t.startsWith('img_')) return validateImgToken(t);

  // Excel-embedded image tokens — always valid (image file exists on server)
  if (t.startsWith('excel_img:')) return { valid: true, type: 'excel_img' };

  // Shape tokens
  return validateShapeToken(t);
}

/**
 * Validate shape token
 */
function validateShapeToken(token) {
  const t = token.toLowerCase();
  
  // Check if it contains a known shape
  const hasShape = SHAPES.some(s => t.includes(s) || t.includes(s + 's'));
  
  if (!hasShape) {
    return { valid: false, type: 'unknown_shape', reason: 'Shape not in SHAPES array' };
  }
  
  return { valid: true, type: 'shape' };
}

/**
 * Validate image token
 */
function validateImgToken(token) {
  const cl = token.slice(4); // Remove 'img_'
  
  // Seesaw
  if (cl.startsWith('seesaw')) {
    // Check if fruits are valid
    const fruits = cl.match(/\b(apple|banana|cherry|coconut|grape|lemon|orange|peach|pear|pineapple|strawberry|watermelon)s?\b/gi);
    if (fruits) return { valid: true, type: 'seesaw' };
    return { valid: false, type: 'missing_sprite', reason: 'Unknown fruit in seesaw' };
  }
  
  // Sprite grids
  const spriteM = cl.match(/^sprite_(\w+)_(\d+)/);
  if (spriteM) {
    const fruit = spriteM[1];
    if (SPRITE_IMAGES.includes(fruit)) {
      return { valid: true, type: 'sprite' };
    }
    return { valid: false, type: 'missing_sprite', reason: `Image ${fruit}.png not found` };
  }
  
  // Bar chart
  if (cl.match(/^bar_(\d+)/)) return { valid: true, type: 'bar' };
  
  // Figure parts
  if (FIGURE_PARTS.some(fp => cl.includes(fp))) {
    return { valid: true, type: 'figure_part' };
  }
  
  // Complex patterns
  if (cl.includes('complex') || cl.includes('pattern')) {
    return { valid: true, type: 'complex_pattern' };
  }
  
  // Answer labels
  if (cl.match(/^answer_(.+)/)) return { valid: true, type: 'answer_label' };
  
  // Grids
  if (cl.match(/^grid_(\d+)x(\d+)/)) return { valid: true, type: 'grid' };
  
  // 3D placeholders
  if (cl.startsWith('3d') || cl.startsWith('solid') || cl.startsWith('cube') || 
      cl.startsWith('prism') || cl.startsWith('pyramid') || cl.startsWith('net_') || 
      cl.startsWith('isometric') || cl.startsWith('paper_fold')) {
    return { valid: true, type: '3d_placeholder' };
  }
  
  // Graph placeholders
  if (cl.includes('graph') || cl.includes('parabola') || cl.includes('scatter') || 
      cl.includes('histogram') || cl.includes('boxplot')) {
    return { valid: true, type: 'graph_placeholder' };
  }
  
  // Venn
  if (cl.startsWith('venn')) return { valid: true, type: 'venn' };
  
  // Tree
  if (cl.startsWith('tree')) return { valid: true, type: 'tree' };
  
  // Symbol matrix
  if (cl.startsWith('symbol_matrix')) return { valid: true, type: 'symbol_matrix' };
  
  // Unknown image token
  return { valid: false, type: 'missing_figure_part', reason: 'Image token not implemented' };
}

/**
 * Validate all items and return missing tokens
 */
export function validateItems(items) {
  const missingTokens = new Map();
  
  items.forEach(item => {
    const tokens = extractTokensFromItem(item);
    
    tokens.forEach(token => {
      const validation = validateToken(token);
      
      if (!validation.valid) {
        const key = token;
        if (missingTokens.has(key)) {
          const entry = missingTokens.get(key);
          entry.count++;
          entry.items.push(item.itemId || 'unknown');
        } else {
          missingTokens.set(key, {
            token,
            type: validation.type,
            reason: validation.reason,
            count: 1,
            items: [item.itemId || 'unknown']
          });
        }
      }
    });
  });
  
  return Array.from(missingTokens.values());
}

/**
 * Classify a token for the summary breakdown
 */
function classifyToken(val) {
  if (!val) return 'empty';
  const v = String(val).trim();
  if (!v || v === '?') return 'placeholder';
  if (/^-?\d+\.?\d*$/.test(v)) return 'number';
  if (v.startsWith('img_')) return 'image';
  if (v.startsWith('pos_')) return 'position';
  if (v.startsWith('ratio:')) return 'ratio';
  if (/^\d+_/.test(v)) return 'count-shape';
  if (v.includes('_') && !/\s/.test(v) && v.length < 40) return 'shape';
  return 'text';
}

/**
 * Build a summary of token types across all items
 */
function buildTokenSummary(items) {
  const counts = {};
  items.forEach(item => {
    const fields = [
      item.stimulusRow1, item.stimulusRow2,
      item.optionA, item.optionB, item.optionC
    ].filter(Boolean);
    fields.forEach(f => {
      const toks = parseStimulusTokens(String(f));
      toks.forEach(t => {
        const cls = classifyToken(t);
        counts[cls] = (counts[cls] || 0) + 1;
      });
      // Options are single values
      const cls = classifyToken(String(f).trim());
      counts[cls] = (counts[cls] || 0) + 1;
    });
  });
  return counts;
}

const TYPE_LABEL = {
  'shape': { label: 'Shape', color: '#6366F1', icon: '⬟' },
  'count-shape': { label: 'Count Shape', color: '#0891B2', icon: '3⬟' },
  'ratio': { label: 'Ratio', color: '#D97706', icon: 'A:B' },
  'position': { label: 'Position', color: '#059669', icon: '↖' },
  'image': { label: 'Image', color: '#E11D48', icon: '🖼' },
  'number': { label: 'Number', color: '#78716C', icon: '#' },
  'text': { label: 'Text', color: '#78716C', icon: 'T' },
};

/**
 * TokenValidationResults - Display validation results
 */
export default function TokenValidationResults({ items }) {
  if (!items || items.length === 0) return null;

  const missingTokens = validateItems(items);
  const summary = buildTokenSummary(items);
  const [autoStatus, setAutoStatus] = React.useState('');
  const [autoResult, setAutoResult] = React.useState(null);

  const handleAutoGenerate = async () => {
    const tokenNames = missingTokens.map(t => t.token);
    setAutoStatus('generating');
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
      const res = await fetch(`${apiBase}/tokens/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ tokens: tokenNames })
      });
      const data = await res.json();
      setAutoResult(data);
      setAutoStatus('done');
    } catch (e) {
      setAutoStatus('error');
      setAutoResult({ error: e.message });
    }
  };

  // Count items by domain
  const domains = {};
  items.forEach(item => {
    const d = (item.domain || 'unknown').toLowerCase();
    domains[d] = (domains[d] || 0) + 1;
  });

  if (missingTokens.length === 0) {
    return (
      <div className="mt-6 space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-sm font-bold text-emerald-700">All Tokens Valid — Shapes Will Render</div>
              <div className="text-xs text-emerald-600">
                {items.length} items checked across {Object.keys(domains).join(', ').toUpperCase()} domains
              </div>
            </div>
          </div>
        </div>
        {/* Token type breakdown */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Token Breakdown</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary).filter(([k]) => TYPE_LABEL[k]).map(([cls, n]) => (
              <div key={cls} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: TYPE_LABEL[cls]?.color + '18', color: TYPE_LABEL[cls]?.color, border: `1px solid ${TYPE_LABEL[cls]?.color}40` }}>
                <span>{TYPE_LABEL[cls]?.icon}</span>
                <span>{TYPE_LABEL[cls]?.label}</span>
                <span className="font-bold">×{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-xl overflow-hidden">
      <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-sm">⚠️ Render Issues Found — Fix Before Assigning</div>
          <div className="text-red-100 text-xs">
            {missingTokens.length} token{missingTokens.length !== 1 ? 's' : ''} will not display as shapes
          </div>
        </div>
        <button
          onClick={() => {
            const csv = [
              ['Token', 'Type', 'Reason', 'Count', 'Items'],
              ...missingTokens.map(t => [
                t.token,
                t.type,
                t.reason,
                t.count,
                t.items.join('; ')
              ])
            ].map(row => row.join(',')).join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `missing-tokens-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
        >
          📥 Export CSV
        </button>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-red-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-bold text-red-800">Token</th>
              <th className="px-3 py-2 text-left font-bold text-red-800">Type</th>
              <th className="px-3 py-2 text-center font-bold text-red-800">Count</th>
              <th className="px-3 py-2 text-left font-bold text-red-800">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-200">
            {missingTokens.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}>
                <td className="px-3 py-2 font-mono font-bold text-red-700">
                  {item.token}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">
                    {item.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-bold text-blue-600">
                  {item.count}
                </td>
                <td className="px-3 py-2 text-gray-600 font-mono text-[10px]">
                  {item.items.slice(0, 3).join(', ')}
                  {item.items.length > 3 && ` +${item.items.length - 3} more`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-red-100 px-4 py-3 border-t border-red-200 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-red-700">
            <strong>How to fix:</strong> Click <strong>Auto-Generate</strong> to create SVG shapes for all missing tokens automatically. Shapes that can't be auto-generated will need a manual PNG sprite upload.
          </div>
          <button
            onClick={handleAutoGenerate}
            disabled={autoStatus === 'generating'}
            className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
          >
            {autoStatus === 'generating' ? '⏳ Generating…' : '⚡ Auto-Generate Shapes'}
          </button>
        </div>

        {autoStatus === 'done' && autoResult && (
          <div className={`rounded-lg px-3 py-2 text-xs border ${autoResult.error ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-800'}`}>
            {autoResult.error ? (
              <span>Error: {autoResult.error}</span>
            ) : (
              <>
                <span className="font-bold">✓ {autoResult.generated} shape{autoResult.generated !== 1 ? 's' : ''} generated.</span>
                {autoResult.skipped > 0 && (
                  <span className="ml-2 text-amber-700">
                    {autoResult.skipped} could not be auto-generated — add manually as PNG sprite:
                    {' '}{autoResult.details?.skipped?.map(s => s.token).join(', ')}
                  </span>
                )}
                {autoResult.generated > 0 && (
                  <span className="ml-2 text-green-600">Re-upload the Excel to verify.</span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
