import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RecordsPage from './pages/RecordsPage'
import NotificationsPage from './pages/NotificationsPage'
import WorkflowsPage from './pages/WorkflowsPage'
import SearchPage from './pages/SearchPage'
import ReportsPage from './pages/ReportsPage'
import TeamPage from './pages/TeamPage'
import SettingsPage from './pages/SettingsPage'
import AccountAdministrationPage from './pages/AccountAdministrationPage'

function AppShell({ user, onLogout, children }) {
  return (
    <div className="flex min-h-screen bg-[#edf3fa] text-slate-800">
      <Sidebar />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="text-[22px] font-semibold tracking-tight text-slate-800">CRMS</div>
          <div className="flex items-center gap-4">
            <button onClick={onLogout} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700">Logout</button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('crms_user')) || null
    } catch {
      return null
    }
  })

  const handleLogin = (nextUser) => {
    setUser(nextUser)
  }

  const handleUserUpdate = (nextUser) => {
    if (!nextUser) {
      localStorage.removeItem('crms_token')
      localStorage.removeItem('crms_refresh')
      localStorage.removeItem('crms_user')
      setUser(null)
      return
    }
    localStorage.setItem('crms_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('crms_token')
    localStorage.removeItem('crms_refresh')
    localStorage.removeItem('crms_user')
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={
            user ? (
              <AppShell user={user} onLogout={handleLogout}>
                <DashboardPage user={user} />
              </AppShell>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/records/:module"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <RecordsPage user={user} />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/notifications"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <NotificationsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/workflows"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <WorkflowsPage user={user} />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/search"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <SearchPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/reports"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <ReportsPage user={user} />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/team"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <TeamPage user={user} />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <SettingsPage user={user} onUserUpdate={handleUserUpdate} />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/account-administration"
          element={user ? (
            <AppShell user={user} onLogout={handleLogout}>
              <AccountAdministrationPage user={user} />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
