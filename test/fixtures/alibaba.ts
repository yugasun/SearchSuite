export const alibabaResponse = {
  output: {
    choices: [{
      finish_reason: 'stop',
      message: { role: 'assistant', content: 'Alibaba answer.' },
    }],
    search_info: {
      search_results: [{
        title: 'Alibaba result',
        url: 'https://example.com/alibaba',
        snippet: 'Alibaba source snippet.',
      }, {
        title: 'Second Alibaba result',
        url: 'https://example.com/alibaba-2',
        snippet: 'Second source snippet.',
      }],
    },
  },
  usage: { input_tokens: 12, output_tokens: 25 },
} satisfies Record<string, unknown>
