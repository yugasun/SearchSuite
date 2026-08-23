import { SearchAbortedError, SearchSuite } from 'searchsuite'

const client = new SearchSuite()
const controller = new AbortController()
const request = client.search({
  provider: 'serper',
  query: 'Node.js ESM',
  signal: controller.signal,
})

controller.abort()

try {
  await request
} catch (error) {
  if (error instanceof SearchAbortedError) console.log('search cancelled')
  else throw error
}
