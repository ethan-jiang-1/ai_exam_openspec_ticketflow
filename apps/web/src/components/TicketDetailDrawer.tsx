import { useState, useEffect } from 'react'
import { Drawer, Descriptions, Tag, Empty, Input, Button } from 'antd'
import { getTicketHistory, addComment } from '../api/client'
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS } from '@ticketflow/shared'
import type { Ticket, Priority } from '@ticketflow/shared'
import Timeline from './Timeline'
import type { TicketHistoryEvent } from '@ticketflow/shared'

interface TicketDetailDrawerProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  showTimeline?: boolean
  enableComments?: boolean
  refreshKey?: number
  onCommentAdded?: () => void
}

export default function TicketDetailDrawer({
  ticket,
  open,
  onClose,
  showTimeline = true,
  enableComments = false,
  refreshKey = 0,
  onCommentAdded,
}: TicketDetailDrawerProps) {
  const [history, setHistory] = useState<TicketHistoryEvent[]>([])
  const [historyError, setHistoryError] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')

  useEffect(() => {
    if (open && ticket && showTimeline) {
      setHistoryError(false)
      setHistory([])
      getTicketHistory(ticket.id)
        .then(setHistory)
        .catch(() => setHistoryError(true))
    }
  }, [open, ticket?.id, showTimeline, refreshKey])

  const handleAddComment = async () => {
    if (!ticket || !commentText.trim()) return
    setCommentSubmitting(true)
    setCommentError('')
    try {
      await addComment(ticket.id, { comment: commentText.trim() })
      setCommentText('')
      onCommentAdded?.()
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : '添加备注失败')
    } finally {
      setCommentSubmitting(false)
    }
  }

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

          {enableComments && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12 }}>添加备注</h4>
              <Input.TextArea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="输入备注内容..."
                maxLength={2000}
                showCount
                rows={3}
              />
              {commentError && (
                <div style={{ color: 'red', marginTop: 8 }}>{commentError}</div>
              )}
              <Button
                type="primary"
                onClick={handleAddComment}
                loading={commentSubmitting}
                style={{ marginTop: 8 }}
              >
                添加备注
              </Button>
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}
