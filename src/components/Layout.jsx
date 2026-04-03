import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Database, Layers, Users, Play, FileText,
  Shield, Settings, Activity, LogOut, Brain, ChevronRight, Upload, Shapes, Image, BookOpen
} from 'lucide-react';

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  const allLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/setup', icon: Upload, label: 'Setup & Assign', roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/items', icon: Database, label: 'Item Bank', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/batteries', icon: Layers, label: 'Batteries', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/sessions', icon: Play, label: 'Sessions', roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/reports', icon: FileText, label: 'Reports', roles: ['super_admin', 'psychologist', 'client_admin'] },
    { to: '/admin/users', icon: Users, label: 'Users', roles: ['super_admin', 'client_admin'] },
    { to: '/admin/guardian-assign', icon: Shield, label: 'Guardian Assign', roles: ['super_admin', 'client_admin'] },
    { to: '/admin/tokens', icon: Shapes, label: 'Token Manager', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/shapes', icon: Image, label: 'Shape Library', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/domain-instructions', icon: BookOpen, label: 'Domain Instructions', roles: ['super_admin', 'psychologist'] },
    { to: '/admin/audit', icon: Activity, label: 'Audit Log', roles: ['super_admin'] },
    { to: '/admin/settings', icon: Settings, label: 'Settings', roles: ['super_admin'] },
    { to: '/admin/access-control', icon: Shield, label: 'Access Control', roles: ['super_admin'] },
  ];

  const links = allLinks.filter(l => l.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r flex flex-col flex-shrink-0 no-print"
        style={{ borderColor: 'var(--border)', background: 'white' }}>
        
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', boxShadow: '0 2px 8px rgba(180,83,9,0.2)' }}>
              🧠
            </div>
            <div>
              <div className="text-display font-bold text-[15px] tracking-tight" style={{ color: 'var(--ink)' }}>CogniMap</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--ink-faint)' }}>Assessment Platform</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {links.map(l => {
            const Icon = l.icon;
            return (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 group ${
                    isActive 
                      ? 'text-white' 
                      : 'hover:bg-ivory-100'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, #B45309, #D97706)',
                  boxShadow: '0 2px 8px rgba(180,83,9,0.2)',
                  color: 'white'
                } : { color: 'var(--ink-soft)' }}
              >
                <Icon size={17} strokeWidth={2} />
                {l.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="px-3.5 py-2 mb-1.5">
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-[11px] font-medium capitalize" style={{ color: 'var(--ink-faint)' }}>
              {user?.role?.replace(/_/g,' ')}
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold w-full transition-all duration-150 hover:bg-red-50"
            style={{ color: '#DC2626' }}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-subtle)' }}>
        <Outlet />
      </main>
    </div>
  );
}

function StudentLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d2b' }}>
      <Outlet />
    </div>
  );
}

export { AdminLayout, StudentLayout };
