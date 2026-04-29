import { Outlet, useNavigate } from 'react-router-dom'
import { useRole } from '../context/RoleContext'
import './Layout.css'

const ROLE_LABELS: Record<string, string> = {
  submitter: '提交者',
  dispatcher: '调度者',
  completer: '完成者',
}

export default function Layout() {
  const { role, clearRole } = useRole()
  const navigate = useNavigate()

  const handleSwitch = () => {
    clearRole()
    navigate('/')
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <span className="layout-role">
          当前角色：{role ? ROLE_LABELS[role] : '未知'}
        </span>
        <button className="btn btn-switch" onClick={handleSwitch}>
          切换角色
        </button>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}
