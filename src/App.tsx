import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import type { AppRole } from './features/auth/types'
import { RequestProvider } from './features/requests/RequestContext'
import { AccountsPage } from './pages/AccountsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { DashboardPage } from './pages/DashboardPage'
import { CommunityPage } from './pages/CommunityPage'
import { ImprovementsPage } from './pages/ImprovementsPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { LoginPage } from './pages/LoginPage'
import { NewRequestPage } from './pages/NewRequestPage'
import { PasswordSetupPage } from './pages/PasswordSetupPage'
import { QueuePage } from './pages/QueuePage'
import { ReportsPage } from './pages/ReportsPage'
import { RequestListPage } from './pages/RequestListPage'
import { SettingsPage } from './pages/SettingsPage'

function RequireRole({ roles, children }: { roles: AppRole[], children: React.ReactNode }) {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? children : <Navigate to="/" replace />
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <main className="auth-loading"><span className="brand-mark"><img src={`${import.meta.env.BASE_URL}brand/ntsf-logo.png`} alt="Nha Trang Seafoods" /></span><strong>Đang kiểm tra phiên đăng nhập...</strong></main>
  if (!user) return <LoginPage />
  if (user.needsPasswordSetup) return <PasswordSetupPage />

  return (
    <RequestProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new" element={<RequireRole roles={['requester', 'finance_admin']}><NewRequestPage /></RequireRole>} />
          <Route path="/my-requests" element={<RequireRole roles={['requester', 'finance_admin']}><RequestListPage /></RequireRole>} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/queue" element={<RequireRole roles={['finance_agent', 'finance_admin']}><QueuePage /></RequireRole>} />
          <Route path="/approvals" element={<RequireRole roles={['approver', 'finance_admin']}><ApprovalsPage /></RequireRole>} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/improvements" element={<ImprovementsPage />} />
          <Route path="/reports" element={<RequireRole roles={['finance_agent', 'approver', 'finance_admin']}><ReportsPage /></RequireRole>} />
          <Route path="/accounts" element={<RequireRole roles={['finance_admin']}><AccountsPage /></RequireRole>} />
          <Route path="/settings" element={<RequireRole roles={['finance_admin']}><SettingsPage /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </RequestProvider>
  )
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </HashRouter>
  )
}

export default App
