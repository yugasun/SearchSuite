# SearchSuite

[English](README.md)

[![CI](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml/badge.svg)](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml)
![Node.js >=24](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=node.js&logoColor=white)
![ESM only](https://img.shields.io/badge/modules-ESM--only-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

用一套类型安全的 API 接入百度、豆包、Tavily、Exa 和 Serper 搜索及网页内容获取。

SearchSuite 是独立于框架的 TypeScript SDK。调用方只需要选择 Provider，
再使用搜索或内容获取接口：

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()
const response = await client.search({
  provider: 'tavily',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})

const page = await client.fetch({
  provider: 'tavily',
  url: 'https://example.com/article',
})
```

## 特性

- 根据 Provider 推断 `providerOptions` 和响应类型。
- 统一结果、用量、延迟、warning 和稳定的错误类型。
- 使用原生 `fetch`、`AbortSignal`；仅支持 ESM，零运行时依赖。
- Provider Adapter 保持轻量，不隐藏重试、回退、路由或缓存逻辑。
- 提供 Provider-backed 的 `fetch()` 内容获取接口，并导出与 dsh-web 兼容的
  `WebFetchProvider` 契约。

## 环境要求

- Node.js 24 或更高版本
- ESM 项目；不支持 CommonJS 和 `require()`

## 安装

从 npm 安装 SearchSuite：

```sh
npm install searchsuite
```

## 快速开始

在服务端环境中设置 Provider 凭据，然后调用 SDK：

```js
import { SearchSuite } from 'searchsuite'

// searchsuite 会读取配置的 TAVILY_API_KEY
const client = new SearchSuite()
const response = await client.search({
  provider: 'tavily',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})

for (const result of response.results) {
  console.log(result.title, result.url)
}
```

SearchSuite 会在 Provider 首次使用时读取环境变量，但不会自行加载 `.env` 文件；
本地开发可使用 Node.js `--env-file=.env`，生产环境请使用部署平台的密钥配置。
不要将凭据暴露到浏览器 bundle 或提交到代码仓库。

## 支持的 Provider

| Provider | 默认搜索模式 | 环境变量 |
| --- | --- | --- |
| Baidu | `baidu:web`, `baidu:ai` | `BAIDU_API_KEY` 或 `QIANFAN_API_KEY` |
| Doubao | `doubao:custom`, `doubao:global` | `DOUBAO_API_KEY` 或 `DOUBAO_SEARCH_API_KEY` |
| Tavily | `tavily:basic`, `tavily:advanced`, `tavily:fast`, `tavily:ultra-fast` | `TAVILY_API_KEY` |
| Exa | `exa:auto`, `exa:keyword`, `exa:neural` | `EXA_API_KEY` |
| Serper | `serper:google` | `SERPER_API_KEY` |

切换 Provider 只需更换 `provider`：

```ts
const response = await client.search({
  provider: 'exa',
  query: 'Recent advances in AI agent search',
})
```

显式 Provider 配置优先于环境变量，环境变量优先于 Provider 默认值。有关能力、
限制、选项和标准化字段，请参阅 [Provider 指南](docs/providers.md)。

## 文档

- [入门指南](docs/getting-started.md)
- [Provider 和能力矩阵](docs/providers.md)
- [API 参考](docs/api-reference.md)
- [开发与发布检查](docs/development.md)
- [架构](docs/architecture.md)
- [路线图](docs/roadmap.md)

## 贡献与安全

开发和评审规范见 [CONTRIBUTING.md](CONTRIBUTING.md)，问题反馈见
[SUPPORT.md](SUPPORT.md)，安全漏洞请按 [SECURITY.md](SECURITY.md) 的私密流程报告。
不要在 Issue 或 Pull Request 中包含 API Key、Authorization Header、`.env` 文件或
未经脱敏的 Provider 数据。

## 许可证

SearchSuite 使用 [MIT License](LICENSE)。
