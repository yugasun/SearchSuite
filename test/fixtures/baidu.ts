export const baiduWebResponse = {
  references: [
    {
      type: 'web',
      title: 'Baidu result',
      url: 'https://example.com/baidu',
      snippet: 'Baidu snippet.',
      date: '2026-01-05',
    },
  ],
}

export const baiduAiResponse = {
  choices: [{ message: { content: 'Baidu AI answer.' } }],
  references: baiduWebResponse.references,
}
