import { useState, useEffect } from 'react'
import { getTickets, assignTicket } from '../api/client'
import type { Ticket } from '@ticketflow/shared'

export default function DispatcherWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async () => {
    try {
      setError(null)
      const all = await getTickets()
      setTickets(all.filter((t) => t.status !== 'completed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleAssign = async (id: string) => {
    try {
      setError(null)
      await assignTicket(id, 'completer')
      await fetchTickets()
    } catch (e) {
      setError(e instanceof Error ? e.message : '指派失败')
    }
  }

  return (
    <div>
      <h2>调度者工作台</h2>

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
                <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                <td>{t.createdBy}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  {t.status === 'submitted' && (
                    <button className="btn" onClick={() => handleAssign(t.id)}>
                      指派给 completer
                    </button>
                  )}
                  {t.status === 'assigned' && (
                    <span>已指派给 {t.assignedTo}</span>
                  )}
                  {t.status === 'in_progress' && (
                    <span>处理中（已指派给 {t.assignedTo}）</span>
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
