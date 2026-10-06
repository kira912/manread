export type DomainErrorCode =
  | 'not_found'
  | 'invalid_input'
  | 'provider_unavailable'
  | 'provider_rate_limited'
  | 'provider_invalid_response'
  | 'storage_unavailable'
  | 'library_invariant'

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'not_found'

  constructor(readonly resource: string, readonly identifier: string) {
    super(`${resource} "${identifier}" was not found`)
  }
}

export class InvalidInputError extends DomainError {
  readonly code = 'invalid_input'

  constructor(message: string, readonly issues: readonly string[] = []) {
    super(message)
  }
}

export class ProviderUnavailableError extends DomainError {
  readonly code = 'provider_unavailable'

  constructor(readonly providerId: string, reason: string, options?: ErrorOptions) {
    super(`Provider "${providerId}" is unavailable: ${reason}`, options)
  }
}

export class ProviderRateLimitedError extends DomainError {
  readonly code = 'provider_rate_limited'

  constructor(readonly providerId: string, readonly retryAfterMs: number | null) {
    super(`Provider "${providerId}" is rate limited`)
  }
}

export class ProviderInvalidResponseError extends DomainError {
  readonly code = 'provider_invalid_response'

  constructor(readonly providerId: string, readonly issues: readonly string[]) {
    super(`Provider "${providerId}" returned an unexpected payload`)
  }
}

export class StorageUnavailableError extends DomainError {
  readonly code = 'storage_unavailable'
}

export class LibraryInvariantError extends DomainError {
  readonly code = 'library_invariant'
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
