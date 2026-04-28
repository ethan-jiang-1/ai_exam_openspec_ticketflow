export interface AppInfo {
  name: string
  version: string
}

export const APP_INFO = {
  name: 'ticketflow',
  version: '0.1.0',
} as const satisfies AppInfo
