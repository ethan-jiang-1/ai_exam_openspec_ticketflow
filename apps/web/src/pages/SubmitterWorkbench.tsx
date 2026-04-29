import { useState, useEffect } from 'react'
import { Form, Input, Button, Table, Tag, Drawer, Descriptions, App as AntdApp } from 'antd'
import { getTickets, createTicket } from '../api/client'
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

export default function SubmitterWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [form] = Form.useForm()
  const { message } = AntdApp.useApp()

  const fetchTickets = async () => {
    try {
      const all = await getTickets()
      setTickets(all.filter((t) => t.createdBy === 'submitter'))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleSubmit = async (values: { title: string; description?: string }) => {
    try {
      setLoading(true)
      await createTicket({ title: values.title.trim(), description: (values.description ?? '').trim(), createdBy: 'submitter' })
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
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
      <h2 style={{ marginBottom: 16 }}>提交者工作台</h2>

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 480, width: '100%', margin: '0 auto 24px' }}>
        <Form.Item name="title" label="工单标题" rules={[{ required: true, message: '请输入工单标题' }, { max: 200, message: '标题不能超过 200 个字符' }]}>
          <Input placeholder="工单标题" maxLength={200} showCount />
        </Form.Item>
        <Form.Item name="description" label="工单描述" rules={[{ max: 2000, message: '描述不能超过 2000 个字符' }]}>
          <Input.TextArea placeholder="工单描述" rows={3} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交工单
          </Button>
        </Form.Item>
      </Form>

      <Table
        dataSource={tickets}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

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
