# SearchSuite

> One TypeScript API for Baidu, Doubao, Tavily, Exa, Serper, and more.

SearchSuite 是一个面向 AI Agent、Deep Research、RAG 和联网问答场景的统一搜索 SDK。它借鉴 [aisuite](https://github.com/andrewyng/aisuite) 的 Provider 抽象，通过统一的请求、响应、类型和异常模型屏蔽不同搜索服务的 HTTP API 差异。

项目最初来自为 DeepSeek Harness 设计的 `dsh-web-search` 插件。SearchSuite 将其中可复用的搜索兼容层抽离为纯 TypeScript SDK，但不依赖任何 dsh 包；未来 `dsh-web-search` 可以作为普通消费者直接复用它。

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    tavily: {
      apiKey: process.env.TAVILY_API_KEY,
    },
  },
})

const response = await client.search({
  engine: 'tavily:advanced',
  query: 'AI Agent search infrastructure',
  maxResults: 5,
  signal: AbortSignal.timeout(30_000),
})

for (const result of response.results) {
  console.log(result.title, result.url)
}
```

切换 Provider 只需要修改 engine：

```ts
const response = await client.search({
  engine: 'exa:auto',
  query: 'AI Agent search infrastructure',
  maxResults: 5,
})
```

## 当前状态

当前 v0.1 SDK 已在工作区完成首版实现，尚未发布到 npm；可通过 `pnpm build` 和 `pnpm pack` 进行本地安装验证。

v0.1 包含：

- Node.js 24+、TypeScript strict、纯 ESM
- 单一异步 `search()` API
- `provider:engine` 命名约定
- Baidu、Doubao、Tavily、Exa、Serper Adapter
- engine 感知的 `providerOptions` 类型推导
- 统一请求、响应、异常、能力声明与取消语义
- BYOK、环境变量和显式 Provider 配置
- 零 runtime dependency，使用原生 `fetch`
- Unit、Provider Contract 和可选 Live Integration Test

Router、fallback、retry、多 Key、配额/成本路由、联邦搜索、重排、缓存、Extract/Crawl，以及 dsh 插件不属于 v0.1。

## 研发文档

- [技术设计总览](TECHNICAL_DESIGN.md)
- [研发文档索引](docs/README.md)
- [产品定位与范围](docs/01-product-scope.md)
- [架构与公共 API](docs/02-architecture-and-api.md)
- [Provider Adapter 开发规范](docs/03-provider-adapter-guide.md)
- [测试、CI 与发布](docs/04-testing-and-release.md)
- [路线图与任务拆分](docs/05-roadmap.md)
- [ADR-0001：TypeScript v0.1 架构基线](docs/adr/0001-v0.1-architecture-baseline.md)
- [完整 TypeScript SDK 设计规范](docs/superpowers/specs/2026-08-22-typescript-sdk-design.md)

## 核心原则

1. Provider Adapter 必须薄，只负责参数转换、远端调用、结果标准化与错误映射。
2. 通用类型覆盖高频能力，Provider 特性进入 `providerOptions`，原始数据进入 `raw`。
3. 公共 API 稳定性和 TypeScript 开发体验优先于内部抽象的“优雅”。
4. SDK 不依赖 Provider 官方 SDK 或 Agent/Harness 框架。
5. Provider Compatibility 与 Provider Selection 分层演进。

## License

建议使用 MIT License；正式发布前由项目维护者确认。
