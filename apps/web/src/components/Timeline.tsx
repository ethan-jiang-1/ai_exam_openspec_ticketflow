import { Timeline as AntTimeline, Empty } from 'antd'
import type { TicketHistoryEvent, TicketHistoryAction } from '@ticketflow/shared'

const ACTION_LABELS: Record<TicketHistoryAction, string> = {
  created: '创建工单',
  assigned: '指派',
  reassigned: '改派',
  started: '开始处理',
  completed: '完成',
}

const ACTION_COLORS: Record<TicketHistoryAction, string> = {
  created: 'blue',
  assigned: 'gold',
  reassigned: 'gold',
  started: 'orange',
  completed: 'green',
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
    if (event.details) {
      try {
        const parsed = JSON.parse(event.details)
        if (event.action === 'assigned') {
          detail = ` → ${parsed.assignee}`
        } else if (event.action === 'reassigned') {
          detail = ` ${parsed.prevAssignee} → ${parsed.assignee}`
        }
      } catch {
        /* ignore parse errors */
      }
    }

    return {
      color: ACTION_COLORS[event.action],
      children: (
        <div>
          <div>
            {ACTION_LABELS[event.action]}
            {detail && <span style={{ color: '#666' }}>{detail}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {event.actor} · {new Date(event.createdAt).toLocaleString()}
          </div>
        </div>
      ),
    }
  })

  return <AntTimeline items={items} />
}
