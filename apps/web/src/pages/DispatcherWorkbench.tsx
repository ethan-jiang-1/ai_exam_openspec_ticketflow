import { useState, useEffect } from 'react'
import { getTickets, assignTicket } from '../api/client'
import type { Ticket } from '@ticketflow/shared'

export default function DispatcherWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [assignInputs, setAssignInputs] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async () => {
    try {
      setError(null)
      const all = await getTickets()
      setTickets(all.filter((t) => t.status === 'submitted'))
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleAssign = async (id: string) => {
    const assignedTo = assignInputs[id]?.trim()
    if (!assignedTo) return
    try {
      setError(null)
      await assignTicket(id, assignedTo)
      setAssignInputs((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
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
        <p className="empty-hint">暂无待指派的工单</p>
      ) : (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>创建者</th>
              <th>创建时间</th>
              <th>指派给</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.createdBy}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  <input
                    type="text"
                    placeholder="指派人"
                    value={assignInputs[t.id] || ''}
                    onChange={(e) =>
                      setAssignInputs((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn"
                    onClick={() => handleAssign(t.id)}
                    disabled={!assignInputs[t.id]?.trim()}
                  >
                    指派
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
