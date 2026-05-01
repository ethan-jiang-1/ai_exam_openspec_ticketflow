import { Timeline as AntTimeline, Empty } from 'antd'
import type { TicketHistoryEvent, TicketHistoryAction } from '@ticketflow/shared'

const FIELD_LABELS: Record<string, string> = {
  title: '标题',
  description: '描述',
  priority: '优先级',
  dueDate: '截止日期',
}

const ACTION_LABELS: Record<TicketHistoryAction, string> = {
  created: '创建工单',
  assigned: '指派',
  reassigned: '改派',
  started: '开始处理',
  completed: '完成',
  edited: '编辑',
  commented: '添加了备注',
}

const ACTION_COLORS: Record<TicketHistoryAction, string> = {
  created: 'blue',
  assigned: 'gold',
  reassigned: 'gold',
  started: 'orange',
  completed: 'green',
  edited: 'purple',
  commented: 'green',
}

interface TimelineProps {
  events: TicketHistoryEvent[]
}

export default function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <Empty description="暂无处理记录" />
  }

  const items = events.map((event) => {
    let detail = ''
    let label = ACTION_LABELS[event.action]
    if (event.details) {
      try {
        const parsed = JSON.parse(event.details)
        if (event.action === 'assigned') {
          detail = ` → ${parsed.assignee}`
        } else if (event.action === 'reassigned') {
          detail = ` ${parsed.prevAssignee} → ${parsed.assignee}`
        } else if (event.action === 'edited') {
          const fieldLabel = FIELD_LABELS[parsed.field] || parsed.field
          label = `编辑了${fieldLabel}`
          detail = ` ${parsed.oldValue} → ${parsed.newValue}`
        } else if (event.action === 'commented') {
          detail = parsed.comment
        }
        // created — suppress details snapshot (audit-only, not rendered)
      } catch {
        /* ignore parse errors */
      }
    }

    return {
      color: ACTION_COLORS[event.action],
      children: (
        <div>
          <div>
            {label}
            {detail && event.action !== 'commented' && (
              <span style={{ color: '#666' }}>{detail}</span>
            )}
          </div>
          {event.action === 'commented' && detail && (
            <div style={{ color: '#333', marginTop: 4, whiteSpace: 'pre-wrap' }}>{detail}</div>
          )}
          <div style={{ fontSize: 12, color: '#999' }}>
            {event.actor} · {new Date(event.createdAt).toLocaleString()}
          </div>
        </div>
      ),
    }
  })

  return <AntTimeline items={items} />
}
