import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '../context/RoleContext'
import type { Role } from '../context/RoleContext'
import './RoleSelect.css'

const ROLES: { key: Role; label: string }[] = [
  { key: 'submitter', label: '提交者' },
  { key: 'dispatcher', label: '调度者' },
  { key: 'completer', label: '完成者' },
]

export default function RoleSelect() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (role) {
      navigate(`/workbench/${role}`, { replace: true })
    }
  }, [role, navigate])

  const handleSelect = (r: Role) => {
    setRole(r)
    navigate(`/workbench/${r}`)
  }

  return (
    <div className="role-select">
      <h1>选择角色</h1>
      <div className="role-buttons">
        {ROLES.map((r) => (
          <button
            key={r.key}
            className="btn btn-role"
            onClick={() => handleSelect(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )
}
