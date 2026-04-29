import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card } from 'antd'
import { useRole } from '../context/RoleContext'
import type { Role } from '../context/RoleContext'

const ROLES: { key: Role; label: string; description: string }[] = [
  { key: 'submitter', label: '提交者', description: '创建并提交工单' },
  { key: 'dispatcher', label: '调度者', description: '指派工单给完成者' },
  { key: 'completer', label: '完成者', description: '处理并完成工单' },
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 32 }}>
      <h1 style={{ margin: 0 }}>选择角色</h1>
      <Row gutter={[16, 16]} justify="center">
        {ROLES.map((r) => (
          <Col key={r.key} xs={24} sm={8}>
            <Card
              hoverable
              style={{ textAlign: 'center' }}
              onClick={() => handleSelect(r.key)}
            >
              <Card.Meta title={r.label} description={r.description} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
