import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './guards/RequireAuth';
import { RequireOwner } from './guards/RequireOwner';
import WelcomePage from './pages/WelcomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import InviteNewPage from './pages/InviteNewPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import SettingsPage from './pages/SettingsPage';
import SettingsProfilePage from './pages/SettingsProfilePage';
import SettingsAdminPage from './pages/SettingsAdminPage';
import GroupSettingsPage from './pages/GroupSettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/welcome/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/invite/new"
        element={
          <RequireAuth>
            <RequireOwner>
              <InviteNewPage />
            </RequireOwner>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      >
        <Route path="profile" element={<SettingsProfilePage />} />
        <Route
          path="admin"
          element={
            <RequireOwner>
              <SettingsAdminPage />
            </RequireOwner>
          }
        />
      </Route>
      <Route
        path="/settings/group/:id"
        element={
          <RequireAuth>
            <GroupSettingsPage />
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
