import { Outlet, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Button, Tag, Typography } from 'antd'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, ROLE_COLORS } from '@ticketflow/shared'
import type { Role } from '@ticketflow/shared'

const HEADER_BG: Record<string, string> = {
  submitter: '#f0f5ff',
  dispatcher: '#f5f0ff',
  completer: '#ecfdf5',
  admin: '#fff7ed',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const role: Role | undefined = user?.role as Role | undefined
  const headerBg = role ? HEADER_BG[role] || '#001529' : '#001529'

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexWrap: 'wrap',
        gap: 8,
        background: headerBg,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <Typography.Title level={4} style={{ margin: 0, color: role ? 'inherit' : '#fff' }}>
            TicketFlow
          </Typography.Title>
          {role && (
            <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(role === 'admin' || role === 'dispatcher') && (
            <Button type="link" size="small" onClick={() => navigate('/dashboard')}>
              数据面板
            </Button>
          )}
          <span style={{ fontWeight: 500 }}>{user?.displayName}</span>
          <Button size="small" onClick={handleLogout}>
            退出
          </Button>
        </span>
      </AntLayout.Header>
      <AntLayout.Content style={{ padding: '24px 16px' }}>
        <Outlet />
      </AntLayout.Content>
    </AntLayout>
  )
}
