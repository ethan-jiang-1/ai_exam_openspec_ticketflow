import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import { AuthProvider } from '../context/AuthContext'

function renderAuthProvider() {
  return render(
    <MemoryRouter>
      <ConfigProvider>
        <AntdApp>
          <AuthProvider>
            <div>child</div>
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </MemoryRouter>,
  )
}

describe('AuthContext - 401 interception', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs out and redirects on auth:expired event', async () => {
    const logoutFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })

    // Mock /api/auth/me to return a logged-in user
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'u1', username: 'submitter', displayName: '提交者', role: 'submitter' }),
        } as Response)
      }
      if (urlStr === '/api/auth/logout') {
        return logoutFetch(url, init)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    })

    // Mock window.location
    const locationMock = { href: '' }
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
    })

    renderAuthProvider()

    // Wait for initial auth check to complete
    await waitFor(() => {
      expect(locationMock.href).toBe('')
    })

    // Dispatch auth:expired event
    window.dispatchEvent(new CustomEvent('auth:expired'))

    // Should trigger logout and redirect
    await waitFor(() => {
      expect(logoutFetch).toHaveBeenCalled()
      expect(locationMock.href).toBe('/login?expired=1')
    })
  })

  it('deduplicates repeated auth:expired events', async () => {
    const logoutFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'u1', username: 'submitter', displayName: '提交者', role: 'submitter' }),
        } as Response)
      }
      if (urlStr === '/api/auth/logout') {
        return logoutFetch(url, init)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    })

    const locationMock = { href: '' }
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
    })

    renderAuthProvider()

    await waitFor(() => {
      expect(locationMock.href).toBe('')
    })

    // Dispatch twice in quick succession
    window.dispatchEvent(new CustomEvent('auth:expired'))
    window.dispatchEvent(new CustomEvent('auth:expired'))

    await waitFor(() => {
      expect(logoutFetch).toHaveBeenCalledTimes(1)
    })
  })
})
