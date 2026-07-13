import { Navigate, Route, Routes } from 'react-router-dom';
import { DatabaseStatus } from '../components/DatabaseStatus';
import { LoadingScreen } from '../components/LoadingScreen';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AdminShell } from '../layouts/AdminShell';
import { AdminPage } from '../pages/AdminPage';
import { BackupPage } from '../pages/BackupPage';
import { BillingToolsPage } from '../pages/BillingToolsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { KitchenPage } from '../pages/KitchenPage';
import { LoginPage } from '../pages/LoginPage';
import { ReportsPage } from '../pages/ReportsPage';
import { RoleSelectPage } from '../pages/RoleSelectPage';
import { SplashPage } from '../pages/SplashPage';
import { UsersPage } from '../pages/UsersPage';
import { WaiterPage } from '../pages/WaiterPage';
import type { Role } from '../types';

function GuardedRoute({ role, children }: { role: Role; children: React.ReactElement }) {
  const { state, dispatch } = useApp();
  if (state.activeRole !== role) {
    dispatch({ type: 'SET_ROLE', payload: role });
  }
  return children;
}

function ProtectedRoute({ children, roles }: { children: React.ReactElement; roles?: Array<'admin' | 'waiter' | 'cashier'> }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  const { loading } = useApp();
  const auth = useAuth();

  if (loading || auth.loading) return <LoadingScreen />;

  return (
    <>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['admin', 'cashier']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/billing-tools" element={<ProtectedRoute roles={['admin', 'cashier']}><BillingToolsPage /></ProtectedRoute>} />
          <Route path="/backup" element={<ProtectedRoute roles={['admin']}><BackupPage /></ProtectedRoute>} />
        </Route>
        <Route path="/role" element={<ProtectedRoute><RoleSelectPage /></ProtectedRoute>} />
        <Route
          path="/waiter"
          element={
            <ProtectedRoute roles={['admin', 'waiter']}>
              <GuardedRoute role="Waiter">
                <WaiterPage />
              </GuardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute roles={['admin']}>
              <GuardedRoute role="Kitchen">
                <KitchenPage />
              </GuardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin', 'cashier']}>
              <GuardedRoute role="Admin">
                <AdminPage />
              </GuardedRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DatabaseStatus />
    </>
  );
}
