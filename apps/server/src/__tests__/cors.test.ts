import { describe, it, expect } from 'vitest'
import { createTestApp } from './helpers'

const { app } = createTestApp()

describe('CORS middleware', () => {
  it('should include Access-Control-Allow-Origin header', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'http://localhost:5173' },
    })
    const allowOrigin = res.headers.get('access-control-allow-origin')
    expect(allowOrigin).toBeDefined()
  })
})
