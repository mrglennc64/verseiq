import { NextRequest, NextResponse } from 'next/server';
import { AgentChatRequest, AgentChatResponse } from '@/lib/verseiq-support/types';
import { getOrCreateSessionMessages, appendToSession } from '@/lib/verseiq-support/memory';
import { SYSTEM_PROMPT } from '@/lib/verseiq-support/system-prompt';
import { callLLM } from '@/lib/verseiq-support/llm';
import { findFaqAnswer } from '@/lib/verseiq-support/faq-matcher';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AgentChatRequest;

  const sessionId = body.sessionId || crypto.randomUUID();
  const history = getOrCreateSessionMessages(sessionId);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    ...body.messages,
  ];

  // Use the last user message for FAQ matching
  const lastUserMsg = body.messages?.slice().reverse().find(m => m.role === 'user');
  let replyText: string | null = null;
  if (lastUserMsg) {
    replyText = findFaqAnswer(lastUserMsg.content);
  }

  // If no FAQ match, call OpenAI
  if (!replyText) {
    replyText = await callLLM(messages);
  }

  appendToSession(sessionId, body.messages, {
    role: 'assistant',
    content: replyText,
  });

  const response: AgentChatResponse = {
    reply: replyText,
    sessionId,
  };

  return NextResponse.json(response);
}
