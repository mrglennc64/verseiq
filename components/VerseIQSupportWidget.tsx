'use client';

import { useState } from 'react';
import { sendAgentMessage } from '@/lib/verseiq-support/client';
import type { AgentMessage } from '@/lib/verseiq-support/types';

interface VerseIQSupportWidgetProps {
  scanId?: string;
  trackId?: string;
  scanSummary?: Record<string, unknown>;
  attributionSummary?: Record<string, unknown>;
}

export function VerseIQSupportWidget(props: VerseIQSupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: AgentMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await sendAgentMessage({
        sessionId,
        messages: [userMsg],
        context: {
          scanId: props.scanId,
          trackId: props.trackId,
          scanSummary: props.scanSummary,
          attributionSummary: props.attributionSummary,
        },
      });

      setSessionId(res.sessionId);
      setMessages([...newMessages, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            'I had trouble responding just now. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-slate-900 text-white px-4 py-3 shadow-lg flex items-center gap-2"
      >
        <span className="text-sm font-medium">Ask VerseIQ</span>
      </button>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div>
              <div className="text-sm font-semibold">VerseIQ Support</div>
              <div className="text-xs text-slate-500">
                Ask about your scan or attribution.
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
            {messages.length === 0 && (
              <div className="text-xs text-slate-500">
                You can ask things like “Explain my scan” or “What does my
                score mean?”.
              </div>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-900'
                  } text-xs`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-slate-400">Thinking…</div>
            )}
          </div>

          <div className="border-t border-slate-200 px-3 py-2 flex items-center gap-2">
            <input
              className="flex-1 text-xs px-2 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Type a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="text-xs px-3 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
