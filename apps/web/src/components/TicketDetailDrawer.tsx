import { useState, useEffect } from 'react'
import { Drawer, Descriptions, Tag, Empty } from 'antd'
import { getTicketHistory } from '../api/client'
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS } from '@ticketflow/shared'
import type { Ticket, Priority } from '@ticketflow/shared'
import Timeline from './Timeline'
import type { TicketHistoryEvent } from '@ticketflow/shared'

interface TicketDetailDrawerProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  showTimeline?: boolean
}

export default function TicketDetailDrawer({
  ticket,
  open,
  onClose,
  showTimeline = true,
}: TicketDetailDrawerProps) {
  const [history, setHistory] = useState<TicketHistoryEvent[]>([])
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    if (open && ticket && showTimeline) {
      setHistoryError(false)
      setHistory([])
      getTicketHistory(ticket.id)
        .then(setHistory)
        .catch(() => setHistoryError(true))
    }
  }, [open, ticket?.id, showTimeline])

  return (
    <Drawer
      title={ticket?.title}
      open={open}
      onClose={onClose}
      width={480}
    >
      {ticket && (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLORS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={PRIORITY_COLORS[ticket.priority]}>{PRIORITY_LABELS[ticket.priority as Priority] ?? ticket.priority}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="截止日期">
              {ticket.dueDate
                ? (() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const due = new Date(ticket.dueDate + 'T00:00:00')
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
                : <span style={{ color: '#ccc' }}>—</span>}
            </Descriptions.Item>
            <Descriptions.Item label="创建者">{ticket.createdBy}</Descriptions.Item>
            <Descriptions.Item label="指派给">{ticket.assignedTo ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(ticket.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="描述">{ticket.description || '—'}</Descriptions.Item>
          </Descriptions>

          {showTimeline && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12 }}>处理记录</h4>
              {historyError ? (
                <Empty description="无法加载处理历史" />
              ) : (
                <Timeline events={history} />
              )}
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}
