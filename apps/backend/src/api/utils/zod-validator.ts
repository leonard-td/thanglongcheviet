import { z } from "@medusajs/framework/zod"
import { MedusaError, isObject } from "@medusajs/framework/utils"

/**
 * `@medusajs/framework/zod` only re-exports the raw zod library at this
 * package version (its "./zod" export points at dist/deps/zod.js, not the
 * internal zod-helpers module) — the `zodValidator` helper every admin route
 * used to import from there does not actually exist at that path. This is a
 * local port of that same helper (error-message formatting included) so
 * request validation keeps working and doesn't silently resolve to
 * `undefined` at runtime.
 *
 * Zod v4's real issue types are a discriminated union with no index
 * signature, so — like the upstream helper this is ported from — issues are
 * deliberately handled as `any` here and duck-typed at runtime instead of
 * fighting those exact internal shapes.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Issue = any

function isInvalidTypeIssue(issue: Issue): boolean {
  return (
    isObject(issue) &&
    "code" in issue &&
    issue.code === "invalid_type" &&
    "expected" in issue &&
    "path" in issue &&
    Array.isArray(issue.path)
  )
}

function isInvalidUnionIssue(issue: Issue): boolean {
  return (
    isObject(issue) &&
    "code" in issue &&
    issue.code === "invalid_union" &&
    "errors" in issue &&
    Array.isArray(issue.errors)
  )
}

function isInvalidValueIssue(issue: Issue): boolean {
  return (
    isObject(issue) &&
    "code" in issue &&
    issue.code === "invalid_value" &&
    "path" in issue &&
    Array.isArray(issue.path)
  )
}

const formatPath = (issue: Issue) => issue.path.join(", ")

function getValueFromBody(issue: Issue, body: unknown): unknown {
  if (!isObject(body)) return undefined
  return (issue.path as (string | number)[]).reduce<unknown>((acc, curr) => {
    if (!isObject(acc)) return undefined
    return (acc as Record<string, unknown>)[curr as string]
  }, body)
}

function getReceivedValue(issue: Issue, body: unknown): unknown {
  if ("input" in issue) return issue.input
  if ("received" in issue) return issue.received
  return getValueFromBody(issue, body)
}

function formatInvalidType(issues: Issue[], body: unknown): string | undefined {
  const validIssues = issues.filter(isInvalidTypeIssue)
  const expected = validIssues
    .map((i) => (body !== undefined && getValueFromBody(i, body) !== undefined ? i.expected : undefined))
    .filter(Boolean)

  if (!expected.length) return undefined

  const firstIssue = validIssues[0]
  if (!firstIssue) return undefined

  const received = body !== undefined ? getValueFromBody(firstIssue, body) : "unknown"
  return `Expected type: '${expected.join(", ")}' for field '${formatPath(firstIssue)}', got: '${received}'`
}

function formatRequiredField(issues: Issue[], body: unknown): string | undefined {
  const requiredIssue = issues.find((i) => {
    if (isInvalidTypeIssue(i) || isInvalidValueIssue(i)) {
      return (body !== undefined ? getValueFromBody(i, body) : undefined) === undefined
    }
    return false
  })
  return requiredIssue ? `Field '${formatPath(requiredIssue)}' is required` : undefined
}

function formatUnionError(issue: Issue, body: unknown): string | undefined {
  if (!isInvalidUnionIssue(issue)) {
    return isObject(issue) && "message" in issue ? String(issue.message) : undefined
  }

  const parentPath = issue.path ?? []
  const issues = (issue.errors as unknown[])
    .flatMap((e) => (Array.isArray(e) ? e : isObject(e) && "issues" in e ? (e as { issues: Issue[] }).issues : []))
    .filter((i) => isObject(i) && "path" in i)
    .map((i: Issue) => ({ ...i, path: [...parentPath, ...i.path] }))

  if (!issues.length) return issue.message

  return formatInvalidType(issues, body) ?? formatRequiredField(issues, body) ?? issue.message
}

function formatError(err: z.ZodError, body: unknown): string {
  const issueMessages = err.issues.slice(0, 3).map((issue: Issue) => {
    switch (issue.code) {
      case "invalid_type":
        return formatInvalidType([issue], body) ?? formatRequiredField([issue], body) ?? issue.message
      case "invalid_value": {
        const receivedValue = getReceivedValue(issue, body)
        const hasReceivedValue = receivedValue !== undefined
        const values = issue.values as unknown[] | undefined
        if (values) {
          return hasReceivedValue
            ? `Expected: '${values.join(", ")}' for field '${formatPath(issue)}', but got: '${receivedValue}'`
            : `Field '${formatPath(issue)}' is required`
        }
        return hasReceivedValue ? issue.message : `Field '${formatPath(issue)}' is required`
      }
      case "invalid_union":
        return formatUnionError(issue, body)
      case "unrecognized_keys":
        return `Unrecognized fields: '${issue.keys.join(", ")}'`
      case "too_small":
        return `Value for field '${formatPath(issue)}' too small, expected at least: '${issue.minimum}'`
      case "too_big":
        return `Value for field '${formatPath(issue)}' too big, expected at most: '${issue.maximum}'`
      case "not_multiple_of":
        return `Value for field '${formatPath(issue)}' not multiple of: '${issue.divisor}'`
      default:
        return issue.message
    }
  })

  return issueMessages.join("; ")
}

function isZodError(err: unknown): err is z.ZodError {
  return err instanceof z.ZodError || (isObject(err) && "issues" in err && Array.isArray((err as { issues: unknown }).issues))
}

export async function zodValidator<T extends z.ZodType>(zodSchema: T, body: unknown): Promise<z.output<T>> {
  const strictSchema = "strict" in zodSchema && typeof (zodSchema as unknown as { strict: unknown }).strict === "function"
    ? (zodSchema as unknown as { strict: () => T }).strict()
    : zodSchema

  try {
    return await strictSchema.parseAsync(body)
  } catch (err) {
    if (isZodError(err)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Invalid request: ${formatError(err, body)}`)
    }
    throw err
  }
}
