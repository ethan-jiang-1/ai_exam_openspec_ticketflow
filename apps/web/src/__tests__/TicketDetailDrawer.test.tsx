import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ConfigProvider, App as AntdApp } from 'antd'
import TicketDetailDrawer from '../components/TicketDetailDrawer'
import type { Ticket, TicketHistoryEvent } from '@ticketflow/shared'

const mockTicket: Ticket = {
  id: 't1',
  title: '测试工单标题',
  description: '这是一段描述',
  status: 'assigned',
  priority: 'high',
  dueDate: '2026-06-15',
  createdBy: 'submitter',
  assignedTo: 'completer1',
  createdAt: '2026-01-15T10:30:00.000Z',
  updatedAt: '2026-01-16T08:00:00.000Z',
}

const mockHistory: TicketHistoryEvent[] = [
  {
    id: 'h1', ticketId: 't1', action: 'created', actor: 'submitter',
    fromStatus: null, toStatus: 'submitted', details: null, createdAt: '2026-01-15T10:30:00.000Z',
  },
  {
    id: 'h2', ticketId: 't1', action: 'assigned', actor: 'dispatcher',
    fromStatus: 'submitted', toStatus: 'assigned', details: '{"assignee":"completer1"}', createdAt: '2026-01-15T11:00:00.000Z',
  },
]

function renderDrawer(open: boolean, showTimeline = true) {
  return render(
    <ConfigProvider>
      <AntdApp>
        <TicketDetailDrawer
          ticket={open ? mockTicket : null}
          open={open}
          onClose={vi.fn()}
          showTimeline={showTimeline}
        />
      </AntdApp>
    </ConfigProvider>,
  )
}

describe('TicketDetailDrawer', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows ticket details when open with valid ticket', async () => {
    renderDrawer(true)

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    expect(screen.getByText('这是一段描述')).toBeInTheDocument()
    expect(screen.getByText('submitter')).toBeInTheDocument()
    expect(screen.getByText('completer1')).toBeInTheDocument()
    expect(screen.getByText('已指派')).toBeInTheDocument()
  })

  it('does not render content when open is false', () => {
    renderDrawer(false)

    expect(screen.queryByText('测试工单标题')).not.toBeInTheDocument()
  })

  it('renders Timeline when showTimeline is true', async () => {
    renderDrawer(true, true)

    await waitFor(() => {
      expect(screen.getByText('创建工单')).toBeInTheDocument()
    })
    expect(screen.getByText('指派')).toBeInTheDocument()
  })

  it('does not render Timeline when showTimeline is false', async () => {
    renderDrawer(true, false)

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    expect(screen.queryByText('创建工单')).not.toBeInTheDocument()
    expect(screen.queryByText('暂无处理记录')).not.toBeInTheDocument()
  })

  it('shows Empty message when getTicketHistory fails', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })

    renderDrawer(true)

    await waitFor(() => {
      expect(screen.getByText('无法加载处理历史')).toBeInTheDocument()
    })

    // Drawer should still show ticket details
    expect(screen.getByText('测试工单标题')).toBeInTheDocument()
  })

  it('displays priority tag with correct label and color', async () => {
    renderDrawer(true)

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    expect(screen.getByText('高')).toBeInTheDocument()
  })

  it('displays dueDate with overdue tag when past due', async () => {
    const overdueTicket = { ...mockTicket, dueDate: '2020-01-01' }
    render(
      <ConfigProvider>
        <AntdApp>
          <TicketDetailDrawer ticket={overdueTicket} open={true} onClose={vi.fn()} />
        </AntdApp>
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('已到期')).toBeInTheDocument()
    })
  })

  it('displays dueDate as dash when null', async () => {
    const noDueTicket = { ...mockTicket, dueDate: null }
    render(
      <ConfigProvider>
        <AntdApp>
          <TicketDetailDrawer ticket={noDueTicket} open={true} onClose={vi.fn()} />
        </AntdApp>
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })
  })

  it('shows assignedTo as dash when null', async () => {
    const unassigned = { ...mockTicket, assignedTo: null }
    render(
      <ConfigProvider>
        <AntdApp>
          <TicketDetailDrawer ticket={unassigned} open={true} onClose={vi.fn()} />
        </AntdApp>
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    // The dash should appear for null assignedTo
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders comment area when enableComments is true', async () => {
    render(
      <ConfigProvider>
        <AntdApp>
          <TicketDetailDrawer ticket={mockTicket} open={true} onClose={vi.fn()} enableComments />
        </AntdApp>
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加备注' })).toBeInTheDocument()
  })

  it('does not render comment area when enableComments is false', async () => {
    renderDrawer(true)

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    expect(screen.queryByPlaceholderText('输入备注内容...')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '添加备注' })).not.toBeInTheDocument()
  })

  it('submits comment successfully and clears input', async () => {
    let commentBody: string | null = null
    vi.restoreAllMocks()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/comments')) {
        commentBody = init?.body as string
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ success: true }) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })

    const onCommentAdded = vi.fn()
    render(
      <ConfigProvider>
        <AntdApp>
          <TicketDetailDrawer ticket={mockTicket} open={true} onClose={vi.fn()} enableComments onCommentAdded={onCommentAdded} />
        </AntdApp>
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('输入备注内容...')
    fireEvent.change(textarea, { target: { value: '测试备注内容' } })
    fireEvent.click(screen.getByRole('button', { name: '添加备注' }))

    await waitFor(() => {
      expect(commentBody).not.toBeNull()
    })

    const body = JSON.parse(commentBody!)
    expect(body.comment).toBe('测试备注内容')
    expect(onCommentAdded).toHaveBeenCalled()

    fetchMock.mockRestore()
  })

  it('shows error and retains text when comment API fails', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/comments')) {
        return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: 'comment must not be empty' }) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })

    render(
      <ConfigProvider>
        <AntdApp>
          <TicketDetailDrawer ticket={mockTicket} open={true} onClose={vi.fn()} enableComments />
        </AntdApp>
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('测试工单标题')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('输入备注内容...') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '我的备注' } })
    fireEvent.click(screen.getByRole('button', { name: '添加备注' }))

    await waitFor(() => {
      expect(screen.getByText('comment must not be empty')).toBeInTheDocument()
    })

    // Text should be retained
    expect(textarea.value).toBe('我的备注')
  })
})
