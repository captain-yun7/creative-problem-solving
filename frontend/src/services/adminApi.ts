const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SessionSummary {
  id: number;
  user_id: string | null;
  assignment_text: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationItem {
  id: number;
  role: string;
  message: string;
  cps_stage: string | null;
  metacog_elements: string[] | null;
  response_depth: string | null;
  created_at: string;
}

export interface SessionMetrics {
  session_id: number;
  current_stage: string | null;
  understanding_turns: number;
  idea_generation_turns: number;
  action_planning_turns: number;
  shallow_responses: number;
  medium_responses: number;
  deep_responses: number;
  knowledge_count: number;
  monitoring_count: number;
  control_count: number;
}

export interface StageTransition {
  id: number;
  from_stage: string;
  to_stage: string;
  transition_reason: string | null;
  created_at: string;
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${API_BASE}/api/research/sessions`);
  if (!res.ok) throw new Error('세션 목록 조회 실패');
  return res.json();
}

export async function fetchConversations(sessionId: number): Promise<ConversationItem[]> {
  const res = await fetch(`${API_BASE}/api/research/sessions/${sessionId}/conversations`);
  if (!res.ok) throw new Error('대화 기록 조회 실패');
  return res.json();
}

export async function fetchMetrics(sessionId: number): Promise<SessionMetrics> {
  const res = await fetch(`${API_BASE}/api/research/sessions/${sessionId}/metrics`);
  if (!res.ok) throw new Error('세션 지표 조회 실패');
  return res.json();
}

export async function fetchTransitions(sessionId: number): Promise<StageTransition[]> {
  const res = await fetch(`${API_BASE}/api/research/sessions/${sessionId}/transitions`);
  if (!res.ok) throw new Error('단계 전환 이력 조회 실패');
  return res.json();
}

export function getConversationsCsvUrl(): string {
  return `${API_BASE}/api/research/export/conversations/csv`;
}

export function getMetricsCsvUrl(): string {
  return `${API_BASE}/api/research/export/metrics/csv`;
}
