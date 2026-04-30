import { useState, useEffect } from 'react'
import { Form, Input, Button, Select, DatePicker, Table, Tag, Drawer, Descriptions, Row, Col, Card, Empty, App as AntdApp } from 'antd'
import { getTickets, createTicket } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '@ticketflow/shared'
import type { Ticket, Priority, TicketStatus } from '@ticketflow/shared'

export default function SubmitterWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [form] = Form.useForm()
  const { message } = AntdApp.useApp()
  const { user } = useAuth()

  const fetchTickets = async () => {
    try {
      const all = await getTickets()
      setTickets(all.filter((t) => t.createdBy === user?.username))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [user])

  const handleSubmit = async (values: { title: string; description?: string; priority?: Priority; dueDate?: { format: (fmt: string) => string } }) => {
    try {
      setLoading(true)
      await createTicket({
        title: values.title.trim(),
        description: (values.description ?? '').trim(),
        priority: values.priority || 'medium',
        dueDate: values.dueDate?.format('YYYY-MM-DD') || undefined,
      })
      form.resetFields()
      await fetchTickets()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '创建工单失败')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: '50%',
      render: (title: string, record: Ticket) => (
        <a onClick={() => setSelectedTicket(record)}>{title}</a>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => <Tag color={PRIORITY_COLORS[priority as Priority]}>{PRIORITY_LABELS[priority as Priority] ?? priority}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={STATUS_COLORS[status as TicketStatus]}>{STATUS_LABELS[status as TicketStatus] || status}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      responsive: ['lg'] as ('lg')[],
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>提交者工作台</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>你好，{user?.displayName}</p>

      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>我的工单</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.filter((t) => t.status === 'submitted').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>待处理</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.filter((t) => t.status === 'assigned' || t.status === 'in_progress').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>处理中</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.filter((t) => t.status === 'completed').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>已完成</div>
          </Card>
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 480, width: '100%', margin: '0 auto 24px' }}>
        <Form.Item name="title" label="工单标题" rules={[{ required: true, message: '请输入工单标题' }, { max: 200, message: '标题不能超过 200 个字符' }]}>
          <Input placeholder="工单标题" maxLength={200} showCount />
        </Form.Item>
        <Form.Item name="description" label="工单描述" rules={[{ max: 2000, message: '描述不能超过 2000 个字符' }]}>
          <Input.TextArea placeholder="工单描述" rows={3} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item name="priority" label="优先级" initialValue="medium">
          <Select
            options={[
              { value: 'low', label: `${PRIORITY_LABELS.low} (低)` },
              { value: 'medium', label: `${PRIORITY_LABELS.medium} (中)` },
              { value: 'high', label: `${PRIORITY_LABELS.high} (高)` },
            ]}
          />
        </Form.Item>
        <Form.Item name="dueDate" label="截止日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交工单
          </Button>
        </Form.Item>
      </Form>

      {tickets.length === 0 ? (
        <Empty description="暂无提交的工单" />
      ) : (
        <Table
          dataSource={tickets}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      )}

      <Drawer
        title={selectedTicket?.title}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        width={480}
      >
        {selectedTicket && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLORS[selectedTicket.status]}>{STATUS_LABELS[selectedTicket.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={PRIORITY_COLORS[selectedTicket.priority]}>{PRIORITY_LABELS[selectedTicket.priority as Priority] ?? selectedTicket.priority}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="截止日期">
              {selectedTicket.dueDate
                ? (() => {
                    const d = new Date(selectedTicket.dueDate)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const due = new Date(selectedTicket.dueDate + 'T00:00:00')
                    const isOverdue = due < today
                    const isToday = due.getTime() === today.getTime()
                    return (
                      <span style={(isOverdue || isToday) ? { color: 'red' } : {}}>
                        {d.toLocaleDateString()}
                        {isOverdue && <Tag color="red" style={{ marginLeft: 4 }}>已到期</Tag>}
                        {isToday && <Tag color="red" style={{ marginLeft: 4 }}>今日到期</Tag>}
                      </span>
                    )
                  })()
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="创建者">{selectedTicket.createdBy}</Descriptions.Item>
            <Descriptions.Item label="指派给">{selectedTicket.assignedTo ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedTicket.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedTicket.description || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
