import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from '../pages/LoginPage'

const mockUsers = [
  { username: 'submitter', displayName: '提交者', role: 'submitter' },
  { username: 'dispatcher', displayName: '调度者', role: 'dispatcher' },
  { username: 'completer', displayName: '完成者', role: 'completer' },
  { username: 'admin', displayName: '管理员', role: 'admin' },
]

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ConfigProvider>
        <AntdApp>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </MemoryRouter>,
  )
}

function mockNotLoggedIn() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
    if (urlStr === '/api/auth/me') {
      return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Not logged in' }) } as Response)
    }
    if (urlStr === '/api/auth/users') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the login form', async () => {
    mockNotLoggedIn()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('TicketFlow')).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登/ })).toBeInTheDocument()
  })

  it('shows validation error when username is empty', async () => {
    mockNotLoggedIn()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'testpass' } })
    fireEvent.click(screen.getByRole('button', { name: /登/ }))

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
    })
  })

  it('shows validation error when password is empty', async () => {
    mockNotLoggedIn()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'submitter' } })
    fireEvent.click(screen.getByRole('button', { name: /登/ }))

    await waitFor(() => {
      expect(screen.getByText('请输入密码')).toBeInTheDocument()
    })
  })

  it('calls login API on form submit', async () => {
    const loginFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'u1', username: 'submitter', displayName: '提交者', role: 'submitter' }),
    } as Response)

    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Not logged in' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      if (urlStr === '/api/auth/login') {
        return loginFetch(url, init)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })

    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'submitter' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'changeme' } })
    fireEvent.click(screen.getByRole('button', { name: /登/ }))

    await waitFor(() => {
      expect(loginFetch).toHaveBeenCalled()
    })

    const callArgs = loginFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body).toEqual({ username: 'submitter', password: 'changeme' })
  })

  it('shows error message on login failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Not logged in' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) } as Response)
      }
      if (urlStr === '/api/auth/login') {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: '密码错误' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })

    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'submitter' } })
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /登/ }))

    await waitFor(() => {
      expect(screen.getByText('密码错误')).toBeInTheDocument()
    })
  })

  it('shows dev dropdown in dev mode', async () => {
    mockNotLoggedIn()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    })

    expect(screen.getByText('开发模式 (Dev Only)')).toBeInTheDocument()
    expect(screen.getByText('快速选择用户 (Dev)')).toBeInTheDocument()
  })

  it('fills username when dev dropdown selection changes', async () => {
    mockNotLoggedIn()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('快速选择用户 (Dev)')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    await waitFor(() => {
      expect(screen.getByText('提交者 (submitter)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('提交者 (submitter)'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('submitter')).toBeInTheDocument()
    })
  })
})
