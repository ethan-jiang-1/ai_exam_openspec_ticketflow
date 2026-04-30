import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import SubmitterWorkbench from './pages/SubmitterWorkbench'
import DispatcherWorkbench from './pages/DispatcherWorkbench'
import CompleterWorkbench from './pages/CompleterWorkbench'
import AdminWorkbench from './pages/AdminWorkbench'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout />
}

function WorkbenchGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuth()
  if (user && user.role !== role) {
    return <Navigate to={`/workbench/${user.role}`} replace />
  }
  return <>{children}</>
}

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/workbench" element={<ProtectedLayout />}>
        <Route path="submitter" element={<WorkbenchGuard role="submitter"><SubmitterWorkbench /></WorkbenchGuard>} />
        <Route path="dispatcher" element={<WorkbenchGuard role="dispatcher"><DispatcherWorkbench /></WorkbenchGuard>} />
        <Route path="completer" element={<WorkbenchGuard role="completer"><CompleterWorkbench /></WorkbenchGuard>} />
        <Route path="admin" element={<WorkbenchGuard role="admin"><AdminWorkbench /></WorkbenchGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
