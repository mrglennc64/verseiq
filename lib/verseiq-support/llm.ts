import { AgentMessage } from './types';

export async function callLLM(messages: AgentMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://useverseiq.com',
      'X-Title': 'VerseIQ Support',
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 512,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error('OpenRouter API error: ' + error);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
