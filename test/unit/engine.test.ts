import { InvalidEngineError } from '../../src/errors.js'
import { getProviderEngines, parseEngine, resolveProviderEngine } from '../../src/internal/engine.js'

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

  test('resolves provider-first modes without exposing endpoint names', () => {
    expect(resolveProviderEngine('baidu', { mode: 'ai', model: 'custom-model' })).toEqual({
      provider: 'baidu',
      name: 'ai',
      full: 'baidu:ai',
      providerOptions: { model: 'custom-model' },
    })
    expect(resolveProviderEngine('doubao', { mode: 'global', maxSnippetLength: 800 })).toEqual({
      provider: 'doubao',
      name: 'global',
      full: 'doubao:global',
      providerOptions: { maxSnippetLength: 800 },
    })
    expect(resolveProviderEngine('exa', { searchType: 'neural', highlightsPerUrl: 2 })).toMatchObject({
      provider: 'exa',
      full: 'exa:neural',
      providerOptions: { highlightsPerUrl: 2 },
    })
    expect(resolveProviderEngine('tavily')).toMatchObject({
      provider: 'tavily',
      full: 'tavily:basic',
    })
  })
})
