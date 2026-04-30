import { useState, useEffect } from 'react'
import { Table, Tag, Button, Select, Empty, Drawer, Descriptions, App as AntdApp } from 'antd'
import { getTickets, getUsers, assignTicket } from '../api/client'
import { PRIORITY_LABELS, PRIORITY_ORDER } from '@ticketflow/shared'
import type { Ticket, Priority, User } from '@ticketflow/shared'

const STATUS_COLORS: Record<string, string> = {
  submitted: 'blue',
  assigned: 'gold',
  in_progress: 'orange',
  completed: 'green',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: '已提交',
  assigned: '已指派',
  in_progress: '处理中',
  completed: '已完成',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
}

export default function DispatcherWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [assignees, setAssignees] = useState<User[]>([])
  const [assignValues, setAssignValues] = useState<Record<string, string>>({})
  const { message } = AntdApp.useApp()

  const fetchTickets = async () => {
    try {
      const all = await getTickets()
      const filtered = all
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0))
      setTickets(filtered)
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
      render: (priority: string) => <Tag color={PRIORITY_COLORS[priority]}>{PRIORITY_LABELS[priority as Priority] ?? priority}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
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
          return <span>已指派给 {record.assignedTo}</span>
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
      <h2 style={{ marginBottom: 16 }}>调度者工作台</h2>

      {tickets.length === 0 ? (
        <Empty description="暂无待处理的工单" />
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
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const due = new Date(selectedTicket.dueDate + 'T00:00:00')
                    const isOverdue = due < today
                    const isToday = due.getTime() === today.getTime()
                    return (
                      <span style={(isOverdue || isToday) ? { color: 'red' } : {}}>
                        {due.toLocaleDateString()}
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
