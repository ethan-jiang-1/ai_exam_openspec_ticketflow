import { useState, useEffect } from 'react'
import { getTickets, startTicket, completeTicket } from '../api/client'
import type { Ticket } from '@ticketflow/shared'

export default function CompleterWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async () => {
    try {
      setError(null)
      const all = await getTickets()
      setTickets(
        all.filter(
          (t) =>
            t.assignedTo === 'completer' &&
            (t.status === 'assigned' || t.status === 'in_progress'),
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleStart = async (id: string) => {
    try {
      setError(null)
      await startTicket(id)
      await fetchTickets()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleComplete = async (id: string) => {
    try {
      setError(null)
      await completeTicket(id)
      await fetchTickets()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    }
  }

  return (
    <div>
      <h2>完成者工作台</h2>

      {error && <div className="error-msg">{error}</div>}

      {tickets.length === 0 ? (
        <p className="empty-hint">暂无待处理的工单</p>
      ) : (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>创建者</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.status}</td>
                <td>{t.createdBy}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  {t.status === 'assigned' && (
                    <button className="btn" onClick={() => handleStart(t.id)}>
                      开始处理
                    </button>
                  )}
                  {t.status === 'in_progress' && (
                    <button className="btn" onClick={() => handleComplete(t.id)}>
                      完成
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
