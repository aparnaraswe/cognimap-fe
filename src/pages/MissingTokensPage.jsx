import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMissingTokens, clearMissingTokens } from '../components/TokenRenderer';

export default function MissingTokensPage() {
  const [missingTokens, setMissingTokens] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const updateTokens = () => {
      const tokens = getMissingTokens();
      setMissingTokens(tokens);
    };

    updateTokens();

    if (autoRefresh) {
      const interval = setInterval(updateTokens, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClear = () => {
    if (confirm('Clear all missing token records?')) {
      clearMissingTokens();
      setMissingTokens([]);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Token', 'Type', 'Count', 'First Seen', 'Last Seen'],
      ...missingTokens.map(t => [
        t.token,
        t.type,
        t.count,
        new Date(t.firstSeen).toLocaleString(),
        new Date(t.lastSeen).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-tokens-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <button
        onClick={() => navigate('/admin/items')}
        className="text-xs font-bold text-gold hover:text-gold-dark mb-4 inline-block"
      >
        ← Back to Item Bank
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-ink-DEFAULT mb-1">Missing Tokens</h1>
          <p className="text-sm text-ink-dim">
            Tokens that couldn't be rendered. These need to be added to TokenRenderer.jsx
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              autoRefresh
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸ Auto-refresh OFF'}
          </button>
          {missingTokens.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                📥 Export CSV
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
              >
                🗑 Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {missingTokens.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-bold text-emerald-700 mb-1">No Missing Tokens</div>
          <div className="text-sm text-emerald-600">
            All tokens are rendering correctly!
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    First Seen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {missingTokens.map((item, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-bold text-red-600">
                      {item.token}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-blue-600">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(item.firstSeen).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(item.lastSeen).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <strong>Total:</strong> {missingTokens.length} unique token
              {missingTokens.length !== 1 ? 's' : ''} •{' '}
              <strong>Total occurrences:</strong>{' '}
              {missingTokens.reduce((sum, t) => sum + t.count, 0)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-sm font-bold text-blue-700 mb-2">💡 How to fix missing tokens:</div>
        <ol className="text-sm text-blue-600 space-y-1 ml-4 list-decimal">
          <li>
            <strong>For shapes:</strong> Add the shape name to the SHAPES array in TokenRenderer.jsx
          </li>
          <li>
            <strong>For colors:</strong> Add the color to the C palette object
          </li>
          <li>
            <strong>For figure parts:</strong> Add the renderer function to the shapes object in FigurePart
          </li>
          <li>
            <strong>For images:</strong> Check if the image file exists in /public/ folder
          </li>
        </ol>
      </div>
    </div>
  );
}
