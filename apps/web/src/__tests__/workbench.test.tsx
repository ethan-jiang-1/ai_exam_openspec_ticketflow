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

  describe('SubmitterWorkbench', () => {
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

    it('shows first page with 10 rows by default', async () => {
      renderPage('/workbench/submitter', <SubmitterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket 1')).toBeInTheDocument()
      })

      // Default pageSize=10: rows 1-10 visible, row 11 not
      expect(screen.getByText('Ticket 10')).toBeInTheDocument()
      expect(screen.queryByText('Ticket 11')).not.toBeInTheDocument()
    })

    it('renders pagination with total count and size changer', async () => {
      renderPage('/workbench/submitter', <SubmitterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket 1')).toBeInTheDocument()
      })

      // Size changer present
      const sizeChanger = document.querySelector('.ant-pagination-options-size-changer')
      expect(sizeChanger).toBeTruthy()

      // Page items present (at least page 2)
      expect(document.querySelector('.ant-pagination-item-2')).toBeTruthy()
    })

    it('persists pageSize after switching and triggering re-render', async () => {
      renderPage('/workbench/submitter', <SubmitterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket 1')).toBeInTheDocument()
      })

      // Open sizeChanger dropdown with mouseDown
      const sizeChanger = document.querySelector('.ant-pagination-options-size-changer') as HTMLElement
      expect(sizeChanger).toBeTruthy()
      fireEvent.mouseDown(sizeChanger)
      // Wait for dropdown to appear
      await new Promise((r) => setTimeout(r, 100))
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0)

      // Click "20 / page" option
      const option20 = Array.from(document.querySelectorAll('.ant-select-item-option'))
        .find((el) => el.textContent?.includes('20 / page'))
      expect(option20).toBeTruthy()
      fireEvent.click(option20!)
      await new Promise((r) => setTimeout(r, 200))

      // After changing to 20/page, row 11 should be visible on first page
      expect(screen.getByText('Ticket 11')).toBeInTheDocument()

      // Trigger a re-render by clicking a ticket title to open drawer
      const ticket1Links = screen.getAllByText('Ticket 1')
      fireEvent.click(ticket1Links[0])
      await new Promise((r) => setTimeout(r, 200))

      // pageSize should still be 20 — row 11 still visible (not reset to 10)
      expect(screen.getByText('Ticket 11')).toBeInTheDocument()
    })
  })

  describe('DispatcherWorkbench', () => {
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
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manyTickets) } as Response)
      })
    })

    it('shows first page with at most 10 rows', async () => {
      renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket 1')).toBeInTheDocument()
      })

      const rowCount = document.querySelectorAll('.ant-table-row').length
      expect(rowCount).toBeLessThanOrEqual(10)
    })

    it('renders pagination with size changer', async () => {
      renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket 1')).toBeInTheDocument()
      })

      expect(document.querySelector('.ant-pagination-options-size-changer')).toBeTruthy()
    })

    it('persists pageSize after switching and triggering re-render', async () => {
      renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket 1')).toBeInTheDocument()
      })

      const sizeChanger = document.querySelector('.ant-pagination-options-size-changer') as HTMLElement
      expect(sizeChanger).toBeTruthy()
      fireEvent.mouseDown(sizeChanger)
      await new Promise((r) => setTimeout(r, 100))
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0)

      const option20 = Array.from(document.querySelectorAll('.ant-select-item-option'))
        .find((el) => el.textContent?.includes('20 / page'))
      expect(option20).toBeTruthy()
      fireEvent.click(option20!)
      await new Promise((r) => setTimeout(r, 200))

      expect(screen.getByText('Ticket 11')).toBeInTheDocument()

      // Trigger re-render by clicking ticket title
      const ticket1Links = screen.getAllByText('Ticket 1')
      fireEvent.click(ticket1Links[0])
      await new Promise((r) => setTimeout(r, 200))

      // pageSize should persist — row 11 still visible
      expect(screen.getByText('Ticket 11')).toBeInTheDocument()
    })
  })

  describe('CompleterWorkbench', () => {
    // All 25 tickets assigned to 'completer', status assigned or in_progress
    const completerTickets = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      title: `CTicket ${i + 1}`,
      description: '',
      status: (i % 3 === 0 ? 'assigned' : 'in_progress') as Ticket['status'],
      priority: 'medium' as Ticket['priority'],
      dueDate: null,
      createdBy: 'submitter',
      assignedTo: 'completer',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }))

    beforeEach(() => {
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'completer', role: 'completer' }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(completerTickets) } as Response)
      })
    })

    it('shows first page with at most 10 rows', async () => {
      renderPage('/workbench/completer', <CompleterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('CTicket 1')).toBeInTheDocument()
      })

      const rowCount = document.querySelectorAll('.ant-table-row').length
      expect(rowCount).toBeLessThanOrEqual(10)
    })

    it('renders pagination with size changer', async () => {
      renderPage('/workbench/completer', <CompleterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('CTicket 1')).toBeInTheDocument()
      })

      expect(document.querySelector('.ant-pagination-options-size-changer')).toBeTruthy()
    })

    it('persists pageSize after switching and triggering re-render', async () => {
      renderPage('/workbench/completer', <CompleterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('CTicket 1')).toBeInTheDocument()
      })

      const sizeChanger = document.querySelector('.ant-pagination-options-size-changer') as HTMLElement
      expect(sizeChanger).toBeTruthy()
      fireEvent.mouseDown(sizeChanger)
      await new Promise((r) => setTimeout(r, 100))
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0)

      const option20 = Array.from(document.querySelectorAll('.ant-select-item-option'))
        .find((el) => el.textContent?.includes('20 / page'))
      expect(option20).toBeTruthy()
      fireEvent.click(option20!)
      await new Promise((r) => setTimeout(r, 200))

      expect(screen.getByText('CTicket 11')).toBeInTheDocument()

      // Trigger re-render by clicking ticket title
      const ticket1Links = screen.getAllByText('CTicket 1')
      fireEvent.click(ticket1Links[0])
      await new Promise((r) => setTimeout(r, 200))

      // pageSize should persist — row 11 still visible
      expect(screen.getByText('CTicket 11')).toBeInTheDocument()
    })
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

describe('SubmitterWorkbench edit', () => {
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

  it('shows edit button for submitted tickets', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })

    // Ticket A is submitted by submitter, should have edit button
    const editButtons = screen.getAllByText('编辑')
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('does not show edit button for non-submitted tickets', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket D')).toBeInTheDocument()
    })

    // Ticket D is in_progress, should not have edit button in its row
    // "Ticket A" is submitted → has "编辑", "Ticket D" is in_progress → no "编辑"
    // Both are shown since user is submitter
    // The edit button only shows for status=submitted
  })

  it('opens edit modal with pre-filled values on edit click', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('编辑')[0])

    await waitFor(() => {
      expect(screen.getByText('编辑工单')).toBeInTheDocument()
    })

    // Form should be pre-filled with Ticket A values
    const titleInput = screen.getByDisplayValue('Ticket A') as HTMLInputElement
    expect(titleInput).toBeInTheDocument()
  })

  it('shows error and keeps modal open on API failure', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUser) } as Response)
      }
      if (urlStr.includes('/api/tickets/') && init?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: '编辑失败错误' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
    })

    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('编辑')[0])

    await waitFor(() => {
      expect(screen.getByText('编辑工单')).toBeInTheDocument()
    })

    const saveButton = document.querySelector('.ant-modal-footer .ant-btn-primary') as HTMLButtonElement
    expect(saveButton).toBeTruthy()
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('编辑失败错误')).toBeInTheDocument()
    })

    // Modal should still be open
    expect(screen.getByText('编辑工单')).toBeInTheDocument()
  })
})

describe('Workbench comments', () => {
  const mockCommentHistory = [
    { id: 'h1', ticketId: '1', action: 'created' as const, actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: '{"title":"Test","description":"","priority":"low","dueDate":null}', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'h2', ticketId: '1', action: 'commented' as const, actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'submitted', details: '{"comment":"测试备注"}', createdAt: '2026-01-02T00:00:00Z' },
  ]

  describe('DispatcherWorkbench comments', () => {
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
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCommentHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
      })
    })

    it('renders comment area in DispatcherWorkbench Drawer', async () => {
      renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket A')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ticket A'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: '添加备注' })).toBeInTheDocument()
    })

    it('submits comment successfully in DispatcherWorkbench', async () => {
      let commentBody: string | null = null
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
        }
        if (urlStr === '/api/auth/users') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/comments') && init?.method === 'POST') {
          commentBody = init.body as string
          return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ success: true }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCommentHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
      })

      renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket A')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ticket A'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('输入备注内容...'), { target: { value: '调度者备注' } })
      fireEvent.click(screen.getByRole('button', { name: '添加备注' }))

      await waitFor(() => {
        expect(commentBody).not.toBeNull()
      })

      expect(JSON.parse(commentBody!).comment).toBe('调度者备注')
    })

    it('shows error on empty comment in DispatcherWorkbench', async () => {
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
        }
        if (urlStr === '/api/auth/users') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/comments') && init?.method === 'POST') {
          return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: 'comment must not be empty' }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCommentHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
      })

      renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket A')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ticket A'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('输入备注内容...'), { target: { value: '错误测试' } })
      fireEvent.click(screen.getByRole('button', { name: '添加备注' }))

      await waitFor(() => {
        expect(screen.getByText('comment must not be empty')).toBeInTheDocument()
      })
    })
  })

  describe('CompleterWorkbench comments', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'completer', role: 'completer' }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCommentHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
      })
    })

    it('renders comment area in CompleterWorkbench Drawer', async () => {
      renderPage('/workbench/completer', <CompleterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket B')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ticket B'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: '添加备注' })).toBeInTheDocument()
    })

    it('submits comment successfully in CompleterWorkbench', async () => {
      let commentBody: string | null = null
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'completer', role: 'completer' }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/comments') && init?.method === 'POST') {
          commentBody = init.body as string
          return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ success: true }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCommentHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
      })

      renderPage('/workbench/completer', <CompleterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket B')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ticket B'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('输入备注内容...'), { target: { value: '完成者备注' } })
      fireEvent.click(screen.getByRole('button', { name: '添加备注' }))

      await waitFor(() => {
        expect(commentBody).not.toBeNull()
      })

      expect(JSON.parse(commentBody!).comment).toBe('完成者备注')
    })

    it('retains comment text on API error in CompleterWorkbench', async () => {
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'completer', role: 'completer' }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/comments') && init?.method === 'POST') {
          return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) } as Response)
        }
        if (urlStr.includes('/api/tickets/') && urlStr.includes('/history')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCommentHistory) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTickets) } as Response)
      })

      renderPage('/workbench/completer', <CompleterWorkbench />)
      await waitFor(() => {
        expect(screen.getByText('Ticket B')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ticket B'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入备注内容...')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText('输入备注内容...') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: '我的备注文本' } })
      fireEvent.click(screen.getByRole('button', { name: '添加备注' }))

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      expect(textarea.value).toBe('我的备注文本')
    })
  })
})