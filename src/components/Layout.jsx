import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSource } from '../context/SourceContext';
import {
  LayoutDashboard, Database, Layers, Users, Play, FileText,
  Shield, Settings, Activity, LogOut, Brain, ChevronRight, ChevronLeft, Upload, Shapes, Image, BookOpen, SlidersHorizontal, Rocket, Building2, ChevronDown, Check, Globe,
  Menu as MenuIcon, X, PanelLeftClose, PanelLeft
} from 'lucide-react';

const SOURCE_TYPE_EMOJI = { school: '🏫', tuition: '📚', company: '🏢', clinic: '🏥', other: '🔷' };

// ─── Source Switcher (super_admin only) ──────────────────────────────────────
// Dropdown in the sidebar that lets super admin switch between sources or
// view "All Sources". Selection is persisted via SourceContext (localStorage),
// and a `cognimap:source-changed` CustomEvent is dispatched so individual pages
// can re-fetch data if they listen for it.
function SourceSwitcher() {
  const { sources, activeSource, activeSourceId, setActiveSourceId } = useSource();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (id) => {
    setActiveSourceId(id);
    setOpen(false);
    // Broadcast so any page can re-fetch
    window.dispatchEvent(new CustomEvent('cognimap:source-changed', { detail: { sourceId: id } }));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] flex-shrink-0"
          style={{ background: 'var(--blush-pale)', color: 'var(--blush)' }}>
          {activeSource ? (SOURCE_TYPE_EMOJI[activeSource.type] || '·') : <Globe size={11} />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[8.5px] font-semibold uppercase leading-none" style={{ color: 'var(--slate-light)', letterSpacing: '1.5px' }}>Source</div>
          <div className="text-[12px] font-medium truncate leading-tight mt-0.5" style={{ color: 'var(--ink)' }}>
            {activeSource ? activeSource.display_name : 'All sources'}
          </div>
        </div>
        <ChevronDown size={11} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--slate-light)' }} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 overflow-hidden rounded-md"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
          {/* All sources option */}
          <button
            onClick={() => pick('')}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
            style={{ borderBottom: '1px solid var(--border)', background: !activeSourceId ? 'var(--paper)' : 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
            onMouseLeave={e => e.currentTarget.style.background = !activeSourceId ? 'var(--paper)' : 'transparent'}>
            <Globe size={12} style={{ color: 'var(--slate-light)' }} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>All sources</div>
              <div className="text-[10px]" style={{ color: 'var(--slate-light)' }}>No filter applied</div>
            </div>
            {!activeSourceId && <Check size={11} className="flex-shrink-0" style={{ color: 'var(--blush)' }} />}
          </button>

          {/* Source list */}
          <div className="max-h-64 overflow-auto">
            {sources.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px]" style={{ color: 'var(--slate-light)' }}>
                No sources yet
              </div>
            ) : (
              sources.map(src => (
                <button
                  key={src.id}
                  onClick={() => pick(src.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{ background: activeSourceId === src.id ? 'var(--paper)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                  onMouseLeave={e => e.currentTarget.style.background = activeSourceId === src.id ? 'var(--paper)' : 'transparent'}>
                  <span className="text-xs flex-shrink-0">{SOURCE_TYPE_EMOJI[src.type] || '·'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>{src.display_name}</div>
                    <code className="text-[9px] font-mono" style={{ color: 'var(--slate-light)' }}>#{src.source_code}</code>
                  </div>
                  {activeSourceId === src.id && <Check size={11} className="flex-shrink-0" style={{ color: 'var(--blush)' }} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLayout() {
  const { user, logout } = useAuth();
  const { activeSource } = useSource();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const isSuperAdmin = user?.role === 'super_admin';

  const allLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/onboarding', icon: Rocket, label: 'Onboarding', roles: ['super_admin', 'client_admin'] },
    { to: '/admin/setup', icon: Upload, label: 'Setup & Assign', roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/items', icon: Database, label: 'Item Bank', roles: ['super_admin', 'psychologist'] },
    // { to: '/admin/batteries', icon: Layers, label: 'Batteries', roles: ['super_admin', 'psychologist'] },
    // { to: '/admin/sessions', icon: Play, label: 'Sessions', roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/reports', icon: FileText, label: 'Reports', roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/users', icon: Users, label: 'Users', roles: ['super_admin', 'client_admin'] },
    { to: '/admin/sources', icon: Building2, label: 'Sources', roles: ['super_admin'] },
    // { to: '/admin/batches', icon: Layers, label: 'Batches', roles: ['super_admin', 'client_admin', 'psychologist'] },
    // { to: '/admin/guardian-assign', icon: Shield, label: 'Guardian Assign', roles: ['super_admin', 'client_admin'] },
    // { to: '/admin/tokens', icon: Shapes, label: 'Token Manager', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/shapes', icon: Image, label: 'Shape Library', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/missing-images', icon: Upload, label: 'Missing Images', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/domain-instructions', icon: BookOpen, label: 'Domain Instructions', roles: ['super_admin', 'psychologist'] },
    // { to: '/admin/audit', icon: Activity, label: 'Audit Log', roles: ['super_admin'] },
    { to: '/admin/settings', icon: Settings, label: 'Settings', roles: ['super_admin'] },
    // { to: '/admin/access-control', icon: Shield, label: 'Access Control', roles: ['super_admin'] },
    // { to: '/admin/report-config', icon: SlidersHorizontal, label: 'Report Config', roles: ['super_admin'] },
  ];

  const links = allLinks.filter(l => l.roles.includes(user?.role));

  // Sidebar state — collapse + mobile drawer
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cm_sidebar_collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('cm_sidebar_collapsed', next ? '1' : '0');
  };

  // Group nav links into sections
  const sections = [
    {
      label: 'Overview',
      items: links.filter(l => ['/admin', '/admin/setup'].includes(l.to)),
    },
    {
      label: 'Manage',
      items: links.filter(l => ['/admin/items', '/admin/users', '/admin/sources', '/admin/onboarding', '/admin/shapes', '/admin/missing-images', '/admin/domain-instructions'].includes(l.to)),
    },
    {
      label: 'Analytics',
      items: links.filter(l => ['/admin/reports'].includes(l.to)),
    },
    {
      label: 'System',
      items: links.filter(l => ['/admin/settings'].includes(l.to)),
    },
  ].filter(s => s.items.length > 0);

  const sidebarWidth = collapsed ? 68 : 220;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>

      {/* Mobile top bar (only on small screens) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 z-40 flex items-center justify-between px-4"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ color: 'var(--slate)' }}>
            <MenuIcon size={16} />
          </button>
          <div className="font-display text-[15px]" style={{ color: 'var(--ink)' }}>
            Cogni<span style={{ color: 'var(--blush)' }}>Map</span>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" style={{ background: 'rgba(26,35,50,0.35)' }} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        flex flex-col flex-shrink-0 no-print
        fixed lg:sticky top-0 h-screen z-50 transition-all duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{
        width: sidebarWidth,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
      }}>

        {/* Logo / Brand */}
        <div className="flex items-center justify-between" style={{
          padding: collapsed ? '20px 14px 18px' : '22px 22px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="font-display text-[18px] leading-none" style={{ color: 'var(--ink)' }}>
                Cogni<span style={{ color: 'var(--blush)' }}>Map</span>
              </div>
              <div className="text-[9.5px] mt-1" style={{ color: 'var(--slate-light)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Assessment Platform
              </div>
            </div>
          ) : (
            <div className="font-display text-[16px] mx-auto" style={{ color: 'var(--ink)' }}>
              C<span style={{ color: 'var(--blush)' }}>M</span>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)}
            className="lg:hidden w-7 h-7 rounded flex items-center justify-center" style={{ color: 'var(--slate)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Active source pill / switcher */}
        {!collapsed && (
          <div className="px-4 pt-3 pb-1">
            {isSuperAdmin ? (
              <SourceSwitcher />
            ) : activeSource ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] flex-shrink-0"
                  style={{ background: 'var(--blush-pale)', color: 'var(--blush)' }}>
                  {SOURCE_TYPE_EMOJI[activeSource.type] || '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[8.5px] font-semibold uppercase leading-none" style={{ color: 'var(--slate-light)', letterSpacing: '1.5px' }}>Source</div>
                  <div className="text-[12px] font-medium truncate leading-tight mt-0.5" style={{ color: 'var(--ink)' }}>{activeSource.display_name}</div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Navigation — sectioned, student-side style with left border on active */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? 'mt-4' : ''}>
              {section.label && !collapsed && (
                <div className="text-[9.5px] mb-1"
                  style={{ color: 'var(--slate-light)', letterSpacing: '2px', textTransform: 'uppercase', padding: '0 22px' }}>
                  {section.label}
                </div>
              )}
              <div className="flex flex-col">
                {section.items.map(l => {
                  const Icon = l.icon;
                  return (
                    <NavLink key={l.to} to={l.to} end={l.end}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? l.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 text-[13px] transition-all duration-150 ${
                          collapsed ? 'justify-center mx-2 my-0.5 rounded-md py-2.5' : ''
                        } ${isActive ? 'font-medium' : 'font-normal'}`
                      }
                      style={({ isActive }) => collapsed ? {
                        background: isActive ? 'var(--blush-pale)' : 'transparent',
                        color: isActive ? 'var(--blush)' : 'var(--slate)',
                      } : {
                        padding: '9px 22px',
                        borderLeft: isActive ? '2px solid var(--blush)' : '2px solid transparent',
                        background: isActive ? 'var(--blush-pale)' : 'transparent',
                        color: isActive ? 'var(--blush)' : 'var(--slate)',
                      }}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={14} strokeWidth={1.75} style={{
                            opacity: isActive ? 1 : 0.55,
                            flexShrink: 0,
                          }} />
                          {!collapsed && <span>{l.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle button */}
        <div className="hidden lg:flex justify-center px-3 pb-1">
          <button onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md transition-colors text-[11px] font-medium"
            style={{ color: 'var(--slate-light)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,35,50,0.04)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-light)'; }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeft size={13} /> : <><PanelLeftClose size={13} /> Collapse</>}
          </button>
        </div>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '12px 8px' : '14px 18px' }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--sage), var(--blush))', color: 'white' }}>
                  {(user?.first_name?.[0] || '?').toUpperCase()}{(user?.last_name?.[0] || '').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium truncate leading-tight" style={{ color: 'var(--ink)' }}>
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-[10.5px] capitalize truncate mt-0.5" style={{ color: 'var(--slate-light)' }}>
                    {user?.role?.replace(/_/g,' ')}
                  </div>
                </div>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => { localStorage.removeItem('cognimap_active_source'); navigate('/admin/select-source'); }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] w-full transition-colors"
                  style={{ color: 'var(--slate)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,35,50,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Building2 size={12} />
                  Switch source
                </button>
              )}
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] w-full transition-colors"
                style={{ color: 'var(--slate)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,35,50,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LogOut size={12} />
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{ background: 'linear-gradient(135deg, var(--sage), var(--blush))', color: 'white' }}>
                {(user?.first_name?.[0] || '?').toUpperCase()}{(user?.last_name?.[0] || '').toUpperCase()}
              </div>
              <button onClick={handleLogout}
                className="w-9 h-9 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--slate)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,35,50,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-12 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

function StudentLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Outlet />
    </div>
  );
}

export { AdminLayout, StudentLayout };
