import { describe, it, expect } from 'vitest'
import { APP_INFO, type AppInfo } from '../index'

describe('shared exports', () => {
  it('should export APP_INFO with correct name and version', () => {
    expect(APP_INFO.name).toBe('ticketflow')
    expect(APP_INFO.version).toBe('0.1.0')
  })

  it('should satisfy the AppInfo interface', () => {
    const typed: AppInfo = APP_INFO
    expect(typed.name).toBe('ticketflow')
    expect(typed.version).toBe('0.1.0')
  })

  it('should have name and version as string properties', () => {
    expect(typeof APP_INFO.name).toBe('string')
    expect(typeof APP_INFO.version).toBe('string')
  })
})
