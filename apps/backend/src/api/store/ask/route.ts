import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ASK_MODULE } from "../../../modules/ask"
import type AskModuleService from "../../../modules/ask/service"

type AskBody = {
  message?: string
  sessionId?: string
}

/**
 * POST /store/ask
 *
 * Grounded catalog + FAQ assistant (rule-engine + optional Cohere rerank).
 * Body: { message, sessionId? } → { sessionId, message }
 */
export async function POST(
  req: MedusaRequest<AskBody>,
  res: MedusaResponse
) {
  const message = req.body?.message?.trim()
  if (!message) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "message is required"
    )
  }

  const askService: AskModuleService = req.scope.resolve(ASK_MODULE)

  try {
    const reply = await askService.sendMessage(req.scope, {
      message,
      sessionId: req.body?.sessionId,
    })
    res.status(200).json(reply)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ask failed"
    if (msg === "Message is required") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, msg)
    }
    throw error
  }
}
