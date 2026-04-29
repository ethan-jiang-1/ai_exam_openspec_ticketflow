import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoleProvider } from '../context/RoleContext'
import SubmitterWorkbench from '../pages/SubmitterWorkbench'
import DispatcherWorkbench from '../pages/DispatcherWorkbench'
import CompleterWorkbench from '../pages/CompleterWorkbench'

const mockTickets = [
  { id: '1', title: 'Ticket A', description: '', status: 'submitted', createdBy: 'submitter', assignedTo: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '2', title: 'Ticket B', description: '', status: 'assigned', createdBy: 'dispatcher', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '3', title: 'Ticket C', description: '', status: 'submitted', createdBy: 'dispatcher', assignedTo: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '4', title: 'Ticket D', description: '', status: 'in_progress', createdBy: 'submitter', assignedTo: 'completer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '5', title: 'Ticket E', description: '', status: 'assigned', createdBy: 'dispatcher', assignedTo: 'other_person', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]

function renderPage(path: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RoleProvider>{element}</RoleProvider>
    </MemoryRouter>,
  )
}

describe('Workbench filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTickets),
    } as Response)
  })

  it('SubmitterWorkbench only shows createdBy=submitter tickets', async () => {
    renderPage('/workbench/submitter', <SubmitterWorkbench />)
    await waitFor(() => {
      const items = screen.getAllByRole('row')
      expect(items).toHaveLength(3) // header + 2 data rows
    })
    expect(screen.getByText('Ticket A')).toBeInTheDocument()
    expect(screen.getByText('Ticket D')).toBeInTheDocument()
  })

  it('DispatcherWorkbench only shows status=submitted tickets', async () => {
    renderPage('/workbench/dispatcher', <DispatcherWorkbench />)
    await waitFor(() => {
      const items = screen.getAllByRole('row')
      expect(items).toHaveLength(3) // header + 2 data rows
    })
    expect(screen.getByText('Ticket A')).toBeInTheDocument()
    expect(screen.getByText('Ticket C')).toBeInTheDocument()
  })

  it('CompleterWorkbench only shows assignedTo=completer and status=assigned|in_progress', async () => {
    renderPage('/workbench/completer', <CompleterWorkbench />)
    await waitFor(() => {
      const items = screen.getAllByRole('row')
      expect(items).toHaveLength(3) // header + 2 data rows
    })
    expect(screen.getByText('Ticket B')).toBeInTheDocument()
    expect(screen.getByText('Ticket D')).toBeInTheDocument()
    expect(screen.queryByText('Ticket E')).not.toBeInTheDocument()
  })
})
