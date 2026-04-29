import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import RoleSelect from './pages/RoleSelect'
import SubmitterWorkbench from './pages/SubmitterWorkbench'
import DispatcherWorkbench from './pages/DispatcherWorkbench'
import CompleterWorkbench from './pages/CompleterWorkbench'

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelect />} />
      <Route path="/workbench" element={<Layout />}>
        <Route path="submitter" element={<SubmitterWorkbench />} />
        <Route path="dispatcher" element={<DispatcherWorkbench />} />
        <Route path="completer" element={<CompleterWorkbench />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
