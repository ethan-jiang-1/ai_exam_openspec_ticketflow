import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { App as AntdApp } from 'antd'
import { AuthProvider } from '../context/AuthContext'
import SubmitterWorkbench from '../pages/SubmitterWorkbench'
import DispatcherWorkbench from '../pages/DispatcherWorkbench'
import CompleterWorkbench from '../pages/CompleterWorkbench'
import AdminWorkbench from '../pages/AdminWorkbench'
import type { Ticket } from '@ticketflow/shared'

const mockUser = { id: 'u1', username: 'submitter', displayName: '提交者', role: 'submitter' as const, createdAt: '2026-01-01T00:00:00Z' }

const mockTickets = [
  { id: '1', title: 'Ticket A', description: '', status: 'submitted', priority: 'high', dueDate: null, createdBy: 'submitter', assignedTo: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '2', title: 'Ticket B', description: '', status: 'assigned', priority: 'medium', dueDate: '2026-06-01', createdBy: 'dispatcher', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '3', title: 'Ticket C', description: '', status: 'submitted', priority: 'low', dueDate: null, createdBy: 'dispatcher', assignedTo: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '4', title: 'Ticket D', description: '', status: 'in_progress', priority: 'high', dueDate: null, createdBy: 'submitter', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '5', title: 'Ticket E', description: '', status: 'assigned', priority: 'medium', dueDate: null, createdBy: 'dispatcher', assignedTo: 'other_person', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '6', title: 'Ticket F', description: 'A detailed description for ticket F', status: 'completed', priority: 'low', dueDate: null, createdBy: 'submitter', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]

const mockUsers = [
  { username: 'submitter', displayName: '提交者', role: 'submitter', id: 'u1', createdAt: '2026-01-01T00:00:00Z' },
  { username: 'dispatcher', displayName: '调度者', role: 'dispatcher', id: 'u2', createdAt: '2026-01-01T00:00:00Z' },
  { username: 'completer', displayName: '完成者', role: 'completer', id: 'u3', createdAt: '2026-01-01T00:00:00Z' },
]

const mockHistory = [
  { id: 'h1', ticketId: '6', action: 'created' as const, actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'h2', ticketId: '6', action: 'assigned' as const, actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: '{"assignee":"completer"}', createdAt: '2026-01-02T00:00:00Z' },
]

function renderPage(path: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ConfigProvider>
        <AntdApp>
          <AuthProvider>{element}</AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </MemoryRouter>,
  )
}

describe('AdminWorkbench', () => {
  const mockAdminUser = { id: 'u-admin', username: 'admin', displayName: '管理员', role: 'admin' as const, createdAt: '2026-01-01T00:00:00Z' }

  const mockUserList = [
    { id: 'u1', username: 'alice', displayName: 'Alice', role: 'submitter', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'u2', username: 'bob', displayName: 'Bob', role: 'dispatcher', createdAt: '2026-01-02T00:00:00Z' },
  ]

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAdminUser) } as Response)
      }
      if (urlStr === '/api/admin/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserList) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders user list in table', async () => {
    renderPage('/workbench/admin', <AdminWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('用户管理')).toBeInTheDocument()
  })

  it('opens create modal on "新增用户" button click', async () => {
    renderPage('/workbench/admin', <AdminWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('新增用户'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创/ })).toBeInTheDocument()
    })
  })

  it('shows Popconfirm on delete click', async () => {
    renderPage('/workbench/admin', <AdminWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('删除')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定删除此用户？')).toBeInTheDocument()
    })
  })

  it('creates user via modal form and calls POST API', async () => {
    let postBody: string | null = null
    vi.unstubAllGlobals()
    const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAdminUser) } as Response)
      }
      if (urlStr === '/api/admin/users' && init?.method === 'POST') {
        postBody = init.body as string
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: 'u-new', username: 'charlie', displayName: 'Charlie', role: 'completer', createdAt: '2026-01-01T00:00:00Z' }) } as Response)
      }
      if (urlStr === '/api/admin/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserList) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPage('/workbench/admin', <AdminWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('新增用户'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创/ })).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('用户名（不可修改）'), { target: { value: 'charlie' } })
    fireEvent.change(screen.getByPlaceholderText('显示名'), { target: { value: 'Charlie' } })
    fireEvent.change(screen.getByPlaceholderText('输入密码'), { target: { value: 'pass123' } })

    fireEvent.click(screen.getByRole('button', { name: /创/ }))

    await waitFor(() => {
      expect(postBody).not.toBeNull()
    })

    const body = JSON.parse(postBody!)
    expect(body.username).toBe('charlie')
    expect(body.displayName).toBe('Charlie')
    expect(body.role).toBe('submitter')
    expect(body.password).toBe('pass123')
  })

  it('edits user via modal form and calls PATCH API', async () => {
    let patchBody: string | null = null
    vi.unstubAllGlobals()
    const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAdminUser) } as Response)
      }
      if (urlStr === '/api/admin/users/alice' && init?.method === 'PATCH') {
        patchBody = init.body as string
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'u1', username: 'alice', displayName: 'Updated Alice', role: 'dispatcher', createdAt: '2026-01-01T00:00:00Z' }) } as Response)
      }
      if (urlStr === '/api/admin/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserList) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPage('/workbench/admin', <AdminWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('编辑')[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /保/ })).toBeInTheDocument()
    })

    // Clear displayName and type new
    const displayNameInput = screen.getByPlaceholderText('显示名')
    fireEvent.change(displayNameInput, { target: { value: 'Updated Alice' } })

    fireEvent.click(screen.getByRole('button', { name: /保/ }))

    await waitFor(() => {
      expect(patchBody).not.toBeNull()
    })

    const body = JSON.parse(patchBody!)
    expect(body.displayName).toBe('Updated Alice')
  })

  it('deletes user via Popconfirm confirm and calls DELETE API', async () => {
    let deleteCalled = false
    vi.unstubAllGlobals()
    const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAdminUser) } as Response)
      }
      if (urlStr === '/api/admin/users/alice' && init?.method === 'DELETE') {
        deleteCalled = true
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)
      }
      if (urlStr === '/api/admin/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserList) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPage('/workbench/admin', <AdminWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('删除')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定删除此用户？')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /确/ }))

    await waitFor(() => {
      expect(deleteCalled).toBe(true)
    })
  })
})

describe('Workbench filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTickets),
      } as Response)
    })
  })

  it('SubmitterWorkbench only shows createdBy=submitter tickets', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getByText('Ticket D')).toBeInTheDocument()
    expect(screen.getByText('Ticket F')).toBeInTheDocument()
    expect(screen.queryByText('Ticket B')).not.toBeInTheDocument()
    expect(screen.queryByText('Ticket C')).not.toBeInTheDocument()
  })

  it('DispatcherWorkbench shows all non-completed tickets', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getByText('Ticket B')).toBeInTheDocument()
    expect(screen.getByText('Ticket C')).toBeInTheDocument()
    expect(screen.getByText('Ticket D')).toBeInTheDocument()
    expect(screen.getByText('Ticket E')).toBeInTheDocument()
    expect(screen.queryByText('Ticket F')).not.toBeInTheDocument()
  })

  it('CompleterWorkbench only shows assignedTo=completer and status=assigned|in_progress', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'completer', role: 'completer' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
    renderPage('/workbench/completer', <CompleterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket B')).toBeInTheDocument()
    })
    expect(screen.getByText('Ticket D')).toBeInTheDocument()
    expect(screen.queryByText('Ticket E')).not.toBeInTheDocument()
  })
})

describe('Workbench ticket detail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTickets),
      } as Response)
    })
  })

  it('SubmitterWorkbench shows ticket detail in Drawer with Timeline on click', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })

    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket F')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Ticket F'))

    await waitFor(() => {
      expect(screen.getByText('A detailed description for ticket F')).toBeInTheDocument()
      expect(screen.getByText('创建工单')).toBeInTheDocument()
      expect(screen.getByText('指派')).toBeInTheDocument()
    })
  })
})

describe('Priority display', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
  })

  it('shows priority tags in table', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getAllByText('高').length).toBeGreaterThan(0)
  })

  it('Dispatcher shows priority tags', async () => {
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getAllByText('高').length).toBeGreaterThan(0)
    expect(screen.getAllByText('中').length).toBeGreaterThan(0)
  })
})

describe('Status label display', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
  })

  it('shows Chinese status labels in SubmitterWorkbench table', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getByText('已提交')).toBeInTheDocument()
  })

  it('shows Chinese status labels in DispatcherWorkbench table', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getAllByText('已提交').length).toBeGreaterThan(0)
  })
})

describe('Completer dynamic filtering', () => {
  it('filters by logged-in completer username not hardcoded string', async () => {
    vi.restoreAllMocks()
    const customCompleter = { id: 'u-custom', username: 'worker99', displayName: 'Worker', role: 'completer' as const, createdAt: '2026-01-01T00:00:00Z' }
    const customTickets = [
      { id: '1', title: 'My Task', description: '', status: 'assigned', priority: 'high', dueDate: null, createdBy: 'submitter', assignedTo: 'worker99', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'Other Task', description: '', status: 'assigned', priority: 'medium', dueDate: null, createdBy: 'submitter', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ]
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(customCompleter) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(customTickets) } as Response)
    })
    renderPage('/workbench/completer', <CompleterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('My Task')).toBeInTheDocument()
    })
    expect(screen.queryByText('Other Task')).not.toBeInTheDocument()
  })
})

describe('Dispatcher assignee dropdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
  })

  it('shows only completer users in assignee dropdown', async () => {
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })
    expect(screen.getAllByText('完成者').length).toBeGreaterThan(0)
    expect(screen.queryByText('提交者')).not.toBeInTheDocument()
    expect(screen.queryByText('调度者')).not.toBeInTheDocument()
  })
})

describe('Dispatcher reassign', () => {
  const mockUsersWithTwoCompleters = [
    { username: 'submitter', displayName: '提交者', role: 'submitter', id: 'u1', createdAt: '2026-01-01T00:00:00Z' },
    { username: 'dispatcher', displayName: '调度者', role: 'dispatcher', id: 'u2', createdAt: '2026-01-01T00:00:00Z' },
    { username: 'completer', displayName: '完成者', role: 'completer', id: 'u3', createdAt: '2026-01-01T00:00:00Z' },
    { username: 'completer2', displayName: '完成者2', role: 'completer', id: 'u4', createdAt: '2026-01-01T00:00:00Z' },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsersWithTwoCompleters) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/assign') && init?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
  })

  it('shows reassign Select and Button for assigned tickets', async () => {
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket B')).toBeInTheDocument()
    })
    // Ticket B and E are assigned, should have "重新指派" buttons
    const reassignButtons = screen.getAllByText('重新指派')
    expect(reassignButtons.length).toBeGreaterThanOrEqual(2)
    // Should not have old plain text
    expect(screen.queryByText('已指派给 completer')).not.toBeInTheDocument()
  })

  it('refreshes list after successful reassign', async () => {
    let assignCalled = false
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsersWithTwoCompleters) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/assign') && init?.method === 'PATCH') {
        assignCalled = true
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)
      }
      // Return fresh tickets after reassign
      if (assignCalled && urlStr === '/api/tickets') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTickets.map((t) => t.id === '2' ? { ...t, assignedTo: 'completer2' } : t)),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })

    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket B')).toBeInTheDocument()
    })
    fireEvent.click(screen.getAllByText('重新指派')[0])
    await waitFor(() => {
      expect(assignCalled).toBe(true)
    })
  })

  it('shows error when reassigning to same user', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsersWithTwoCompleters) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/assign') && init?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: '工单已指派给该用户' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })

    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket B')).toBeInTheDocument()
    })
    fireEvent.click(screen.getAllByText('重新指派')[0])

    await waitFor(() => {
      expect(screen.getByText('工单已指派给该用户')).toBeInTheDocument()
    })
  })
})

describe('Workbench pagination', () => {
  const manyTickets = Array.from({ length: 25 }, (_, i) => ({
    id: `${i + 1}`,
    title: `Ticket ${i + 1}`,
    description: '',
    status: (i % 4 === 0 ? 'submitted' : i % 4 === 1 ? 'assigned' : i % 4 === 2 ? 'in_progress' : 'completed') as Ticket['status'],
    priority: (i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low') as Ticket['priority'],
    dueDate: null,
    createdBy: 'submitter',
    assignedTo: i % 2 === 0 ? 'completer' : null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }))

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(manyTickets) } as Response)
    })
  })

  it('shows pagination controls in SubmitterWorkbench', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket 1')).toBeInTheDocument()
    })

    // With 25 tickets, pagination should show page size selector and total
    expect(screen.getByText(/25/)).toBeInTheDocument()
  })

  it('shows pagination controls in DispatcherWorkbench', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(manyTickets) } as Response)
    })
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket 1')).toBeInTheDocument()
    })

    // Pagination controls should exist
    const pageSizeOptions = document.querySelector('.ant-pagination-options')
    expect(pageSizeOptions).toBeTruthy()
  })
})

describe('Workbench status filter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
  })

  it('status column has filter dropdown in SubmitterWorkbench', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })

    // The filter icon should be rendered on the status column header
    const filterTriggers = document.querySelectorAll('.ant-table-filter-trigger')
    expect(filterTriggers.length).toBeGreaterThan(0)
  })

  it('status column has filter dropdown in DispatcherWorkbench', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })

    const filterTriggers = document.querySelectorAll('.ant-table-filter-trigger')
    expect(filterTriggers.length).toBeGreaterThan(0)
  })
})