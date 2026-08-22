import { redactSecrets, toJsonSafe } from '../../src/internal/redact.js'

describe('secret redaction', () => {
  test('redacts credential keys and bearer values recursively', () => {
    const safe = redactSecrets({
      apiKey: 'top-secret',
      headers: { Authorization: 'Bearer token-value' },
      nested: [{ password: 'pw' }],
    })

    expect(safe).toEqual({
      apiKey: '[REDACTED]',
      headers: { Authorization: '[REDACTED]' },
      nested: [{ password: '[REDACTED]' }],
    })
  })

  test('redacts credential-bearing URL query parameters', () => {
    const safe = redactSecrets('https://example.com/search?api_key=top-secret&q=hello')

    expect(safe).toBe('https://example.com/search?api_key=%5BREDACTED%5D&q=hello')
  })

  test('converts arbitrary values to JSON-safe output', () => {
    const safe = toJsonSafe({ now: new Date('2026-01-01T00:00:00.000Z'), error: new Error('boom') })

    expect(safe).toEqual({
      now: '2026-01-01T00:00:00.000Z',
      error: { name: 'Error', message: 'boom' },
    })
    expect(() => JSON.stringify(safe)).not.toThrow()
  })
})

