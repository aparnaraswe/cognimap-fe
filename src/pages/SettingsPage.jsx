import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const CATEGORY_META = {
  scoring: { icon: '🎯', label: 'Scoring & Passing Criteria', desc: 'Set minimum thresholds and passing rules' },
  visibility: { icon: '👁️', label: 'Student Visibility', desc: 'Control what students can see in their dashboard and reports' },
  battery: { icon: '🧪', label: 'Battery Requirements', desc: 'Define required domains and minimum items per test' },
  session: { icon: '⏱️', label: 'Test Session Controls', desc: 'Configure timer, resume, and progress display' },
  report: { icon: '📊', label: 'Report Configuration', desc: 'Report template and generation settings' },
  branding: { icon: '🏷️', label: 'Organisation Branding', desc: 'Logo, name, and visual identity for reports' },
};

function SettingRow({ setting, onUpdate }) {
  const val = setting.setting_value?.value;
  const key = setting.setting_key;
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(val);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onUpdate(key, localVal);
      setEditing(false);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  // Determine input type
  const isBool = typeof val === 'boolean';
  const isArray = Array.isArray(val);
  const isNum = typeof val === 'number';

  return (
    <div className="flex items-center justify-between py-4 border-b border-ivory-200/50 last:border-0 group">
      <div className="flex-1 mr-6">
        <div className="text-sm font-bold text-ink">{setting.label}</div>
        <div className="text-[11px] text-ink-faint mt-0.5">{setting.description}</div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {isBool && !editing ? (
          <button onClick={() => onUpdate(key, !val)}
            className={`relative w-12 h-6 rounded-full transition-all ${val ? 'bg-emerald-500' : 'bg-ivory-200'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${val ? 'left-[26px]' : 'left-0.5'}`}/>
          </button>
        ) : isArray && !editing ? (
          <div className="flex gap-1 flex-wrap max-w-xs">
            {val.map(v => (
              <span key={v} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg">{v}</span>
            ))}
            <button onClick={() => { setLocalVal(val.join(', ')); setEditing(true); }}
              className="text-[10px] text-gold font-bold ml-1">Edit</button>
          </div>
        ) : editing ? (
          <div className="flex gap-2 items-center">
            <input value={localVal} onChange={e => setLocalVal(isNum ? Number(e.target.value) : e.target.value)}
              type={isNum ? 'number' : 'text'}
              className="px-3 py-1.5 bg-ivory-50 border-2 border-gold rounded-xl text-sm font-semibold w-48 focus:outline-none"/>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 bg-copper text-white text-xs font-bold rounded-xl">
              {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-ink-faint">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-ivory-50 border-2 border-ivory-200 rounded-xl text-sm font-semibold min-w-[60px] text-center">
              {String(val)}
            </span>
            <button onClick={() => { setLocalVal(val); setEditing(true); }}
              className="text-[10px] text-gold font-bold opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings')
      .then(d => setSettings(d.settings || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key, value) => {
    await api.put(`/settings/${key}`, { value });
    // Refresh
    const d = await api.get('/settings');
    setSettings(d.settings || {});
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="font-bold text-ink">Access Restricted</div>
        <div className="text-sm text-ink-faint mt-1">Only super admins can access platform settings.</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-black text-ink">Platform Settings</h1>
        <p className="text-xs text-ink-dim mt-0.5">Configure scoring rules, visibility controls, and branding</p>
      </div>

      {loading ? (
        <div className="bg-white border-2 border-ivory-200 rounded-2xl p-8 text-center text-sm text-ink-faint">Loading...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(CATEGORY_META).map(([cat, meta]) => {
            const catSettings = settings[cat] || [];
            if (catSettings.length === 0) return null;
            return (
              <div key={cat} className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 bg-ivory-100 border-b-2 border-ivory-200 flex items-center gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-black text-ink">{meta.label}</div>
                    <div className="text-[10px] text-ink-faint">{meta.desc}</div>
                  </div>
                </div>
                <div className="px-6">
                  {catSettings.map(s => (
                    <SettingRow key={s.setting_key} setting={s} onUpdate={updateSetting}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
