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

export function isNotFoundError(error: unknown): boolean {
  return getFetchStatus(error) === 404
}
