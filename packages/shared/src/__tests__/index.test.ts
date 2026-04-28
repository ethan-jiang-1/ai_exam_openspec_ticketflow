import { describe, it, expect } from 'vitest'
import { APP_INFO } from '../index'

describe('shared exports', () => {
  it('should export APP_INFO with correct values', () => {
    expect(APP_INFO.name).toBe('ticketflow')
    expect(APP_INFO.version).toBe('0.1.0')
  })
})
