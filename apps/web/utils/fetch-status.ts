/** Extract HTTP status from $fetch / ofetch errors (SSR + client). */
export function getFetchStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as Record<string, unknown>
  if (typeof e.statusCode === 'number') return e.statusCode
  if (typeof e.status === 'number') return e.status
  const response = e.response
  if (response && typeof response === 'object') {
    const status = (response as { status?: number }).status
    if (typeof status === 'number') return status
  }
  const data = e.data
  if (data && typeof data === 'object') {
    const code = (data as { statusCode?: number }).statusCode
    if (typeof code === 'number') return code
  }
  return undefined
}

/** Backend / ofetch error message body (safe to show in logs; not a secret). */
export function getFetchMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const e = error as Record<string, unknown>
  if (typeof e.message === 'string' && e.message) return e.message
  const data = e.data
  if (data && typeof data === 'object') {
    const msg = (data as { message?: unknown }).message
    if (typeof msg === 'string') return msg
  }
  const statusMessage = e.statusMessage
  if (typeof statusMessage === 'string') return statusMessage
  return ''
}

export function isNotFoundError(error: unknown): boolean {
  return getFetchStatus(error) === 404
}

/**
 * Medusa Store rejects requests when x-publishable-api-key is missing,
 * invalid, revoked, or not linked to a sales channel (HTTP 400 not_allowed).
 */
export function isPublishableKeyError(error: unknown): boolean {
  const status = getFetchStatus(error)
  if (status !== undefined && status !== 400 && status !== 401 && status !== 403) {
    return false
  }
  const msg = getFetchMessage(error).toLowerCase()
  if (!msg) {
    const data = error && typeof error === 'object'
      ? (error as { data?: { type?: string } }).data
      : undefined
    return data?.type === 'not_allowed'
  }
  return (
    msg.includes('publishable')
    || msg.includes('x-publishable-api-key')
    || msg.includes('valid publishable key')
  )
}

/** Status + message for product/article detail pages (never maps config failure → 404). */
export function resolveStoreLoadError(
  error: unknown,
  messages: { notFound: string, loadError: string, configError: string },
): { statusCode: number, statusMessage: string } {
  if (isPublishableKeyError(error)) {
    return { statusCode: 503, statusMessage: messages.configError }
  }
  const status = getFetchStatus(error) ?? 502
  if (status === 404) {
    return { statusCode: 404, statusMessage: messages.notFound }
  }
  const code = status >= 400 && status < 600 ? status : 502
  return { statusCode: code, statusMessage: messages.loadError }
}
