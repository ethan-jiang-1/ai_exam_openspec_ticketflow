import { useState, useEffect, type FormEvent } from 'react'
import { getTickets, createTicket } from '../api/client'
import type { Ticket } from '@ticketflow/shared'

export default function SubmitterWorkbench() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchTickets = async () => {
    try {
      setError(null)
      const all = await getTickets()
      setTickets(all.filter((t) => t.createdBy === 'submitter'))
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取工单失败')
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      setLoading(true)
      setError(null)
      await createTicket({ title: title.trim(), description: description.trim(), createdBy: 'submitter' })
      setTitle('')
      setDescription('')
      await fetchTickets()
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建工单失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>提交者工作台</h2>

      <form className="ticket-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="工单标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="工单描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!title.trim() || loading}>
          {loading ? '提交中...' : '提交工单'}
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      <table className="ticket-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
              <td>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
