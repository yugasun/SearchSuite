# searchsuite

## 0.2.0

### Minor Changes

- 70022a2: Add DeepSeek, Zhipu, Bocha, and Alibaba search providers, plus DeepSeek and Zhipu page content fetching.

## Unreleased

### Added

- Add DeepSeek, Zhipu, Bocha, and Alibaba search providers with typed options,
  environment credentials, normalized results, and provider-specific limits.
- Alibaba uses native DashScope generation with web search and source citations;
  an explicit workspace origin is required and model/token charges may apply
  alongside search charges.
- Add official DeepSeek Fetch and Zhipu Reader adapters with typed options,
  normalized text results, and credential-gated live coverage.

### Changed

- Redesign the shared landing/README architecture diagram as a horizontal
  provider map with embedded supplier icons, animated request paths, and a
  reduced-motion view. Preserve explicit single-provider request semantics.
- Share search/fetch option validation and lazy registry initialization while
  keeping adapter-specific rules, defaults, and separate provider caches.
- Centralize fetch URL policy before provider initialization and remove the
  duplicate DeepSeek URL length check from its adapter. Fetch value errors now
  use the shared `Provider option` wording with fetch operation metadata.

## 0.1.3

### Patch Changes

- de65b34: Fix provider-first searches so consumed mode selectors are not forwarded to
  provider adapters as unknown provider options.

## 0.1.2

### Patch Changes

- 0ad25e1: Validate provider-specific search and fetch option values at runtime, including
  provider mode selectors, before making upstream requests.
