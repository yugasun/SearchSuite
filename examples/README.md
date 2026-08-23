# SearchSuite examples

这些示例使用 Node.js 24 直接运行 TypeScript 文件，无需额外安装 `tsx`。

## 准备环境

examples 通过目录依赖使用仓库根目录的 SearchSuite，不需要从 npm 安装已发布版本。
先在仓库根目录构建 SDK，再安装 examples 的开发依赖：

```sh
cd ..
pnpm build
cd examples
pnpm install
```

运行时只有本地的 `searchsuite` 是必需依赖；TypeScript 和 `@types/node` 仅用于
类型检查，不需要 `tsdown`。

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

## 类型检查

运行示例使用 `node`，类型检查使用 TypeScript：

```sh
pnpm typecheck
```

不要使用 `pnpm tsc ./basic-search.ts`，因为指定文件后 TypeScript 不会读取
项目的 `tsconfig.json`，顶层 `await` 等 ESM 配置会失效。
