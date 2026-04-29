import { useState, useEffect } from 'react'
import { Table, Tag, Button, Select, Empty, Drawer, Descriptions, App as AntdApp } from 'antd'
import { getTickets, assignTicket } from '../api/client'
import type { Ticket } from '@ticketflow/shared'

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

const ASSIGNEE_OPTIONS = ['completer']

export default function DispatcherWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const { message } = AntdApp.useApp()

  const fetchTickets = async () => {
    try {
      const all = await getTickets()
      setTickets(all.filter((t) => t.status !== 'completed'))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleAssign = async (id: string) => {
    try {
      await assignTicket(id, 'completer')
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
      width: '40%',
      render: (title: string, record: Ticket) => (
        <a onClick={() => setSelectedTicket(record)}>{title}</a>
      ),
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
                defaultValue="completer"
                style={{ width: 120, marginRight: 8 }}
                options={ASSIGNEE_OPTIONS.map((a) => ({ value: a, label: a }))}
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
