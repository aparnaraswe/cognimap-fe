import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout, StudentLayout } from './components/Layout';
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
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import AccessControlPage from './pages/AccessControlPage';
import StudentDashboard from './pages/StudentDashboard';
import TestRunner from './pages/TestRunner';

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

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (['super_admin','psychologist','client_admin'].includes(user.role)) return <Navigate to="/admin" replace />;
  return <Navigate to="/student" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin','psychologist','client_admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="items" element={<ItemBankPage />} />
        <Route path="items/upload" element={<ItemUploadPage />} />
        <Route path="batteries" element={<BatteriesPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/assign" element={<SessionAssignPage />} />
        <Route path="setup" element={<SetupAssignPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportViewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="access-control" element={<AccessControlPage />} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
