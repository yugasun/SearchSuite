---
"searchsuite": minor
---

Add AnySearch web search with optional API keys and anonymous quota. HTTP 402 maps to `QuotaExceededError` and discards upstream error bodies that may contain credentials.
