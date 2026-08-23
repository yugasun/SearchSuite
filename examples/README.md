# SearchSuite examples

这些示例使用 Node.js 24 直接运行 TypeScript 文件，无需额外安装 `tsx`。

## 准备环境

在 `examples/` 目录执行：

```sh
pnpm install
```

示例需要对应 Provider 的 API Key。可以直接设置环境变量，或在
`examples/.env` 中配置：

```dotenv
TAVILY_API_KEY=your-api-key
EXA_API_KEY=your-api-key
SERPER_API_KEY=your-api-key
```

不要提交 `.env` 或在日志中输出 API Key。

## 运行示例

使用 Node.js 的 `--env-file` 加载本地凭据：

```sh
node --env-file=.env basic-search.ts
node --env-file=.env provider-options.ts
node --env-file=.env switch-providers.ts
node --env-file=.env cancellation.ts
```

也可以只为当前命令设置环境变量：

```sh
TAVILY_API_KEY=your-api-key node basic-search.ts
```

示例会访问真实 Provider API，可能消耗额度。`cancellation.ts` 使用 Serper，
`provider-options.ts` 使用 Tavily，`switch-providers.ts` 使用 Tavily 和 Exa。