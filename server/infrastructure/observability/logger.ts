import type { LogFields, Logger, LogLevel } from '../../application/ports'

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|session|email|api[-_]?key/i
const REDACTED = '[redacted]'
const MAX_DEPTH = 4

export interface LoggerOptions {
  readonly level: LogLevel
  readonly base?: LogFields
  readonly write?: (line: string) => void
}

export function createLogger(options: LoggerOptions): Logger {
  const write = options.write ?? (line => process.stdout.write(`${line}\n`))
  const threshold = LEVEL_WEIGHT[options.level]

  const log = (level: LogLevel, message: string, fields: LogFields = {}) => {
    if (LEVEL_WEIGHT[level] < threshold) return
    const record = { time: new Date().toISOString(), level, message, ...redact(options.base ?? {}, 0), ...redact(fields, 0) }
    write(JSON.stringify(record))
  }

  return {
    debug: (message, fields) => log('debug', message, fields),
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
    child: fields => createLogger({ ...options, base: { ...options.base, ...fields } }),
  }
}

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && value in LEVEL_WEIGHT
}

function redact(fields: LogFields, depth: number): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redactValue(value, depth + 1)]),
  )
}

function redactValue(value: unknown, depth: number): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message }
  if (depth > MAX_DEPTH) return '[truncated]'
  if (Array.isArray(value)) return value.map(item => redactValue(item, depth + 1))
  if (value && typeof value === 'object') return redact(value as LogFields, depth)
  return value
}
