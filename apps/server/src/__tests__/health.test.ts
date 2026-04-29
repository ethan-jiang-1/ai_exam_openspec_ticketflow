import { describe, it, expect } from 'vitest'
import { createTestApp } from './helpers'

const { app } = createTestApp()

describe('GET /health', () => {
  it('should return status ok with JSON content type', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})
