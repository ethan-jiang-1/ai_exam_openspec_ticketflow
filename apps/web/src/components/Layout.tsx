import { Outlet, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Button } from 'antd'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {user?.displayName}
        </span>
        <Button size="small" onClick={handleLogout}>
          退出
        </Button>
      </AntLayout.Header>
      <AntLayout.Content style={{ padding: '24px 16px' }}>
        <Outlet />
      </AntLayout.Content>
    </AntLayout>
  )
}
