import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SourceProvider, useSource } from './context/SourceContext';
import { BatchProvider } from './context/BatchContext';
import { AdminLayout, StudentLayout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ItemBankPage from './pages/ItemBankPage';
import ItemUploadPage from './pages/ItemUploadPage';
import BatteriesPage from './pages/BatteriesPage';
import SessionsPage from './pages/SessionsPage';
import SessionAssignPage from './pages/SessionAssignPage';
import SetupAssignPage from './pages/SetupAssignPage';
import ReportsPage from './pages/ReportsPage';
import ReportViewPage from './pages/ReportViewPage';
import UsersPage from './pages/UsersPage';
import SourcesPage from './pages/SourcesPage';
import BatchesPage from './pages/BatchesPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import AccessControlPage from './pages/AccessControlPage';
import TokenManagerPage from './pages/TokenManagerPage';
import ShapeLibraryPage from './pages/ShapeLibraryPage';
import DomainInstructionsPage from './pages/DomainInstructionsPage';
import ReportConfigPage from './pages/ReportConfigPage';
import StudentDashboard from './pages/StudentDashboard';
import GuardianDashboard from './pages/GuardianDashboard';
import GuardianAssignPage from './pages/GuardianAssignPage';
import OnboardingPage from './pages/OnboardingPage';
import SelectSourcePage from './pages/SelectSourcePage';
import TestRunner from './pages/TestRunner';
import TestComplete from './pages/TestComplete';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 animate-pulse-soft"
          style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink-dim)' }}>Loading...</div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

/**
 * SourceGate — forces super admins to pick a source before entering the admin area.
 * Non-super-admins are auto-scoped to their own source.
 */
function SourceGate({ children }) {
  const { user } = useAuth();
  const { sources, loading: sourcesLoading } = useSource();
  const activeSource = typeof window !== 'undefined' ? localStorage.getItem('cognimap_active_source') : null;

  // Wait for sources to load before deciding
  if (user?.role === 'super_admin' && sourcesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="text-sm text-slate-500">Loading sources...</div>
      </div>
    );
  }

  // Super admin: must have an active source AND it must exist in the loaded list
  if (user?.role === 'super_admin') {
    const isValid = activeSource && sources.some(s => s.id === activeSource);
    if (!isValid) {
      // Clear stale value before redirecting
      if (activeSource) localStorage.removeItem('cognimap_active_source');
      return <Navigate to="/admin/select-source" replace />;
    }
  }

  // Non-super-admin: auto-store their own source so headers go out with requests
  if (user && user.role !== 'super_admin') {
    const myId = user.source_id || user.organization_id;
    if (myId && myId !== activeSource) {
      localStorage.setItem('cognimap_active_source', myId);
    }
  }

  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (['super_admin','psychologist','client_admin'].includes(user.role)) return <Navigate to="/admin" replace />;
  if (['guardian','teacher'].includes(user.role)) return <Navigate to="/guardian" replace />;
  return <Navigate to="/student" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<RoleRedirect />} />

      {/* Source picker for super admin (no AdminLayout — full screen) */}
      <Route path="/admin/select-source" element={
        <ProtectedRoute allowedRoles={['super_admin','psychologist','client_admin']}>
          <SelectSourcePage />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin','psychologist','client_admin']}>
          <SourceGate>
            <AdminLayout />
          </SourceGate>
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="items" element={<ItemBankPage />} />
        <Route path="items/upload" element={<ItemUploadPage />} />
        <Route path="batteries" element={<BatteriesPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/assign" element={<SessionAssignPage />} />
        <Route path="setup" element={<SetupAssignPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportViewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="tokens" element={<TokenManagerPage />} />
        <Route path="shapes" element={<ShapeLibraryPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="access-control" element={<AccessControlPage />} />
        <Route path="domain-instructions" element={<DomainInstructionsPage />} />
        <Route path="report-config" element={<ReportConfigPage />} />
        <Route path="guardian-assign" element={<GuardianAssignPage />} />
      </Route>

      {/* Guardian/Teacher routes */}
      <Route path="/guardian" element={
        <ProtectedRoute allowedRoles={['guardian','teacher']}>
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<GuardianDashboard />} />
        <Route path="reports/:id" element={<ReportViewPage />} />
      </Route>

      {/* Student routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['student','employee']}>
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<StudentDashboard />} />
        <Route path="reports/:id" element={<ReportViewPage />} />
      </Route>

      {/* Test runner (full screen) */}
      <Route path="/test/:sessionId" element={
        <ProtectedRoute>
          <TestRunner />
        </ProtectedRoute>
      } />

      {/* Test complete page */}
      <Route path="/test/:sessionId/complete" element={
        <ProtectedRoute>
          <TestComplete />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
      {/* Landing page handles auto-redirect for logged-in users */}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SourceProvider>
          <BatchProvider>
            <AppRoutes />
          </BatchProvider>
        </SourceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
