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

describe('LoginPage', () => {
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

    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('提交者')).toBeInTheDocument()
    })
    expect(screen.getByText('调度者')).toBeInTheDocument()
    expect(screen.getByText('完成者')).toBeInTheDocument()
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

    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('提交者')).toBeInTheDocument()
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

    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('选择用户登录')).toBeInTheDocument()
    })
  })
})
