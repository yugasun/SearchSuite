# SearchSuite

[English](https://github.com/yugasun/SearchSuite/blob/main/README.md)

[![CI](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml/badge.svg)](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml)
![Node.js >=24](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=node.js&logoColor=white)
![ESM only](https://img.shields.io/badge/modules-ESM--only-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/yugasun/SearchSuite/blob/main/LICENSE)

用一套类型安全的 API 接入百度、豆包、Tavily、Exa 和 Serper 搜索。

SearchSuite 是一个独立于框架的 TypeScript SDK，通过 `await client.search({ engine: 'provider:engine', ... })` 将不同网络搜索提供商的 API 统一起来。它源自 `dsh-web-search` 的 Provider 层，但核心 SDK 不依赖 DeepSeek Harness 或任何其他 Agent 框架。

> **状态：** v0.1 已实现，可在本地评估，但仍处于预发布阶段，尚未发布到 npm。首次发布前，公共 API 仍可能调整。

## 为什么选择 SearchSuite？

- **统一的类型安全 API：** 五个 Provider 使用相同的请求和响应结构。
- **按 Engine 切换：** 使用 `tavily:advanced`、`exa:auto` 等字面量选择具体实现。
- **与 Engine 联动的选项：** TypeScript 会根据所选 Engine 推断有效的 `providerOptions`；运行时，Provider 会拒绝未知选项键。
- **统一的结果与错误模型：** 获得标准化的结果、用量、延迟、取消、超时和 Provider 错误元数据，同时在 `raw` 中保留经过安全处理的 Provider 数据。
- **轻量且独立的核心：** 使用原生 `fetch`，仅支持 ESM，零运行时依赖，不耦合 Agent 框架。

## 环境要求

- Node.js 24 或更高版本
- ESM 项目；不支持 CommonJS 和 `require()`

SearchSuite 提供 TypeScript 类型声明，并使用 Node.js 提供的 Web Platform `fetch`、`AbortSignal` 和 `AbortController` API。

## 从本地包安装

该包尚未发布到 npm。克隆仓库、完成构建，并生成一个符合 npm 发布格式的本地 tarball：

```sh
git clone https://github.com/yugasun/SearchSuite.git
cd SearchSuite
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm pack --pack-destination .tmp
```

在一个干净的消费端项目中安装该 tarball：

```sh
cd ..
mkdir searchsuite-consumer
cd searchsuite-consumer
npm init -y
npm install ../SearchSuite/.tmp/searchsuite-0.1.0.tgz
```

请确保生成的 tarball 路径与 `pnpm pack` 输出的版本一致。

## 快速开始

在服务端进程中设置凭据，然后创建 `app.mjs`：

```sh
export TAVILY_API_KEY='your-api-key'
```

```js
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()

const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})

for (const result of response.results) {
  console.log(result.title, result.url)
}
```

```sh
node app.mjs
```

SDK 会在首次使用该 Provider 时解析 `TAVILY_API_KEY`。请将 Provider 凭据保留在服务端，不要暴露在浏览器 bundle 中，也不要提交到源代码仓库。

## 切换 Provider

准备好相应凭据后，只需更换 Engine 即可切换 Provider：

```js
const response = await client.search({
  engine: 'exa:auto',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})
```

## 支持的 Provider

| Provider | 已实现的 Engine | 凭据环境变量 |
| --- | --- | --- |
| Baidu | `baidu:web`, `baidu:ai` | `BAIDU_API_KEY` 或 `QIANFAN_API_KEY` |
| Doubao | `doubao:custom`, `doubao:global` | `DOUBAO_API_KEY` 或 `DOUBAO_SEARCH_API_KEY` |
| Tavily | `tavily:basic`, `tavily:advanced`, `tavily:fast`, `tavily:ultra-fast` | `TAVILY_API_KEY` |
| Exa | `exa:auto`, `exa:keyword`, `exa:neural` | `EXA_API_KEY` |
| Serper | `serper:google` | `SERPER_API_KEY` |

有关通用参数支持、限制、标准化字段和 Provider 特有行为，请参阅 [Provider 指南和能力矩阵](https://github.com/yugasun/SearchSuite/blob/main/docs/providers.md)。`score` 保留各 Provider 自身的语义，不应跨 Provider 比较。

## 配置

每个配置字段都按以下优先级独立解析：

```text
explicit provider configuration > corresponding environment variable > provider default
```

显式配置适用于受控的服务端环境和兼容端点：

```js
const client = new SearchSuite({
  providers: {
    tavily: {
      apiKey: '<server-side-api-key>',
      baseUrl: 'https://api.tavily.com',
    },
  },
})
```

本地开发时，Node.js 24 无需额外安装包即可加载 `.env` 文件：

```dotenv
TAVILY_API_KEY=your-api-key
```

```sh
node --env-file=.env app.mjs
```

SearchSuite 会读取 Provider 环境变量，但**不会**自行发现或加载 `.env` 文件。

## 类型安全的 Provider 选项

Provider 特有功能统一放在 `providerOptions` 中。TypeScript 会根据 `engine` 推断有效的键和值类型；运行时，Provider 会拒绝未知选项键：

```ts
const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Latest retrieval-augmented generation research',
  providerOptions: {
    topic: 'general',
    includeAnswer: 'advanced',
    includeRawContent: 'markdown',
    chunksPerSource: 2,
  },
})
```

例如，TypeScript 会拒绝为 `tavily:basic` 设置 `chunksPerSource`，因为该选项仅适用于 `tavily:advanced` 引擎。

## 错误、超时和取消

`timeoutMs` 是 SDK 的请求截止时间。调用方提供的 `AbortSignal` 仍是独立的取消来源：

```js
import {
  SearchAbortedError,
  SearchSuite,
  SearchSuiteError,
  SearchTimeoutError,
} from 'searchsuite'

const client = new SearchSuite({ timeoutMs: 30_000 })
const controller = new AbortController()
const cancellation = setTimeout(() => controller.abort(), 2_000)

try {
  const response = await client.search({
    engine: 'serper:google',
    query: 'Node.js ESM package design',
    signal: controller.signal,
  })
  console.log(response.results)
} catch (error) {
  if (error instanceof SearchTimeoutError) {
    console.error('The SearchSuite deadline expired')
  } else if (error instanceof SearchAbortedError) {
    console.error('The caller cancelled the search')
  } else if (error instanceof SearchSuiteError) {
    console.error(error.code, error.provider, error.retryable)
  } else {
    throw error
  }
} finally {
  clearTimeout(cancellation)
}
```

Provider 失败会被映射为带有安全元数据的稳定错误类。`retryable` 标记用于描述错误是否可重试；SearchSuite v0.1 不会自动重试，也不会回退到其他 Provider。

## v0.1 范围

SearchSuite v0.1 聚焦统一搜索 API 和五个轻量 Provider Adapter，并明确不包含：

- Provider 路由、回退、重试、多 Key 选择、配额或成本路由
- 联邦搜索、结果融合、重排或缓存
- Extract、Crawl 或 `web_fetch`
- Gateway、SaaS 层或 DeepSeek Harness 插件

这些能力可以构建在 SDK 之上，无需让 Provider 兼容层耦合到某一种编排模型。

## 文档

- [文档索引](https://github.com/yugasun/SearchSuite/blob/main/docs/README.md)
- [入门指南](https://github.com/yugasun/SearchSuite/blob/main/docs/getting-started.md)
- [Provider 和能力矩阵](https://github.com/yugasun/SearchSuite/blob/main/docs/providers.md)
- [API 参考](https://github.com/yugasun/SearchSuite/blob/main/docs/api-reference.md)
- [开发与测试](https://github.com/yugasun/SearchSuite/blob/main/docs/development.md)
- [架构](https://github.com/yugasun/SearchSuite/blob/main/docs/architecture.md)
- [路线图](https://github.com/yugasun/SearchSuite/blob/main/docs/roadmap.md)
- [变更日志](https://github.com/yugasun/SearchSuite/blob/main/CHANGELOG.md)

设计基线记录在 [TECHNICAL_DESIGN.md](https://github.com/yugasun/SearchSuite/blob/main/TECHNICAL_DESIGN.md) 中。

## 贡献、支持与安全

欢迎贡献。在提出公共 API 或 Provider 行为变更前，请先阅读 [CONTRIBUTING.md](https://github.com/yugasun/SearchSuite/blob/main/CONTRIBUTING.md)。使用问题和 Bug 报告指南请参阅 [SUPPORT.md](https://github.com/yugasun/SearchSuite/blob/main/SUPPORT.md)。

请通过 [SECURITY.md](https://github.com/yugasun/SearchSuite/blob/main/SECURITY.md) 中说明的私密流程报告安全漏洞。切勿在公开 Issue 中包含 API Key、Authorization Header、`.env` 文件或未经脱敏的 Provider 响应。

## 许可证

SearchSuite 使用 [MIT License](https://github.com/yugasun/SearchSuite/blob/main/LICENSE)。
