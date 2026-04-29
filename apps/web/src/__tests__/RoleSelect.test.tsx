import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoleProvider } from '../context/RoleContext'
import RoleSelect from '../pages/RoleSelect'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <RoleProvider>{ui}</RoleProvider>
    </MemoryRouter>,
  )
}

describe('RoleSelect', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders three role buttons', () => {
    renderWithProviders(<RoleSelect />)
    expect(screen.getByText('提交者')).toBeInTheDocument()
    expect(screen.getByText('调度者')).toBeInTheDocument()
    expect(screen.getByText('完成者')).toBeInTheDocument()
  })

  it('writes role to localStorage on click and navigates', () => {
    renderWithProviders(<RoleSelect />)
    fireEvent.click(screen.getByText('提交者'))
    expect(localStorage.getItem('ticketflow-role')).toBe('submitter')
  })

  it('auto-redirects when role already exists', () => {
    localStorage.setItem('ticketflow-role', 'dispatcher')
    renderWithProviders(<RoleSelect />)
    expect(localStorage.getItem('ticketflow-role')).toBe('dispatcher')
  })

  it('stays on page when role is invalid', () => {
    localStorage.setItem('ticketflow-role', 'invalid_role')
    renderWithProviders(<RoleSelect />)
    expect(screen.getByText('选择角色')).toBeInTheDocument()
  })
})
