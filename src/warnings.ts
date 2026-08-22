import type { SearchWarning } from './types.js'

export type WarningHandler = (warning: SearchWarning) => void

export function emitWarning(handler: WarningHandler | undefined, warning: SearchWarning): void {
  handler?.(warning)
}
