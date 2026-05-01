import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Progress, Table, Tag, Spin, Empty, Typography, Button, App as AntdApp } from 'antd'
import { getDashboard, getTicket } from '../api/client'
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '@ticketflow/shared'
import type { DashboardData, Ticket } from '@ticketflow/shared'
import TicketDetailDrawer from '../components/TicketDetailDrawer'

const ACTION_DOT_COLORS: Record<string, string> = {
  created: 'blue',
  assigned: STATUS_COLORS.assigned,
  reassigned: 'orange',
  started: 'cyan',
  completed: STATUS_COLORS.completed,
}

const ACTION_LABELS: Record<string, string> = {
  created: '创建了工单',
  assigned: '指派了工单',
  reassigned: '改派了工单',
  started: '开始处理工单',
  completed: '完成了工单',
  edited: '编辑了工单',
  commented: '评论了工单',
}

export default function DashboardPage() {
  const { message } = AntdApp.useApp()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // TicketDetailDrawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTicket, setDrawerTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(false)
    getDashboard()
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(true); setLoading(false); message.error(e instanceof Error ? e.message : '获取统计数据失败') })
  }, [message])

  const handleTicketClick = async (ticketId: string) => {
    setDrawerOpen(true)
    try {
      const ticket = await getTicket(ticketId)
      setDrawerTicket(ticket)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取工单详情失败')
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>
  }

  if (error || !data) {
    return null
  }

  const { overview, efficiency, workload, recentActivity } = data

  const completionRate = overview.createdThisWeek > 0
    ? Math.round((overview.completedThisWeek / overview.createdThisWeek) * 100)
    : 0

  const pendingTotal = overview.priorityDistribution.high + overview.priorityDistribution.medium + overview.priorityDistribution.low

  const totalAssigned = workload.reduce((sum, w) => sum + w.assignedCount, 0)
  const totalInProgress = workload.reduce((sum, w) => sum + w.inProgressCount, 0)

  const workloadColumns = [
    { title: '完成者', dataIndex: 'displayName', key: 'displayName' },
    {
      title: '待处理',
      key: 'assigned',
      render: (_: unknown, r: typeof workload[number]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={totalAssigned > 0 ? Math.round((r.assignedCount / totalAssigned) * 100) : 0}
            size="small"
            strokeColor={STATUS_COLORS.assigned}
            style={{ flex: 1, minWidth: 80 }}
          />
          <span>{r.assignedCount}</span>
        </div>
      ),
    },
    {
      title: '处理中',
      key: 'inProgress',
      render: (_: unknown, r: typeof workload[number]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={totalInProgress > 0 ? Math.round((r.inProgressCount / totalInProgress) * 100) : 0}
            size="small"
            strokeColor="blue"
            style={{ flex: 1, minWidth: 80 }}
          />
          <span>{r.inProgressCount}</span>
        </div>
      ),
    },
    { title: '本周完成', dataIndex: 'completedThisWeekCount', key: 'completedThisWeek' },
  ]

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>数据面板</Typography.Title>

      {/* Row 1: KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="工单总数" value={overview.total} valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="本周新建" value={overview.createdThisWeek} valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="本周完成" value={overview.completedThisWeek} valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="待处理" value={overview.pending} valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Gauge + Priority Distribution */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col sm={8} xs={24}>
          <Card title="完成率" size="small">
            <div style={{ textAlign: 'center' }}>
              <Progress type="dashboard" percent={completionRate} />
            </div>
          </Card>
        </Col>
        <Col sm={16} xs={24}>
          <Card title="待处理工单优先级分布" size="small">
            <div style={{ marginBottom: 8 }}>
              <span>{PRIORITY_LABELS.high}：</span>
              <Progress
                percent={pendingTotal > 0 ? Math.round((overview.priorityDistribution.high / pendingTotal) * 100) : 0}
                strokeColor={PRIORITY_COLORS.high}
                format={() => overview.priorityDistribution.high}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <span>{PRIORITY_LABELS.medium}：</span>
              <Progress
                percent={pendingTotal > 0 ? Math.round((overview.priorityDistribution.medium / pendingTotal) * 100) : 0}
                strokeColor={PRIORITY_COLORS.medium}
                format={() => overview.priorityDistribution.medium}
              />
            </div>
            <div>
              <span>{PRIORITY_LABELS.low}：</span>
              <Progress
                percent={pendingTotal > 0 ? Math.round((overview.priorityDistribution.low / pendingTotal) * 100) : 0}
                strokeColor={PRIORITY_COLORS.low}
                format={() => overview.priorityDistribution.low}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Efficiency Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card size="small">
            <Statistic title="平均响应时间" value={efficiency.avgResponseMinutes} suffix="分钟" valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small">
            <Statistic title="平均处理时间" value={efficiency.avgProcessMinutes} suffix="分钟" valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small">
            <Statistic title="本周改派次数" value={efficiency.reassignCount} valueStyle={{ fontSize: 24, fontWeight: 600 }} />
          </Card>
        </Col>
      </Row>

      {/* Row 4: Workload Table */}
      <Card title="人员负载" size="small" style={{ marginBottom: 16 }}>
        <Table
          dataSource={workload}
          columns={workloadColumns}
          rowKey="username"
          pagination={false}
        />
      </Card>

      {/* Row 5: Recent Activity Timeline */}
      <Card title="最近动态" size="small">
        {recentActivity.length === 0 ? (
          <Empty description="暂无动态" />
        ) : (
          <div style={{ padding: '8px 0' }}>
            {recentActivity.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative', paddingLeft: 24 }}>
                <span style={{
                  position: 'absolute',
                  left: 8,
                  top: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: ACTION_DOT_COLORS[item.action] || '#999',
                }} />
                <Tag>{formatTime(item.createdAt)}</Tag>
                <span>{item.actorDisplayName}</span>
                <span>{ACTION_LABELS[item.action] || item.action}</span>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => handleTicketClick(item.ticketId)}
                >
                  "{item.ticketTitle}"
                </Button>
                <Tag color={STATUS_COLORS[item.toStatus as keyof typeof STATUS_COLORS]}>{item.toStatus}</Tag>
              </div>
            ))}
          </div>
        )}
      </Card>

      <TicketDetailDrawer
        ticket={drawerTicket}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerTicket(null) }}
        showTimeline
      />
    </div>
  )
}
