import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import { AuthProvider } from '../context/AuthContext'
import LoginPageDev from '../pages/LoginPageDev'

const mockUsers = [
  { username: 'submitter', displayName: '提交者', role: 'submitter' },
  { username: 'dispatcher', displayName: '调度者', role: 'dispatcher' },
  { username: 'completer', displayName: '完成者', role: 'completer' },
  { username: 'admin', displayName: '管理员', role: 'admin' },
]

function renderLoginPageDev() {
  return render(
    <MemoryRouter initialEntries={['/login-dev']}>
      <ConfigProvider>
        <AntdApp>
          <AuthProvider>
            <LoginPageDev />
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </MemoryRouter>,
  )
}

describe('LoginPageDev', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows user cards from API', async () => {
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

    renderLoginPageDev()

    await waitFor(() => {
      expect(screen.getAllByText('提交者').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('调度者').length).toBeGreaterThan(0)
    expect(screen.getAllByText('完成者').length).toBeGreaterThan(0)
  })

  it('calls login with password on login button click', async () => {
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

    renderLoginPageDev()

    await waitFor(() => {
      expect(screen.getAllByText('提交者').length).toBeGreaterThan(0)
    })

    const passwordInputs = screen.getAllByPlaceholderText('输入密码')
    fireEvent.change(passwordInputs[0], { target: { value: 'testpass' } })

    const loginButtons = screen.getAllByRole('button', { name: /登/ })
    fireEvent.click(loginButtons[0])

    await waitFor(() => {
      expect(loginFetch).toHaveBeenCalled()
    })
  })

  it('shows heading "选择用户登录"', async () => {
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

    renderLoginPageDev()

    await waitFor(() => {
      expect(screen.getByText('选择用户登录')).toBeInTheDocument()
    })
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

    renderLoginPageDev()

    await waitFor(() => {
      expect(screen.getAllByText('提交者').length).toBeGreaterThan(0)
    })

    const passwordInputs = screen.getAllByPlaceholderText('输入密码')
    fireEvent.change(passwordInputs[0], { target: { value: 'wrong' } })

    const loginButtons = screen.getAllByRole('button', { name: /登/ })
    fireEvent.click(loginButtons[0])

    await waitFor(() => {
      expect(screen.getByText('密码错误')).toBeInTheDocument()
    })
  })

  it('shows error message when getUsers fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Not logged in' }) } as Response)
      }
      if (urlStr === '/api/auth/users') {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    })

    renderLoginPageDev()

    await waitFor(() => {
      expect(screen.getByText('获取用户列表失败')).toBeInTheDocument()
    })
  })
})
