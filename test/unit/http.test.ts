import { AuthenticationError, RateLimitError } from '../../src/errors.js'
import { requestJson } from '../../src/internal/http.js'

describe('requestJson', () => {
  test('uses the injected fetch and parses JSON', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    await expect(requestJson({
      fetch: fetcher,
      provider: 'tavily',
      engine: 'tavily:advanced',
      url: 'https://api.example.test/search',
      init: { method: 'POST', body: '{}' },
    })).resolves.toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/search',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('maps authentication and rate-limit status codes', async () => {
    const authFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }))
    const rateFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 }))

    await expect(requestJson({
      fetch: authFetch,
      provider: 'tavily',
      engine: 'tavily:advanced',
      url: 'https://api.example.test/search',
    })).rejects.toBeInstanceOf(AuthenticationError)
    await expect(requestJson({
      fetch: rateFetch,
      provider: 'tavily',
      engine: 'tavily:advanced',
      url: 'https://api.example.test/search',
    })).rejects.toBeInstanceOf(RateLimitError)
  })
})

