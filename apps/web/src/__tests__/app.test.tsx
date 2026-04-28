import { describe, it, expect } from 'vitest'
import { APP_INFO, type AppInfo } from '@ticketflow/shared'

describe('web app', () => {
  it('should import @ticketflow/shared at runtime', () => {
    expect(APP_INFO).toBeDefined()
    expect(APP_INFO.name).toBe('ticketflow')
    expect(APP_INFO.version).toBe('0.1.0')
  })

  it('should have AppInfo type available', () => {
    const info: AppInfo = { name: 'test', version: '0.0.0' }
    expect(info.name).toBe('test')
  })
})
