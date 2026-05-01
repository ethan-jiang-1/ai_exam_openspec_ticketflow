import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { App as AntdApp } from 'antd'
import { AuthProvider, useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import DashboardPage from '../pages/DashboardPage'
import type { DashboardData } from '@ticketflow/shared'

// Replicate App.tsx's DashboardGuard since it's not exported
function DashboardGuard() {
  const { user } = useAuth()
  if (user && (user.role === 'submitter' || user.role === 'completer')) {
    return <Navigate to={`/workbench/${user.role}`} replace />
  }
  return <DashboardPage />
}

const mockDashboardData: DashboardData = {
  overview: {
    total: 50,
    createdThisWeek: 12,
    completedThisWeek: 8,
    pending: 20,
    priorityDistribution: { high: 5, medium: 10, low: 5 },
  },
  efficiency: {
    avgResponseMinutes: 45,
    avgProcessMinutes: 120,
    reassignCount: 5,
  },
  workload: [
    { username: 'completer', displayName: '完成者', assignedCount: 5, inProgressCount: 3, completedThisWeekCount: 4 },
    { username: 'completer2', displayName: '完成者2', assignedCount: 3, inProgressCount: 1, completedThisWeekCount: 2 },
  ],
  recentActivity: [
    {
      id: 'h1',
      ticketId: 't1',
      ticketTitle: '修复登录页样式',
      action: 'completed',
      actor: 'completer',
      actorDisplayName: '完成者',
      toStatus: 'completed',
      createdAt: '2026-05-01T10:30:00.000Z',
    },
    {
      id: 'h2',
      ticketId: 't2',
      ticketTitle: '数据导出报错',
      action: 'assigned',
      actor: 'dispatcher',
      actorDisplayName: '调度者',
      toStatus: 'assigned',
      createdAt: '2026-05-01T10:15:00.000Z',
    },
  ],
}

const mockTicket = {
  id: 't1',
  title: '修复登录页样式',
  description: '登录页在某些分辨率下样式错乱',
  status: 'completed' as const,
  priority: 'high' as const,
  dueDate: null,
  createdBy: 'submitter',
  assignedTo: 'completer',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:30:00.000Z',
}

function createFetchMock(user: { id: string; username: string; displayName: string; role: string; createdAt: string }, dashboardOverride?: Partial<DashboardData>) {
  const dashData = { ...mockDashboardData, ...dashboardOverride }
  return vi.fn((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
    if (urlStr === '/api/auth/me') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(user) } as Response)
    }
    if (urlStr === '/api/dashboard') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(dashData) } as Response)
    }
    if (urlStr === '/api/tickets/t1') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTicket) } as Response)
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
  })
}

function renderInRouter(element: React.ReactElement, initialRoute = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ConfigProvider>
        <AntdApp>
          <AuthProvider>{element}</AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </MemoryRouter>,
  )
}

const adminUser = { id: 'u-admin', username: 'admin', displayName: '管理员', role: 'admin' as const, createdAt: '2026-01-01T00:00:00Z' }
const dispatcherUser = { id: 'u-disp', username: 'dispatcher', displayName: '调度者', role: 'dispatcher' as const, createdAt: '2026-01-01T00:00:00Z' }
const submitterUser = { id: 'u-sub', username: 'submitter', displayName: '提交者', role: 'submitter' as const, createdAt: '2026-01-01T00:00:00Z' }
const completerUser = { id: 'u-comp', username: 'completer', displayName: '完成者', role: 'completer' as const, createdAt: '2026-01-01T00:00:00Z' }

describe('DashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('access control', () => {
    it('admin can view dashboard', async () => {
      vi.stubGlobal('fetch', createFetchMock(adminUser))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('工单总数')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('dispatcher can view dashboard', async () => {
      vi.stubGlobal('fetch', createFetchMock(dispatcherUser))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('工单总数')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('submitter is redirected away from /dashboard', async () => {
      vi.stubGlobal('fetch', createFetchMock(submitterUser))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
          <Route path="/workbench/submitter" element={<div>Submitter Workbench</div>} />
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('Submitter Workbench')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('completer is redirected away from /dashboard', async () => {
      vi.stubGlobal('fetch', createFetchMock(completerUser))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
          <Route path="/workbench/completer" element={<div>Completer Workbench</div>} />
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('Completer Workbench')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('data display', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', createFetchMock(adminUser))
    })

    it('renders KPI cards with values', async () => {
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('工单总数')).toBeInTheDocument()
      })
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('shows completion rate gauge', async () => {
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('完成率')).toBeInTheDocument()
      })
    })

    it('shows efficiency stats', async () => {
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('平均响应时间')).toBeInTheDocument()
      })
      expect(screen.getByText('平均处理时间')).toBeInTheDocument()
      expect(screen.getByText('本周改派次数')).toBeInTheDocument()
    })

    it('shows workload table', async () => {
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('人员负载')).toBeInTheDocument()
      }, { timeout: 5000 })
      expect(screen.getByText('完成者2')).toBeInTheDocument()
    })

    it('shows recent activity timeline with ticket titles', async () => {
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('"修复登录页样式"')).toBeInTheDocument()
      }, { timeout: 5000 })
      expect(screen.getByText('"数据导出报错"')).toBeInTheDocument()
    })

    it('clicking ticket title triggers drawer', async () => {
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('"修复登录页样式"')).toBeInTheDocument()
      }, { timeout: 5000 })
      fireEvent.click(screen.getByText('"修复登录页样式"'))
      await waitFor(() => {
        expect(screen.getByText('已完成')).toBeInTheDocument()
      })
    })

    it('shows empty state when no recent activity', async () => {
      vi.unstubAllGlobals()
      vi.stubGlobal('fetch', createFetchMock(adminUser, { recentActivity: [] }))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('暂无动态')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('handles API failure without white screen', async () => {
      vi.unstubAllGlobals()
      vi.stubGlobal('fetch', vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr === '/api/auth/me') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(adminUser) } as Response)
        }
        if (urlStr === '/api/dashboard') {
          return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: '服务器内部错误' }) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
      }))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.queryByText('工单总数')).not.toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('nav button visibility', () => {
    it('admin sees workbench link when on dashboard', async () => {
      vi.stubGlobal('fetch', createFetchMock(adminUser))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('工作台')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('dispatcher sees workbench link when on dashboard', async () => {
      vi.stubGlobal('fetch', createFetchMock(dispatcherUser))
      renderInRouter(
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardGuard />} />
          </Route>
        </Routes>,
      )
      await waitFor(() => {
        expect(screen.getByText('工作台')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('admin sees data panel link when on workbench', async () => {
      vi.stubGlobal('fetch', createFetchMock(adminUser))
      renderInRouter(
        <Routes>
          <Route path="/workbench/admin" element={<Layout />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>,
        '/workbench/admin',
      )
      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument()
      }, { timeout: 5000 })
      expect(screen.getByText('数据面板')).toBeInTheDocument()
    })

    it('dispatcher sees data panel link when on workbench', async () => {
      vi.stubGlobal('fetch', createFetchMock(dispatcherUser))
      renderInRouter(
        <Routes>
          <Route path="/workbench/dispatcher" element={<Layout />}>
            <Route index element={<div>Dispatcher Content</div>} />
          </Route>
        </Routes>,
        '/workbench/dispatcher',
      )
      await waitFor(() => {
        expect(screen.getByText('Dispatcher Content')).toBeInTheDocument()
      }, { timeout: 5000 })
      expect(screen.getByText('数据面板')).toBeInTheDocument()
    })

    it('submitter does not see data panel nav link', async () => {
      vi.stubGlobal('fetch', createFetchMock(submitterUser))
      renderInRouter(
        <Routes>
          <Route path="/workbench/submitter" element={<Layout />}>
            <Route index element={<div>Submitter Content</div>} />
          </Route>
        </Routes>,
        '/workbench/submitter',
      )
      await waitFor(() => {
        expect(screen.getByText('Submitter Content')).toBeInTheDocument()
      }, { timeout: 5000 })
      expect(screen.queryByText('数据面板')).not.toBeInTheDocument()
      expect(screen.queryByText('工作台')).not.toBeInTheDocument()
    })

    it('completer does not see data panel nav link', async () => {
      vi.stubGlobal('fetch', createFetchMock(completerUser))
      renderInRouter(
        <Routes>
          <Route path="/workbench/completer" element={<Layout />}>
            <Route index element={<div>Completer Content</div>} />
          </Route>
        </Routes>,
        '/workbench/completer',
      )
      await waitFor(() => {
        expect(screen.getByText('Completer Content')).toBeInTheDocument()
      }, { timeout: 5000 })
      expect(screen.queryByText('数据面板')).not.toBeInTheDocument()
      expect(screen.queryByText('工作台')).not.toBeInTheDocument()
    })
  })
})
