# 测试、CI 与发布

状态：Approved for implementation

适用版本：v0.1.x

## 1. 测试结构

```text
                 Live Integration
             少量、可选、需要凭据
                       ▲
              Provider Contract
          五家执行同一组运行时行为
                       ▲
           Provider Mapping + Core Unit
                       ▲
                  Type Tests
         engine/options/public declarations
```

默认套件必须离线、确定、零外部额度。

## 2. Type tests

使用 TypeScript 编译和 Vitest `expectTypeOf` 或专用 type fixture 验证：

- engine literal 是准确 union。
- `tavily:*` 只接受 `TavilySearchOptions`。
- 其他 Provider option 不能误传给当前 engine。
- response.engine 保留输入 literal。
- readonly 输入集合可接受，返回集合类型稳定。
- 非法 engine、非法 option 和错误字段通过 `@ts-expect-error` 证明会失败。
- 发布后的 `.d.ts` 在 consumer fixture 中工作，而不只测试源码类型。

## 3. Core Unit Test

- engine 正常解析、大小写、缺少冒号、空值、未知 provider/engine
- query、maxResults、domain normalization 和 include/exclude 冲突
- Provider 动态 import、惰性缓存与并发初始化 Promise
- 配置优先级和空字符串语义
- strict/warn/ignore 与 `onWarning`
- 注入 fetch 与 global fetch 选择
- request 前已 abort、请求中 abort、SDK timeout 和竞态
- performance latency 口径
- Error code、metadata、cause 和 redaction
- raw 的 JSON/structuredClone 兼容

## 4. Provider Mapping Test

每家通过注入 fetch 测试，不 patch Provider 私有实现：

- 每个 engine 的 URL、method、header 和 body
- common fields 与 provider options
- maxResults 上限、查询限制和 warning
- 正常、空、缺字段、多结果和畸形响应
- title fallback、URL 过滤、snippet/content、score、date
- response/result/usage raw 保留与秘密清理
- 认证、限流、配额、4xx、5xx、timeout、abort、连接和 JSON 错误

Fixture 来源于脱敏后的真实响应或官方示例，保持最小但保留关键结构。禁止在仓库出现真实 token。

## 5. Contract Test

Contract Test 使用各自 Fixture 对五个 Provider 运行同一断言：

```ts
function assertSearchContract<E extends SearchEngine>(
  response: SearchResponse<E>,
  engine: E,
): void {
  expect(response.query.trim()).not.toBe('')
  expect(response.engine).toBe(engine)
  expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  expect(Array.isArray(response.results)).toBe(true)
  expect(response.answer === undefined || response.answer.trim() !== '').toBe(true)

  for (const result of response.results) {
    expect(result.title.trim()).not.toBe('')
    expect(new URL(result.url).protocol).toMatch(/^https?:$/)
  }
}
```

同时验证：空结果成功、远端顺序保留、raw 无测试密钥、不支持参数符合模式、错误均属于统一层级、响应可 JSON 序列化。

## 6. Live Integration Test

- 目录 `test/integration/`，marker/环境开关显式启用。
- 默认 `pnpm test` 不加载该目录；需要主动运行 `pnpm test:live`。
- 无对应 key 时 skip。
- 查询稳定、无敏感信息、`maxResults` 小。
- 不断言具体标题、排名或固定数量。
- fork PR 与不可信 CI 不加载 Secrets。
- 失败输出不打印请求 Header 或完整账户响应。
- 定时或手动运行，Provider 独立报告。

## 7. CI Quality Gates

PR 流水线：

1. pnpm frozen install。
2. TypeScript typecheck。
3. lint 与格式检查。
4. Vitest unit、mapping、contract 和 type test。
5. Node.js 24 与 Node Current 构建。
6. tsdown 生成 ESM、`.d.ts`、sourcemap。
7. `publint` 和 Are The Types Wrong。
8. `pnpm pack`，在临时干净 consumer 安装并运行 ESM/类型 smoke test。
9. 检查 runtime dependency 为零、README 链接和 secrets。

建议覆盖率：Core 行覆盖率不低于 90%，新 Provider 的 mapping/error 分支必须由 Fixture 覆盖。覆盖率是信号，不得用无意义断言换数字。

## 8. Package contract

```json
{
  "name": "searchsuite",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=24" },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

不提供 `require` condition、CJS 文件或默认 CommonJS fallback。发布前验证 npm 包名、repository metadata、license 和 provenance 配置。

## 9. 版本策略

- patch：Provider mapping/error 修复，不改变公共语义。
- minor：新增 Provider、engine、向后兼容字段或 options。
- major：删除/重命名 public export、改变默认行为、engine 语义、Node 最低版本或取消语义。

Provider 服务端紧急变化仍需 Fixture、Contract Test 和 CHANGELOG，不得绕过公共 API Review。

## 10. v0.1.0 Release Checklist

- [ ] 五家 Provider 的 Mapping、Contract 和最小 Live Test 通过
- [ ] 所有 public exports 有 TSDoc 和稳定类型
- [ ] engine/options 正反例 type tests 通过
- [ ] Node.js 24 和 Current CI 通过
- [ ] 发布包零 runtime dependency
- [ ] ESM-only package metadata 正确
- [ ] packed artifact 的 import、declaration、sourcemap 正常
- [ ] README Quick Start 在干净环境运行
- [ ] 示例和错误输出通过秘密扫描
- [ ] Provider 能力矩阵与官方文档复核
- [ ] CHANGELOG 记录已知限制
- [ ] API Review 确认无 Router、retry、fallback、dsh plugin 等越界能力
- [ ] Test registry 验证后发布 `0.1.0`

## 11. 故障处理

npm 版本不可覆盖；发现问题发布修复版本。Provider 服务端破坏兼容时，可在 patch 版本暂时让受影响 engine 返回明确错误，但不得静默切换到另一 Provider 或 endpoint。
