import { AgentMessage } from './types';

export async function callLLM(messages: AgentMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 512,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error('OpenAI API error: ' + error);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
