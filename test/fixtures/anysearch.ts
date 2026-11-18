export const anysearchResponse = {
  code: 0,
  message: 'success',
  request_id: 'fixture-request-id',
  data: {
    results: [
      { title: 'Example source', url: 'https://example.com/article', snippet: 'Summary', content: 'Cleaned page content' },
      { title: '', url: 'https://example.org' },
      { title: 'Unsupported protocol', url: 'ftp://example.com/' },
    ],
    metadata: { total_results: 3, search_time_ms: 312 },
  },
}
