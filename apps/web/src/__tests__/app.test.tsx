import { describe, it, expect } from 'vitest'
import { APP_INFO } from '@ticketflow/shared'

describe('web app', () => {
  it('should import shared package', () => {
    expect(APP_INFO.name).toBe('ticketflow')
  })
})
