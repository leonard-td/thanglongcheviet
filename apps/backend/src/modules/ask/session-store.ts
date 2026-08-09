import type { AskChatMessage } from "./types"

const sessions = new Map<string, AskChatMessage[]>()

export function appendAskMessages(
  sessionId: string,
  messages: AskChatMessage[]
): void {
  const existing = sessions.get(sessionId) ?? []
  sessions.set(sessionId, [...existing, ...messages])
}

export function listAskMessages(sessionId: string): AskChatMessage[] {
  return sessions.get(sessionId) ?? []
}
