import { anysearchResponse } from '../../fixtures/anysearch.js'
import { InvalidRequestError, QuotaExceededError, SearchAbortedError, SearchSuite } from '../../../src/index.js'

const search = { provider: 'anysearch', query: 'example' } as const

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

afterEach(() => vi.unstubAllEnvs())

test('searches anonymously, caps the request, and normalizes sources', async () => {
  vi.stubEnv('ANYSEARCH_API_KEY', '')
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(anysearchResponse))
  const onWarning = vi.fn()
  const client = new SearchSuite({ fetch, onWarning })
  const response = await client.search({ ...search, maxResults: 20 })

  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, init] = fetch.mock.calls[0]!
  expect(url).toBe('https://api.anysearch.com/v1/search')
  expect(init?.method).toBe('POST')
  expect(new Headers(init?.headers).has('authorization')).toBe(false)
  expect(JSON.parse(String(init?.body))).toEqual({ query: 'example', max_results: 10 })
  expect(onWarning).toHaveBeenCalledWith(expect.objectContaining({ code: 'PROVIDER_LIMIT', parameter: 'maxResults' }))
  expect(response).toMatchObject({
    provider: 'anysearch',
    engine: 'anysearch:web',
    results: [
      { title: 'Example source', url: 'https://example.com/article', snippet: 'Summary', content: 'Cleaned page content' },
      { title: 'example.org', url: 'https://example.org/' },
    ],
  })
})

test('uses the environment key unless explicit configuration overrides it', async () => {
  vi.stubEnv('ANYSEARCH_API_KEY', 'env-test-key')
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json(anysearchResponse))
  await new SearchSuite({ fetch }).search(search)
  await new SearchSuite({
    fetch,
    providers: { anysearch: { apiKey: ' explicit-test-key ', baseUrl: 'https://proxy.example/' } },
  }).search({ engine: 'anysearch:web', query: 'example', maxResults: 1 })

  expect(new Headers(fetch.mock.calls[0]![1]?.headers).get('authorization')).toBe('Bearer env-test-key')
  expect(new Headers(fetch.mock.calls[1]![1]?.headers).get('authorization')).toBe('Bearer explicit-test-key')
  expect(fetch.mock.calls[1]![0]).toBe('https://proxy.example/v1/search')
})

test('drops the entire HTTP 402 body because it can contain generated credentials', async () => {
  const upstream = json({ code: -1, message: 'username=fixture\npassword=fixture-secret\napi_key=fixture-key' }, 402)
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(upstream)
  const promise = new SearchSuite({ fetch }).search(search)
  await expect(promise).rejects.toBeInstanceOf(QuotaExceededError)
  await expect(promise).rejects.toMatchObject({ statusCode: 402, provider: 'anysearch', raw: undefined })
  const error = await promise.catch((error: unknown) => error)
  expect(JSON.stringify(error)).not.toMatch(/fixture/)
  expect(fetch).toHaveBeenCalledTimes(1)
})

test.each([[401, 'AUTHENTICATION_ERROR'], [429, 'RATE_LIMIT_ERROR'], [502, 'PROVIDER_UNAVAILABLE']])(
  'maps HTTP %i to %s', async (status, code) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({ code: -1 }, status))
    await expect(new SearchSuite({ fetch }).search(search)).rejects.toMatchObject({ code, statusCode: status })
  },
)

test('rejects a malformed success envelope instead of returning empty results', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({ code: 0, data: {} }))
  await expect(new SearchSuite({ fetch }).search(search)).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' })
})

test('rejects unknown provider options before sending a request', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  // @ts-expect-error Untyped callers must not bypass option validation.
  await expect(new SearchSuite({ fetch }).search({ ...search, providerOptions: { tag: 'finance.quote' } }))
    .rejects.toBeInstanceOf(InvalidRequestError)
  expect(fetch).not.toHaveBeenCalled()
})

test('forwards caller cancellation to the HTTP request', async () => {
  const controller = new AbortController()
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, init) => {
    controller.abort()
    init?.signal?.throwIfAborted()
    return json(anysearchResponse)
  })
  await expect(new SearchSuite({ fetch }).search({ ...search, signal: controller.signal }))
    .rejects.toBeInstanceOf(SearchAbortedError)
  expect(fetch.mock.calls[0]![1]?.signal?.aborted).toBe(true)
})
