export const REDACTED_SECRET = "••••••••"

export function isRedactedSecret(value: unknown): boolean {
  return value === REDACTED_SECRET
}
