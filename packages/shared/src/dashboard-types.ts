import type { TicketHistoryAction } from './ticket-types'

export interface DashboardOverview {
  total: number
  createdThisWeek: number
  completedThisWeek: number
  pending: number
  priorityDistribution: { high: number; medium: number; low: number }
}

export interface DashboardEfficiency {
  avgResponseMinutes: number
  avgProcessMinutes: number
  reassignCount: number
}

export interface DashboardWorkloadItem {
  username: string
  displayName: string
  assignedCount: number
  inProgressCount: number
  completedThisWeekCount: number
}

export interface RecentActivityItem {
  id: string
  ticketId: string
  ticketTitle: string
  action: TicketHistoryAction
  actor: string
  actorDisplayName: string
  toStatus: string
  createdAt: string
}

export interface DashboardData {
  overview: DashboardOverview
  efficiency: DashboardEfficiency
  workload: DashboardWorkloadItem[]
  recentActivity: RecentActivityItem[]
}
