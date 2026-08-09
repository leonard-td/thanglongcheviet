/**
 * Cohere embed helper for Typesense hybrid (BM25 + vector).
 * Uses cohere-ai SDK v2.embed — embed-multilingual-v3.0 float[1024].
 */

import { CohereClient } from "cohere-ai"
import { COHERE_EMBED_MODEL } from "../../config/commerce"

export const COHERE_EMBED_DIMS = 1024

export type CohereInputType = "search_document" | "search_query"

const MAX_TEXTS_PER_CALL = 96

export async function embedTextsCohere(
  texts: readonly string[],
  inputType: CohereInputType,
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return []

  const cohere = new CohereClient({ token: apiKey })
  const out: number[][] = []

  for (let i = 0; i < texts.length; i += MAX_TEXTS_PER_CALL) {
    const batch = texts
      .slice(i, i + MAX_TEXTS_PER_CALL)
      .map((t) => t.slice(0, 2000))
    const response = await cohere.v2.embed({
      texts: batch,
      model: COHERE_EMBED_MODEL,
      inputType,
      embeddingTypes: ["float"],
      truncate: "END",
    })

    const floats = response.embeddings?.float
    if (!Array.isArray(floats) || floats.length !== batch.length) {
      throw new Error("Cohere v2.embed response missing embeddings.float")
    }
    out.push(...floats)
  }

  return out
}

export function productEmbedText(doc: {
  name: string
  descr: string
  category: string
  handle?: string
}): string {
  return [doc.name, doc.category, doc.handle, doc.descr]
    .filter(Boolean)
    .join("\n")
}
