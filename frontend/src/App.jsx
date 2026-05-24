import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPPage from './pages/OTPPage'
import Dashboard from './pages/Dashboard'
import ElectionsPage from './pages/ElectionsPage'
import ElectionDetail from './pages/ElectionDetail'
import VotingPage from './pages/VotingPage'
import ResultsPage from './pages/ResultsPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import ManageElections from './pages/ManageElections'
import ManageCandidates from './pages/ManageCandidates'
import AuditLogs from './pages/AuditLogs'
import ObserverPortal from './pages/ObserverPortal'
import ProfilePage from './pages/ProfilePage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen'
import VerifyReceipt from './pages/VerifyReceipt'
import MyReceipts from './pages/MyReceipts'
import FirstLoginReset from './pages/FirstLoginReset'
import SystemSettings from './pages/SystemSettings'

function App() {
  const { isAuthenticated, isLoading, initializeAuth, user } = useAuthStore()
  const [appInitialized, setAppInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (initializeAuth) {
        await initializeAuth()
      }
      setAppInitialized(true)
    }
    init()
  }, [initializeAuth])

  if (!appInitialized || isLoading) {
    return <LoadingScreen message="Initializing application..." />
  }

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* PUBLIC ROUTES - NO LAYOUT */}
          <Route path="/verify/:receiptCode" element={<VerifyReceipt />} />
          <Route path="/verify" element={<VerifyReceipt />} />
          <Route path="/first-login" element={<FirstLoginReset />} />
          
          {/* Public Routes - With Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="verify-otp" element={<OTPPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="about" element={<LandingPage section="about" />} />
            <Route path="contact" element={<LandingPage section="contact" />} />
            <Route path="faq" element={<LandingPage section="faq" />} />
            <Route path="pending-approval" element={<PendingApprovalPage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />
          </Route>

          {/* Protected Routes - Authentication required */}
          <Route path="/" element={<Layout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<ProfilePage section="settings" />} />
              <Route path="elections" element={<ElectionsPage />} />
              <Route path="elections/:id" element={<ElectionDetail />} />
              <Route path="vote/:electionId" element={<VotingPage />} />
              <Route path="results/:electionId" element={<ResultsPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="notifications" element={<Dashboard section="notifications" />} />
              <Route path="history" element={<Dashboard section="voting-history" />} />
              <Route path="my-receipts" element={<MyReceipts />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<Layout isAdminLayout={true} />}>
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'election_admin']} />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:id" element={<AdminUsers view="details" />} />
              <Route path="elections" element={<ManageElections />} />
              <Route path="elections/create" element={<ManageElections />} />
              <Route path="elections/:id/edit" element={<ManageElections />} />
              <Route path="candidates" element={<ManageCandidates />} />
              <Route path="candidates/create" element={<ManageCandidates />} />
              <Route path="candidates/:id/edit" element={<ManageCandidates />} />
              <Route path="positions" element={<AdminDashboard section="positions" />} />
            </Route>
          </Route>

          {/* Super Admin Routes */}
          <Route path="/system" element={<Layout isAdminLayout={true} />}>
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route index element={<Navigate to="/system/overview" replace />} />
              <Route path="overview" element={<AdminDashboard section="system-overview" />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="roles" element={<AdminDashboard section="role-management" />} />
              <Route path="backup" element={<AdminDashboard section="backup" />} />
              <Route path="logs" element={<AdminDashboard section="system-logs" />} />
            </Route>
          </Route>

          {/* Auditor & Observer Routes */}
          <Route path="/monitoring" element={<Layout />}>
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'election_admin', 'auditor', 'observer']} />}>
              <Route index element={<Navigate to="/monitoring/audit" replace />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="audit/:id" element={<AuditLogs view="detail" />} />
              <Route path="observer" element={<ObserverPortal />} />
              <Route path="reports" element={<ObserverPortal section="reports" />} />
              <Route path="statistics" element={<ObserverPortal section="statistics" />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App