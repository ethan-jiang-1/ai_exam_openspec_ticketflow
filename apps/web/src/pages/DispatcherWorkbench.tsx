import { useState, useEffect } from 'react'
import { Table, Tag, Button, Select, Empty, Row, Col, Card, App as AntdApp } from 'antd'
import { getTickets, getUsers, assignTicket } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '@ticketflow/shared'
import type { Ticket, Priority, TicketStatus, User } from '@ticketflow/shared'
import TicketDetailDrawer from '../components/TicketDetailDrawer'

export default function DispatcherWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [assignees, setAssignees] = useState<User[]>([])
  const [assignValues, setAssignValues] = useState<Record<string, string>>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const { message } = AntdApp.useApp()
  const { user } = useAuth()

  const displayTickets = tickets
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0))

  const fetchTickets = async () => {
    try {
      const all = await getTickets()
      setTickets(all)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
    getUsers()
      .then((users) => setAssignees(users.filter((u) => u.role === 'completer')))
      .catch(() => {})
  }, [])

  const handleAssign = async (id: string) => {
    const target = assignValues[id] || assignees[0]?.username
    if (!target) {
      message.error('无可指派的用户')
      return
    }
    try {
      await assignTicket(id, target)
      await fetchTickets()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '指派失败')
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
      filters: Object.entries(STATUS_LABELS).map(([value, text]) => ({ text, value })),
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
      width: 200,
      render: (_: unknown, record: Ticket) => {
        if (record.status === 'submitted') {
          return (
            <>
              <Select
                value={assignValues[record.id] || assignees[0]?.username}
                style={{ width: 120, marginRight: 8 }}
                onChange={(v) => setAssignValues((prev) => ({ ...prev, [record.id]: v }))}
                options={assignees.map((a) => ({ value: a.username, label: a.displayName }))}
              />
              <Button type="primary" size="small" onClick={() => handleAssign(record.id)}>
                指派
              </Button>
            </>
          )
        }
        if (record.status === 'assigned') {
          return (
            <>
              <Select
                value={assignValues[record.id] || record.assignedTo || assignees[0]?.username}
                style={{ width: 120, marginRight: 8 }}
                onChange={(v) => setAssignValues((prev) => ({ ...prev, [record.id]: v }))}
                options={assignees.map((a) => ({ value: a.username, label: a.displayName }))}
              />
              <Button type="primary" size="small" onClick={() => handleAssign(record.id)}>
                重新指派
              </Button>
            </>
          )
        }
        if (record.status === 'in_progress') {
          return <span>处理中（已指派给 {record.assignedTo}）</span>
        }
        return null
      },
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>调度者工作台</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>你好，{user?.displayName}</p>

      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.filter((t) => t.status === 'submitted').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>待指派</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.filter((t) => t.status === 'assigned').length}</div>
            <div style={{ color: '#666', fontSize: 13 }}>已指派</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{tickets.filter((t) => t.status === 'in_progress').length}</div>
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

      {displayTickets.length === 0 ? (
        <Empty description="暂无待处理的工单" />
      ) : (
        <Table
          dataSource={displayTickets}
          columns={columns}
          rowKey="id"
          pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50', '100', '200'] }}
          onChange={(pag) => {
            if (pag.current) setPagination((prev) => ({ ...prev, current: pag.current! }))
            if (pag.pageSize) setPagination({ current: 1, pageSize: pag.pageSize! })
          }}
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
