import { eq } from 'drizzle-orm'
import { createDb } from './node'
import { tickets, users, ticketHistory } from './schema'
import { hashPassword } from '../lib/password'

const db = createDb(process.env.DATABASE_PATH || './data/ticketflow.db')

const now = new Date()
const ts = (offsetMinutes: number) => new Date(now.getTime() + offsetMinutes * 60_000).toISOString()
const randomId = () => crypto.randomUUID()

// --- Seed users ---

const seedUserDefs = [
  { id: 'u-00000000-0000-0000-0000-000000000001', username: 'submitter', displayName: '提交者', role: 'submitter', password: 'changeme' },
  { id: 'u-00000000-0000-0000-0000-000000000002', username: 'dispatcher', displayName: '调度者', role: 'dispatcher', password: 'changeme' },
  { id: 'u-00000000-0000-0000-0000-000000000003', username: 'completer', displayName: '完成者', role: 'completer', password: 'changeme' },
  { id: 'u-00000000-0000-0000-0000-000000000004', username: 'admin', displayName: '管理员', role: 'admin', password: 'admin' },
  { id: 'u-00000000-0000-0000-0000-000000000005', username: 'completer2', displayName: '完成者2', role: 'completer', password: 'changeme' },
]

for (const def of seedUserDefs) {
  const existing = await db.select().from(users).where(eq(users.username, def.username))
  if (existing.length === 0) {
    const passwordHash = await hashPassword(def.password)
    await db.insert(users).values({
      id: def.id,
      username: def.username,
      displayName: def.displayName,
      role: def.role,
      passwordHash,
      createdAt: ts(-7 * 24 * 60),
    })
  }
}
console.log(`Seeded ${seedUserDefs.length} users`)

// --- Seed tickets with history ---

interface SeedTicket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string | null
  createdBy: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

interface SeedHistory {
  ticketId: string
  action: string
  actor: string
  fromStatus: string | null
  toStatus: string
  details: string | null
  createdAt: string
}

const seedTickets: SeedTicket[] = [
  // --- submitted (待指派) ---
  {
    id: 't-00000000-0000-0000-0000-000000000001',
    title: '移动端登录页布局溢出',
    description: '屏幕宽度小于 375px 时登录表单溢出。需在 375px 以下做响应式适配。',
    status: 'submitted', priority: 'high',
    dueDate: '2026-05-15', createdBy: 'submitter', assignedTo: null,
    createdAt: ts(-180), updatedAt: ts(-180),
  },
  {
    id: 't-00000000-0000-0000-0000-000000000002',
    title: '新增暗色模式',
    description: '用户希望支持系统偏好自适应的暗色主题，涉及 antd ConfigProvider 的 theme 配置。',
    status: 'submitted', priority: 'low',
    dueDate: null, createdBy: 'submitter', assignedTo: null,
    createdAt: ts(-150), updatedAt: ts(-150),
  },
  {
    id: 't-00000000-0000-0000-0000-000000000003',
    title: '工单列表增加分页',
    description: '当前工单列表一次性加载全部数据，超过 200 条时页面卡顿。需要支持后端分页。',
    status: 'submitted', priority: 'medium',
    dueDate: '2026-05-30', createdBy: 'submitter', assignedTo: null,
    createdAt: ts(-120), updatedAt: ts(-120),
  },
  // --- assigned (已指派) ---
  {
    id: 't-00000000-0000-0000-0000-000000000004',
    title: 'Dashboard 数据库查询优化',
    description: 'Dashboard 在工单 >1000 时加载缓慢，需对 tickets 表加索引并优化查询语句。',
    status: 'assigned', priority: 'medium',
    dueDate: '2026-05-20', createdBy: 'dispatcher', assignedTo: 'completer',
    createdAt: ts(-200), updatedAt: ts(-50),
  },
  {
    id: 't-00000000-0000-0000-0000-000000000005',
    title: '实现邮件通知功能',
    description: '工单指派或完成时发送邮件通知相关人员。使用 SendGrid API。',
    status: 'assigned', priority: 'high',
    dueDate: '2026-05-10', createdBy: 'submitter', assignedTo: 'completer2',
    createdAt: ts(-300), updatedAt: ts(-30),
  },
  {
    id: 't-00000000-0000-0000-0000-000000000006',
    title: '修复 Safari 下日期选择器异常',
    description: 'Safari 17 下 DatePicker 组件点击后弹出层位置偏移，且部分日期不可点击。',
    status: 'assigned', priority: 'high',
    dueDate: null, createdBy: 'submitter', assignedTo: 'completer',
    createdAt: ts(-90), updatedAt: ts(-20),
  },
  // --- in_progress (处理中) ---
  {
    id: 't-00000000-0000-0000-0000-000000000007',
    title: '重构权限校验中间件',
    description: '当前权限逻辑散落在各个路由中，需抽到统一的 permission middleware 中。',
    status: 'in_progress', priority: 'high',
    dueDate: '2026-05-08', createdBy: 'admin', assignedTo: 'completer',
    createdAt: ts(-400), updatedAt: ts(-10),
  },
  {
    id: 't-00000000-0000-0000-0000-000000000008',
    title: '前端 E2E 测试覆盖登录流程',
    description: '补充登录页和 401 自动跳转的 Playwright 测试用例。',
    status: 'in_progress', priority: 'medium',
    dueDate: null, createdBy: 'dispatcher', assignedTo: 'completer2',
    createdAt: ts(-250), updatedAt: ts(-5),
  },
  // --- completed (已完成) ---
  {
    id: 't-00000000-0000-0000-0000-000000000009',
    title: '编写 API 文档',
    description: '为所有 REST 接口编写请求/响应示例文档，包括认证、工单 CRUD、管理接口。',
    status: 'completed', priority: 'medium',
    dueDate: null, createdBy: 'dispatcher', assignedTo: 'completer',
    createdAt: ts(-600), updatedAt: ts(-1),
  },
  {
    id: 't-00000000-0000-0000-0000-000000000010',
    title: 'Session 24h TTL + 401 拦截',
    description: '会话过期时间从浏览器关闭改为 24 小时，401 时前端自动跳转登录页。',
    status: 'completed', priority: 'high',
    dueDate: '2026-04-28', createdBy: 'admin', assignedTo: 'completer',
    createdAt: ts(-900), updatedAt: ts(-2),
  },
]

const seedHistory: SeedHistory[] = [
  // Ticket 1: submitted only
  { ticketId: 't-00000000-0000-0000-0000-000000000001', action: 'created', actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-180) },
  // Ticket 2: submitted only
  { ticketId: 't-00000000-0000-0000-0000-000000000002', action: 'created', actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-150) },
  // Ticket 3: submitted only
  { ticketId: 't-00000000-0000-0000-0000-000000000003', action: 'created', actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-120) },
  // Ticket 4: created → assigned (was reassigned once)
  { ticketId: 't-00000000-0000-0000-0000-000000000004', action: 'created', actor: 'dispatcher', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-200) },
  { ticketId: 't-00000000-0000-0000-0000-000000000004', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer2' }), createdAt: ts(-160) },
  { ticketId: 't-00000000-0000-0000-0000-000000000004', action: 'reassigned', actor: 'dispatcher', fromStatus: 'assigned', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer', prevAssignee: 'completer2' }), createdAt: ts(-50) },
  // Ticket 5: created → assigned
  { ticketId: 't-00000000-0000-0000-0000-000000000005', action: 'created', actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-300) },
  { ticketId: 't-00000000-0000-0000-0000-000000000005', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer2' }), createdAt: ts(-30) },
  // Ticket 6: created → assigned
  { ticketId: 't-00000000-0000-0000-0000-000000000006', action: 'created', actor: 'submitter', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-90) },
  { ticketId: 't-00000000-0000-0000-0000-000000000006', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer' }), createdAt: ts(-20) },
  // Ticket 7: created → assigned → started
  { ticketId: 't-00000000-0000-0000-0000-000000000007', action: 'created', actor: 'admin', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-400) },
  { ticketId: 't-00000000-0000-0000-0000-000000000007', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer' }), createdAt: ts(-350) },
  { ticketId: 't-00000000-0000-0000-0000-000000000007', action: 'started', actor: 'completer', fromStatus: 'assigned', toStatus: 'in_progress', details: null, createdAt: ts(-10) },
  // Ticket 8: created → assigned → started (same as above, different user)
  { ticketId: 't-00000000-0000-0000-0000-000000000008', action: 'created', actor: 'dispatcher', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-250) },
  { ticketId: 't-00000000-0000-0000-0000-000000000008', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer2' }), createdAt: ts(-200) },
  { ticketId: 't-00000000-0000-0000-0000-000000000008', action: 'started', actor: 'completer2', fromStatus: 'assigned', toStatus: 'in_progress', details: null, createdAt: ts(-5) },
  // Ticket 9: created → assigned → started → completed
  { ticketId: 't-00000000-0000-0000-0000-000000000009', action: 'created', actor: 'dispatcher', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-600) },
  { ticketId: 't-00000000-0000-0000-0000-000000000009', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer' }), createdAt: ts(-500) },
  { ticketId: 't-00000000-0000-0000-0000-000000000009', action: 'started', actor: 'completer', fromStatus: 'assigned', toStatus: 'in_progress', details: null, createdAt: ts(-300) },
  { ticketId: 't-00000000-0000-0000-0000-000000000009', action: 'completed', actor: 'completer', fromStatus: 'in_progress', toStatus: 'completed', details: null, createdAt: ts(-1) },
  // Ticket 10: created → assigned → started → completed
  { ticketId: 't-00000000-0000-0000-0000-000000000010', action: 'created', actor: 'admin', fromStatus: null, toStatus: 'submitted', details: null, createdAt: ts(-900) },
  { ticketId: 't-00000000-0000-0000-0000-000000000010', action: 'assigned', actor: 'dispatcher', fromStatus: 'submitted', toStatus: 'assigned', details: JSON.stringify({ assignee: 'completer' }), createdAt: ts(-800) },
  { ticketId: 't-00000000-0000-0000-0000-000000000010', action: 'started', actor: 'completer', fromStatus: 'assigned', toStatus: 'in_progress', details: null, createdAt: ts(-500) },
  { ticketId: 't-00000000-0000-0000-0000-000000000010', action: 'completed', actor: 'completer', fromStatus: 'in_progress', toStatus: 'completed', details: null, createdAt: ts(-2) },
]

// --- Insert tickets ---

let ticketCount = 0
for (const ticket of seedTickets) {
  const existing = await db.select().from(tickets).where(eq(tickets.id, ticket.id))
  if (existing.length === 0) {
    await db.insert(tickets).values(ticket)
    ticketCount++
  }
}
console.log(`Seeded ${ticketCount} tickets`)

// --- Insert history ---

let historyCount = 0
for (const h of seedHistory) {
  // Check if this exact history record already exists (by ticketId + action + createdAt)
  const dup = await db.select().from(ticketHistory).where(eq(ticketHistory.createdAt, h.createdAt))
  if (dup.length === 0) {
    await db.insert(ticketHistory).values({
      id: randomId(),
      ticketId: h.ticketId,
      action: h.action,
      actor: h.actor,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      details: h.details,
      createdAt: h.createdAt,
    })
    historyCount++
  }
}
console.log(`Seeded ${historyCount} ticket_history records`)
console.log('Seed complete.')
