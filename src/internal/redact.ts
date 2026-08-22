const SENSITIVE_KEY = /(?:api[-_]?key|access[-_]?token|authorization|credential|password|secret|token)/i
const BEARER_VALUE = /Bearer\s+[^\s,;]+/gi

function redactString(value: string): string {
  try {
    const url = new URL(value)
    let changed = false
    for (const key of url.searchParams.keys()) {
      if (SENSITIVE_KEY.test(key)) {
        url.searchParams.set(key, '[REDACTED]')
        changed = true
      }
    }
    if (changed) return url.toString()
  } catch {
    // Not a URL; apply the bearer-token rule below.
  }
  return value.replace(BEARER_VALUE, 'Bearer [REDACTED]')
}

function toSafeValue(value: unknown, redact: boolean, seen: WeakSet<object>): unknown {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return redact ? redactString(value) : value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') return String(value)
  if (value instanceof Date) return value.toISOString()
  if (value instanceof URL) return redact ? redactString(value.toString()) : value.toString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redact ? redactString(value.message) : value.message,
    }
  }
  if (typeof value !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => toSafeValue(item, redact, seen))
  }

  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    output[key] = redact && SENSITIVE_KEY.test(key)
      ? '[REDACTED]'
      : toSafeValue(child, redact, seen)
  }
  return output
}

export function toJsonSafe(value: unknown): unknown {
  return toSafeValue(value, false, new WeakSet())
}

export function redactSecrets(value: unknown): unknown {
  return toSafeValue(value, true, new WeakSet())
}
