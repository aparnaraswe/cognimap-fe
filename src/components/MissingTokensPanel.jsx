import React, { useState, useEffect } from 'react';
import { getMissingTokens, clearMissingTokens } from './TokenRenderer';

/**
 * MissingTokensPanel - Displays a table of tokens that couldn't be rendered
 * Shows which tokens are missing from your Excel upload
 */
export default function MissingTokensPanel() {
  const [missingTokens, setMissingTokens] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update the list every 2 seconds
    const interval = setInterval(() => {
      const tokens = getMissingTokens();
      setMissingTokens(tokens);
      if (tokens.length > 0 && !isVisible) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleClear = () => {
    clearMissingTokens();
    setMissingTokens([]);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || missingTokens.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 500,
      maxHeight: 400,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      border: '2px solid #ff006e',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(255, 0, 110, 0.3)',
      zIndex: 9999,
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(90deg, #ff006e 0%, #8b00ff 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, color: 'white', fontSize: 16, fontWeight: 700 }}>
            ⚠️ Missing Tokens
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            {missingTokens.length} token{missingTokens.length !== 1 ? 's' : ''} not found
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleClear}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            Clear
          </button>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        maxHeight: 320,
        overflowY: 'auto',
        background: '#0a0a0f'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            background: '#16213e',
            zIndex: 1
          }}>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#00d9ff', fontWeight: 600, borderBottom: '1px solid #ff006e' }}>
                Token
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#00d9ff', fontWeight: 600, borderBottom: '1px solid #ff006e' }}>
                Type
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: '#00d9ff', fontWeight: 600, borderBottom: '1px solid #ff006e' }}>
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {missingTokens.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <td style={{
                  padding: '10px 12px',
                  color: '#ff006e',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {item.token}
                </td>
                <td style={{
                  padding: '10px 12px',
                  color: '#8b00ff',
                  fontSize: 11,
                  fontWeight: 500
                }}>
                  {item.type.replace(/_/g, ' ')}
                </td>
                <td style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  color: '#00d9ff',
                  fontWeight: 700
                }}>
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.05)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center'
      }}>
        💡 These tokens need to be added to TokenRenderer.jsx or your Excel file
      </div>
    </div>
  );
}
