import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { App as AntdApp } from 'antd'
import { AuthProvider } from '../context/AuthContext'
import SubmitterWorkbench from '../pages/SubmitterWorkbench'
import DispatcherWorkbench from '../pages/DispatcherWorkbench'
import CompleterWorkbench from '../pages/CompleterWorkbench'

const mockUser = { id: 'u1', username: 'submitter', displayName: '提交者', role: 'submitter' as const, createdAt: '2026-01-01T00:00:00Z' }

const mockTickets = [
  { id: '1', title: 'Ticket A', description: '', status: 'submitted', createdBy: 'submitter', assignedTo: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '2', title: 'Ticket B', description: '', status: 'assigned', createdBy: 'dispatcher', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '3', title: 'Ticket C', description: '', status: 'submitted', createdBy: 'dispatcher', assignedTo: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '4', title: 'Ticket D', description: '', status: 'in_progress', createdBy: 'submitter', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '5', title: 'Ticket E', description: '', status: 'assigned', createdBy: 'dispatcher', assignedTo: 'other_person', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '6', title: 'Ticket F', description: 'A detailed description for ticket F', status: 'completed', createdBy: 'submitter', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
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

describe('Workbench filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Mock /api/auth/me to return logged-in user
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
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockUser, username: 'dispatcher', role: 'dispatcher' }) } as Response)
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

  it('SubmitterWorkbench shows ticket detail in Drawer on click', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      expect(screen.getByText('Ticket F')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Ticket F'))

    await waitFor(() => {
      expect(screen.getByText('A detailed description for ticket F')).toBeInTheDocument()
    })
  })
})
