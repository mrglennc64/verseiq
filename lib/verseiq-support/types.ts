export type AgentRole = 'system' | 'user' | 'assistant';

export interface AgentMessage {
  role: AgentRole;
  content: string;
}

export interface AgentContext {
  scanId?: string;
  trackId?: string;
  scanSummary?: Record<string, unknown>;
  attributionSummary?: Record<string, unknown>;
}

export interface AgentChatRequest {
  sessionId?: string;
  messages: AgentMessage[];
  context?: AgentContext;
}

export interface AgentChatResponse {
  reply: string;
  sessionId: string;
}
