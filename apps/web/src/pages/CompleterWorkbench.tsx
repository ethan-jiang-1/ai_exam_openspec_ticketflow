import { useState, useEffect } from 'react'
import { Table, Tag, Button, Drawer, Descriptions, Row, Col, Card, Empty, App as AntdApp } from 'antd'
import { getTickets, startTicket, completeTicket } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '@ticketflow/shared'
import type { Ticket, Priority, TicketStatus } from '@ticketflow/shared'

export default function CompleterWorkbench() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const { message } = AntdApp.useApp()

  const fetchTickets = async () => {
    try {
      const all = await getTickets()
      setTickets(all.filter((t) => t.assignedTo === user?.username))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  const displayTickets = tickets.filter(
    (t) => t.status === 'assigned' || t.status === 'in_progress',
  )

  useEffect(() => {
    if (user) fetchTickets()
  }, [user])

  const handleStart = async (id: string) => {
    try {
      await startTicket(id)
      await fetchTickets()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await completeTicket(id)
      await fetchTickets()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: '35%',
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
    { title: '创建者', dataIndex: 'createdBy', key: 'createdBy', width: 100, responsive: ['lg'] as ('lg')[] },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      responsive: ['lg'] as ('lg')[],
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: unknown, record: Ticket) => {
        if (record.status === 'assigned') {
          return (
            <Button type="primary" size="small" onClick={() => handleStart(record.id)}>
              开始处理
            </Button>
          )
        }
        if (record.status === 'in_progress') {
          return (
            <Button type="primary" size="small" onClick={() => handleComplete(record.id)}>
              完成
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>完成者工作台</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>你好，{user?.displayName}</p>

      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{displayTickets.filter((t) => t.status === 'assigned').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>待处理</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{displayTickets.filter((t) => t.status === 'in_progress').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>处理中</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              {tickets.filter((t) => {
                if (t.status !== 'completed') return false
                const today = new Date().toISOString().slice(0, 10)
                return t.updatedAt.slice(0, 10) === today
              }).length}
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>今日完成</div>
          </Card>
        </Col>
      </Row>

      {displayTickets.length === 0 ? (
        <Empty description="暂无待处理的工单" />
      ) : (
        <Table
          dataSource={displayTickets}
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
