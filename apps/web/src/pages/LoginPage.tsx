import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Spin, Select, App as AntdApp } from 'antd'
import type { InputRef } from 'antd'
import { useAuth } from '../context/AuthContext'
import { getUsers } from '../api/client'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm()
  const passwordRef = useRef<InputRef>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [users, setUsers] = useState<{ username: string; displayName: string; role: string }[]>([])

  useEffect(() => {
    if (!loading && user) {
      navigate(`/workbench/${user.role}`, { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (import.meta.env.DEV && !loading && !user) {
      getUsers()
        .then(setUsers)
        .catch(() => {})
    }
  }, [loading, user])

  const handleFinish = async (values: { username: string; password: string }) => {
    try {
      setLoginLoading(true)
      await login(values.username, values.password)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoginLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 32 }}>
      <h1 style={{ margin: 0 }}>TicketFlow</h1>
      <Form
        form={form}
        style={{ width: 360 }}
        onFinish={handleFinish}
        validateTrigger="onSubmit"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input
            placeholder="请输入用户名"
            size="large"
            onPressEnter={() => passwordRef.current?.focus()}
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            ref={passwordRef}
            placeholder="请输入密码"
            size="large"
            onPressEnter={() => form.submit()}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loginLoading}>
            登录
          </Button>
        </Form.Item>
      </Form>

      {import.meta.env.DEV && (
        <div style={{ width: 360, border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16 }}>
          <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>开发模式 (Dev Only)</div>
          <Select
            style={{ width: '100%' }}
            placeholder="快速选择用户 (Dev)"
            options={users.map((u) => ({ value: u.username, label: `${u.displayName} (${u.role})` }))}
            onChange={(username) => form.setFieldsValue({ username })}
          />
        </div>
      )}
    </div>
  )
}
