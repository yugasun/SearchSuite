import {
  AuthenticationError,
  InvalidEngineError,
  SearchAbortedError,
  SearchSuiteError,
  SearchTimeoutError,
} from '../../src/errors.js'

describe('SearchSuite errors', () => {
  test('preserves stable provider metadata and code', () => {
    const error = new AuthenticationError('invalid key', {
      provider: 'tavily',
      engine: 'tavily:advanced',
      statusCode: 401,
      raw: { Authorization: 'Bearer secret' },
    })

    expect(error).toBeInstanceOf(SearchSuiteError)
    expect(error.code).toBe('AUTHENTICATION_ERROR')
    expect(error.provider).toBe('tavily')
    expect(error.engine).toBe('tavily:advanced')
    expect(error.statusCode).toBe(401)
    expect(error.retryable).toBe(false)
    expect(JSON.stringify(error)).not.toContain('secret')
  })

  test('keeps caller abort and timeout distinct', () => {
    const aborted = new SearchAbortedError('caller aborted')
    const timeout = new SearchTimeoutError('timed out')

    expect(aborted.code).toBe('SEARCH_ABORTED')
    expect(aborted.retryable).toBe(false)
    expect(timeout.code).toBe('SEARCH_TIMEOUT')
    expect(timeout.retryable).toBe(true)
  })

  test('invalid engine includes a safe input hint', () => {
    const error = new InvalidEngineError('bad engine', { value: 'unknown:mode' })

    expect(error.code).toBe('INVALID_ENGINE')
    expect(error.message).toContain('unknown:mode')
  })
})

