import { SearchAbortedError, SearchTimeoutError } from '../../src/errors.js'
import { combineSignals } from '../../src/internal/signal.js'

describe('combined signals', () => {
  test('reports caller cancellation distinctly', () => {
    const caller = new AbortController()
    const combined = combineSignals(1_000, caller.signal)

    caller.abort(new Error('cancelled'))

    expect(combined.source()).toBe('caller')
    expect(() => combined.throwIfAborted()).toThrow(SearchAbortedError)
    combined.cleanup()
  })

  test('reports SDK timeout distinctly', async () => {
    const combined = combineSignals(5)

    await new Promise((resolve) => setTimeout(resolve, 15))

    expect(combined.source()).toBe('timeout')
    expect(() => combined.throwIfAborted()).toThrow(SearchTimeoutError)
    combined.cleanup()
  })
})

