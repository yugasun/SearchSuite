import { InvalidEngineError } from '../../src/errors.js'
import { getProviderEngines, parseEngine } from '../../src/internal/engine.js'

describe('engine parsing', () => {
  test('normalizes provider casing and preserves engine casing', () => {
    expect(parseEngine('TAVILY:advanced')).toEqual({
      provider: 'tavily',
      name: 'advanced',
      full: 'tavily:advanced',
    })
  })

  test('validates the remainder after the first colon as the engine name', () => {
    expect(() => parseEngine('exa:auto:experimental')).toThrow(InvalidEngineError)
  })

  test('rejects unknown or malformed engines', () => {
    expect(() => parseEngine('unknown:web')).toThrow(InvalidEngineError)
    expect(() => parseEngine('tavily')).toThrow(InvalidEngineError)
    expect(() => parseEngine('tavily:missing')).toThrow(InvalidEngineError)
  })

  test('exposes the explicit engine allowlist', () => {
    expect(getProviderEngines('baidu')).toEqual(['web', 'ai'])
    expect(getProviderEngines('serper')).toEqual(['google'])
  })
})
