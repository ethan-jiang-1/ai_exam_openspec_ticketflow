import { useState, useEffect } from 'react'
import { Table, Tag, Button, Row, Col, Card, Empty, App as AntdApp } from 'antd'
import { getTickets, startTicket, completeTicket } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '@ticketflow/shared'
import type { Ticket, Priority, TicketStatus } from '@ticketflow/shared'
import TicketDetailDrawer from '../components/TicketDetailDrawer'

export default function CompleterWorkbench() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
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
      filters: [
        { text: STATUS_LABELS.assigned, value: 'assigned' },
        { text: STATUS_LABELS.in_progress, value: 'in_progress' },
        { text: STATUS_LABELS.completed, value: 'completed' },
      ],
      onFilter: (value: React.Key | boolean, record: Ticket) => record.status === String(value),
      filterSearch: false,
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
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50', '100', '200'] }}
          scroll={{ x: 'max-content' }}
        />
      )}

      <TicketDetailDrawer
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        enableComments
        refreshKey={refreshKey}
        onCommentAdded={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
