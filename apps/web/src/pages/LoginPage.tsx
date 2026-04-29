import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Spin, App as AntdApp } from 'antd'
import { useAuth } from '../context/AuthContext'
import { getUsers } from '../api/client'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [users, setUsers] = useState<{ username: string; displayName: string; role: string }[]>([])
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate(`/workbench/${user.role}`, { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (loading || user) return
    getUsers()
      .then(setUsers)
      .catch(() => message.error('获取用户列表失败'))
  }, [loading, user, message])

  const handleLogin = async (username: string) => {
    try {
      setLoginLoading(true)
      await login(username)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoginLoading(false)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>
  }

  if (user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 32 }}>
      <h1 style={{ margin: 0 }}>选择用户登录</h1>
      <Row gutter={[16, 16]} justify="center">
        {users.map((u) => (
          <Col key={u.username} xs={24} sm={8}>
            <Card
              hoverable
              style={{ textAlign: 'center' }}
              onClick={() => handleLogin(u.username)}
              loading={loginLoading}
            >
              <Card.Meta title={u.displayName} description={u.role} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
