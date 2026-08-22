import { SearchAbortedError, SearchTimeoutError } from '../errors.js'

export type AbortSource = 'caller' | 'timeout' | undefined

export interface CombinedSignal {
  signal: AbortSignal
  source: () => AbortSource
  throwIfAborted: () => void
  cleanup: () => void
}

export function combineSignals(timeoutMs: number, caller?: AbortSignal): CombinedSignal {
  const controller = new AbortController()
  let source: AbortSource

  const onCallerAbort = () => {
    if (source !== undefined) return
    source = 'caller'
    controller.abort(caller?.reason)
  }

  if (caller?.aborted) {
    onCallerAbort()
  } else {
    caller?.addEventListener('abort', onCallerAbort, { once: true })
  }

  const timer = setTimeout(() => {
    if (source !== undefined) return
    source = 'timeout'
    controller.abort(new DOMException('Search timed out', 'TimeoutError'))
  }, timeoutMs)

  return {
    signal: controller.signal,
    source: () => source,
    throwIfAborted: () => {
      if (source === 'caller') throw new SearchAbortedError()
      if (source === 'timeout') throw new SearchTimeoutError()
    },
    cleanup: () => {
      clearTimeout(timer)
      caller?.removeEventListener('abort', onCallerAbort)
    },
  }
}
