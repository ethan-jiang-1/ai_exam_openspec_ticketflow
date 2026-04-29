import { Outlet, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Button } from 'antd'
import { useRole } from '../context/RoleContext'

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
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
          当前角色：{role ? ROLE_LABELS[role] : '未知'}
        </span>
        <Button size="small" onClick={handleSwitch}>
          切换角色
        </Button>
      </AntLayout.Header>
      <AntLayout.Content style={{ padding: '24px 16px' }}>
        <Outlet />
      </AntLayout.Content>
    </AntLayout>
  )
}
