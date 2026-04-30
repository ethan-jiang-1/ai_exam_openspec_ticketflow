import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Modal, Input, Select, Popconfirm, Space, App as AntdApp } from 'antd'
import { ROLES } from '@ticketflow/shared'
import type { User } from '@ticketflow/shared'
import { getAdminUsers, createUser, updateUser, deleteUser } from '../api/client'

const ROLE_OPTIONS = Object.entries(ROLES).map(([, value]) => ({
  label: { submitter: '提交者', dispatcher: '调度者', completer: '完成者', admin: '管理员' }[value] ?? value,
  value,
}))

interface UserFormData {
  username: string
  displayName: string
  role: string
  password: string
}

export default function AdminWorkbench() {
  const { message } = AntdApp.useApp()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    displayName: '',
    role: 'submitter',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminUsers()
      setUsers(data)
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openCreate = () => {
    setEditingUser(null)
    setFormData({ username: '', displayName: '', role: 'submitter', password: '' })
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      password: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (editingUser) {
        const payload: { displayName?: string; role?: string; password?: string } = {
          displayName: formData.displayName,
          role: formData.role,
        }
        if (formData.password) {
          payload.password = formData.password
        }
        await updateUser(editingUser.username, payload)
        message.success('用户更新成功')
      } else {
        if (!formData.username || !formData.displayName || !formData.role || !formData.password) {
          message.error('请填写所有必填字段')
          return
        }
        await createUser({
          username: formData.username,
          displayName: formData.displayName,
          role: formData.role,
          password: formData.password,
        })
        message.success('用户创建成功')
      }
      setModalOpen(false)
      loadUsers()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (username: string) => {
    try {
      await deleteUser(username)
      message.success('用户已删除')
      loadUsers()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'displayName', key: 'displayName' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const labels: Record<string, string> = { submitter: '提交者', dispatcher: '调度者', completer: '完成者', admin: '管理员' }
        return labels[role] ?? role
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定删除此用户？"
            onConfirm={() => handleDelete(record.username)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>用户管理</h2>
        <Button type="primary" onClick={openCreate}>新增用户</Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingUser ? '保存' : '创建'}
        cancelText="取消"
      >
        {!editingUser && (
          <div style={{ marginBottom: 12 }}>
            <label>用户名</label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="用户名（不可修改）"
            />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label>显示名</label>
          <Input
            value={formData.displayName}
            onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
            placeholder="显示名"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>角色</label>
          <Select
            value={formData.role}
            onChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
            options={ROLE_OPTIONS}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>密码{editingUser ? '（留空表示不修改）' : ''}</label>
          <Input.Password
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            placeholder={editingUser ? '留空表示不修改密码' : '输入密码'}
          />
        </div>
      </Modal>
    </div>
  )
}
