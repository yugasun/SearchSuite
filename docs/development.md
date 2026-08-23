# Development

This guide describes the commands and checks implemented in the current
repository. SearchSuite targets Node.js 24 or newer, is ESM-only, and uses the
package manager pinned in `package.json`: pnpm 10.32.1.

## Set up the repository

```sh
git clone https://github.com/yugasun/SearchSuite.git
cd SearchSuite
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install --frozen-lockfile
```

Use Node.js 24 for local release checks even if a newer Node.js version is also
available.

## Repository scripts

The scripts below are defined in [`package.json`](../package.json):

| Command | What it does |
| --- | --- |
| `pnpm build` | Runs tsdown and writes the ESM bundle, declarations, and source maps to `dist/`. |
| `pnpm typecheck` | Runs strict TypeScript checking without emitting files. It includes source, tests, examples, and type-consumer fixtures. |
| `pnpm lint` | Runs ESLint across the repository. |
| `pnpm test` | Runs only `test/unit` and `test/contract`; it is the offline default. |
| `pnpm test:live` | Runs credential-gated integration tests and can access provider APIs or consume credits. |
| `pnpm test:watch` | Starts Vitest watch mode for matching tests; live tests remain credential-gated. |
| `pnpm pack:check` | Builds the package and runs publint. It does not run tests or create a tarball. |

The default test command must remain offline. Mocked tests inject `fetch`; they
must never use a real endpoint or credential.

## Test a change

Run the offline quality checks:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec publint
```

Provider adapters require mocked request mapping, response mapping,
cancellation, and HTTP/error mapping coverage. Every built-in provider also
passes the shared contract suite in
[`test/contract/provider-contract.test.ts`](../test/contract/provider-contract.test.ts).
Keep regression payloads under `test/fixtures/`, remove credentials and
authorization data, and add a fixture before fixing a provider compatibility
regression.

Engine or `providerOptions` changes require type-inference coverage under
`test/typecheck/` or the focused type unit tests. Examples are also checked by
the repository TypeScript configuration.

## Run live tests explicitly

Live tests are optional and separate from `pnpm test`. They are skipped when the
matching credential is absent and use real provider APIs when it is present.
They can consume credits.

Create an ignored `.env` file, then run one provider deliberately:

```sh
node --env-file=.env node_modules/vitest/vitest.mjs run \
  test/integration/exa.live.test.ts
```

Use the corresponding `baidu`, `doubao`, `tavily`, or `serper` filename to test
another adapter. Run every configured live test only when intended:

```sh
node --env-file=.env node_modules/vitest/vitest.mjs run test/integration
```

SearchSuite reads environment variables but does not load `.env` itself. Never
commit the file or print credentials in test output.

## Build output

`pnpm build` cleans and creates `dist/` with:

- ESM JavaScript ending in `.js`;
- TypeScript declarations ending in `.d.ts`;
- source maps;
- dynamically imported provider chunks.

The published package must retain `"type": "module"`, an import-only export,
Node.js `>=24`, and zero runtime dependencies. `pnpm exec publint` validates the
package metadata against the built artifact.

## Manual pre-release checks

The following checks are release responsibilities; the current CI workflow does
not automate them.

Build and create a tarball:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec publint
mkdir -p .tmp
pnpm pack --pack-destination .tmp
tar -tzf .tmp/searchsuite-0.1.0.tgz
```

Use the filename printed by `pnpm pack` if the version changes. Confirm that the
archive contains only the intended `dist`, README files, license, changelog, and
package metadata, and contains no source credentials or `.env` file.

Install the tarball in a clean Node.js 24 ESM consumer:

```sh
tarball_path="$(pwd -P)/.tmp/searchsuite-0.1.0.tgz"
consumer_dir="$(mktemp -d)"
(
  cd "$consumer_dir"
  npm init -y
  npm pkg set type=module
  npm install --ignore-scripts "$tarball_path"
  node --input-type=module -e \
    "import { SearchSuite, SearchTimeoutError } from 'searchsuite'; const client = new SearchSuite(); const error = new SearchTimeoutError(); console.log(client.constructor.name, error.code)"
)
```

The runtime smoke only instantiates exported classes; it does not send a search
request. Continue in the same clean consumer to validate the packed declarations
and generic inference:

```sh
(
  cd "$consumer_dir"
  npm install --save-dev typescript

  cat > smoke.ts <<'EOF'
import { SearchSuite, type SearchResponse } from 'searchsuite'

const client = new SearchSuite()
const pending = client.search({
  engine: 'tavily:advanced',
  query: 'declaration smoke only',
  providerOptions: { chunksPerSource: 2 },
})

const typed: Promise<SearchResponse<'tavily:advanced'>> = pending
type Response = Awaited<typeof pending>
declare const response: Response
const engine: 'tavily:advanced' = response.engine
void typed
void engine
EOF

  cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["smoke.ts"]
}
EOF

  npx tsc --noEmit
)
```

This second smoke only type-checks `smoke.ts`; it does not execute it or perform
a live search. The in-repository fixture
[`test/typecheck/consumer.ts`](../test/typecheck/consumer.ts) covers the same
minimum inference cases, while the clean consumer also proves the declaration
paths inside the tarball.

## Current CI

The GitHub Actions workflow runs on a matrix of Node.js 24.x and the current
Node.js release. For each runtime it performs only these steps:

1. Check out the repository.
2. Set up pnpm and Node.js with the pnpm cache.
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm typecheck`.
5. Run `pnpm lint`.
6. Run the offline `pnpm test`.
7. Run `pnpm build`.
8. Run `pnpm exec publint`.

It does not run live tests, create or inspect the tarball, install a clean
consumer, validate registry installation, or publish the package.

## Keep documentation aligned

| Change | Required follow-up |
| --- | --- |
| Provider request/response behavior | Update mocked tests, fixtures, [Providers](providers.md), and [CHANGELOG](../CHANGELOG.md). |
| Provider capability flag | Update contract coverage, the capability matrix in [Providers](providers.md), and the changelog. |
| Engine or `providerOptions` type | Add type-inference coverage and update [Providers](providers.md), [API reference](api-reference.md), [technical design](../TECHNICAL_DESIGN.md), and the changelog. |
| Public request, response, error, default, or cancellation behavior | Update tests, [API reference](api-reference.md), technical design, and the changelog. |
| Build, test, or release workflow | Update this guide and the changelog when user-visible. |

Keep local planning and design-history notes outside the published documentation
set. Public behavior and its rationale belong in `TECHNICAL_DESIGN.md` and
`CHANGELOG.md`.
