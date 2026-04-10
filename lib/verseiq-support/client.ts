import { AgentChatRequest, AgentChatResponse } from './types';

export async function sendAgentMessage(
  payload: AgentChatRequest
): Promise<AgentChatResponse> {
  const res = await fetch('/api/support/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to contact VerseIQ agent');
  }

  return res.json();
}
