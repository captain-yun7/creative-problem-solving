const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ScaffoldingData {
  current_stage: string;
  detected_metacog_needs: string[];
  response_depth: string;
  should_transition: boolean;
  reasoning: string;
}

interface MessageResponse {
  agent_message: string;
  scaffolding_data: ScaffoldingData;
  turn_count: number;
  max_turns: number;
  limit_reached: boolean;
}

interface SessionResponse {
  session_id: number;
  current_stage: string;
  created_at: string;
}

export async function createSession(assignmentText: string): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/api/chat/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment_text: assignmentText }),
  });
  if (!res.ok) throw new Error('세션 생성 실패');
  return res.json();
}

export async function sendMessage(
  sessionId: number,
  message: string,
  currentStage: string,
  checklist?: Record<string, boolean>,
): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      current_stage: currentStage,
      checklist: checklist || null,
    }),
  });
  if (!res.ok) throw new Error('메시지 전송 실패');
  return res.json();
}
