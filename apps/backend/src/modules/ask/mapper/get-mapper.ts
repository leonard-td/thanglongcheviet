/**
 * QueryMapper factory — ASK_NLU_PROVIDER=rule only (TLCV).
 */

import { ruleQueryMapper } from "./rule-mapper"
import type { QueryMapper } from "./types"

let cached: QueryMapper | undefined

export function getQueryMapper(): QueryMapper {
  if (cached) return cached
  cached = ruleQueryMapper
  return cached
}

export function resetQueryMapperCache(): void {
  cached = undefined
}
