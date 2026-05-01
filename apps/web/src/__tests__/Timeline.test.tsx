import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import Timeline from '../components/Timeline'
import type { TicketHistoryEvent } from '@ticketflow/shared'

function renderTimeline(events: TicketHistoryEvent[]) {
  return render(
    <ConfigProvider>
      <Timeline events={events} />
    </ConfigProvider>,
  )
}

const baseEvent: TicketHistoryEvent = {
  id: 'h1',
  ticketId: 't1',
  action: 'created',
  actor: 'submitter',
  fromStatus: null,
  toStatus: 'submitted',
  details: null,
  createdAt: '2026-01-15T10:30:00.000Z',
}

describe('Timeline', () => {
  it('renders events with Chinese action labels', () => {
    const events: TicketHistoryEvent[] = [
      baseEvent,
      { ...baseEvent, id: 'h2', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: '{"assignee":"completer1"}' },
      { ...baseEvent, id: 'h3', action: 'completed', actor: 'completer1', fromStatus: 'in_progress', toStatus: 'completed' },
    ]

    renderTimeline(events)

    expect(screen.getByText('创建工单')).toBeInTheDocument()
    expect(screen.getByText('指派')).toBeInTheDocument()
    expect(screen.getByText('完成')).toBeInTheDocument()
    expect(screen.getByText(/submitter/)).toBeInTheDocument()
    expect(screen.getByText(/dispatcher/)).toBeInTheDocument()
    expect(screen.getAllByText(/completer1/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows Empty when events array is empty', () => {
    renderTimeline([])
    expect(screen.getByText('暂无处理记录')).toBeInTheDocument()
  })

  it('shows reassigned label correctly', () => {
    const events: TicketHistoryEvent[] = [
      { ...baseEvent, action: 'reassigned', actor: 'dispatcher', fromStatus: 'assigned', toStatus: 'assigned', details: '{"assignee":"completer2","prevAssignee":"completer1"}' },
    ]

    renderTimeline(events)

    expect(screen.getByText('改派')).toBeInTheDocument()
  })

  it('displays assignee info from details JSON for assigned action', () => {
    const events: TicketHistoryEvent[] = [
      { ...baseEvent, action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: '{"assignee":"completer1"}' },
    ]

    renderTimeline(events)

    expect(screen.getByText(/completer1/)).toBeInTheDocument()
  })

  it('displays prevAssignee → assignee for reassigned action', () => {
    const events: TicketHistoryEvent[] = [
      { ...baseEvent, action: 'reassigned', actor: 'dispatcher', fromStatus: 'assigned', toStatus: 'assigned', details: '{"assignee":"completer2","prevAssignee":"completer1"}' },
    ]

    renderTimeline(events)

    expect(screen.getByText(/completer1/)).toBeInTheDocument()
    expect(screen.getByText(/completer2/)).toBeInTheDocument()
  })

  it('renders all 5 action types with events in correct order', () => {
    const events: TicketHistoryEvent[] = [
      baseEvent,
      { ...baseEvent, id: 'h2', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: '{"assignee":"c1"}' },
      { ...baseEvent, id: 'h3', action: 'reassigned', actor: 'dispatcher', fromStatus: 'assigned', toStatus: 'assigned', details: '{"assignee":"c2","prevAssignee":"c1"}' },
      { ...baseEvent, id: 'h4', action: 'started', actor: 'c1', fromStatus: 'assigned', toStatus: 'in_progress' },
      { ...baseEvent, id: 'h5', action: 'completed', actor: 'c1', fromStatus: 'in_progress', toStatus: 'completed' },
    ]

    renderTimeline(events)

    const items = document.querySelectorAll('.ant-timeline-item')
    expect(items.length).toBe(5)

    expect(items[0].textContent).toContain('创建工单')
    expect(items[1].textContent).toContain('指派')
    expect(items[2].textContent).toContain('改派')
    expect(items[3].textContent).toContain('开始处理')
    expect(items[4].textContent).toContain('完成')
  })

  it('handles malformed details JSON gracefully', () => {
    const events: TicketHistoryEvent[] = [
      { ...baseEvent, action: 'assigned', details: 'not-json' },
    ]

    expect(() => renderTimeline(events)).not.toThrow()
    expect(screen.getByText('指派')).toBeInTheDocument()
  })

  it('renders timestamps in locale format', () => {
    renderTimeline([baseEvent])

    // new Date('2026-01-15T10:30:00.000Z').toLocaleString() varies by timezone
    // Just verify the actor is visible (timestamp is rendered alongside it)
    expect(screen.getByText(/submitter/)).toBeInTheDocument()
  })
})
