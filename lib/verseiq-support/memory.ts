import type { AgentMessage } from './types';

const sessions = new Map<string, AgentMessage[]>();

export function getOrCreateSessionMessages(sessionId: string): AgentMessage[] {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId)!;
}

export function appendToSession(
  sessionId: string,
  userMessages: AgentMessage[],
  assistantMessage: AgentMessage
) {
  const history = getOrCreateSessionMessages(sessionId);
  history.push(...userMessages, assistantMessage);
  sessions.set(sessionId, history);
}
