import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './utils/authStore';
import SidebarLayout from './components/SidebarLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ManuscriptEditPage from './pages/ManuscriptEditPage';
import ManuscriptRevisionPage from './pages/ManuscriptRevisionPage';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import NewProjectPage from './pages/NewProjectPage';
import PaperDetailPage from './pages/PaperDetailPage';
import AdminPage from './pages/AdminPage';
import AdminUsersPage from './pages/AdminUsersPage';
import JournalsPage from './pages/JournalsPage';
import ManuscriptCreatePage from './pages/ManuscriptCreatePage';
import { SubmitManuscriptPage } from './pages/SubmitManuscriptPage';
import { EditorDashboardPage } from './pages/EditorDashboardPage';
import { PeerReviewPage } from './pages/PeerReviewPage';
import PublishedPapersPage from './pages/PublishedPapersPage';
import PublishedPapersWrapper from './components/PublishedPapersWrapper';
import PaperViewPage from './pages/PaperViewPage';

export default function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes - No Auth Required */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Published Papers - Landing Page (shows sidebar if logged in) */}
        <Route path="/" element={<PublishedPapersWrapper />} />
        <Route path="/papers" element={<PublishedPapersWrapper />} />
        <Route path="/papers/:id" element={<PaperViewPage />} />

        {/* Protected Routes with Sidebar */}
        <Route element={<SidebarLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/papers/manage/:id"
            element={
              <ProtectedRoute>
                <PaperDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/projects/new"
            element={
              <ProtectedRoute>
                <NewProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journals"
            element={
              <ProtectedRoute allowedRoles={['admin', 'editor', 'researcher']}>
                <JournalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manuscripts/create"
            element={
              <ProtectedRoute allowedRoles={['admin', 'editor', 'researcher']}>
                <ManuscriptCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manuscripts/:manuscriptId/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'editor', 'researcher']}>
                <ManuscriptEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manuscripts/:manuscriptId/revision"
            element={
              <ProtectedRoute allowedRoles={['admin', 'editor', 'researcher']}>
                <ManuscriptRevisionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journals/:journalId/submit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'editor', 'researcher']}>
                <SubmitManuscriptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'editor']}>
                <EditorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peer-review/:manuscriptId"
            element={
              <ProtectedRoute>
                <PeerReviewPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback to published papers */}
        <Route path="*" element={<Navigate to="/papers" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
