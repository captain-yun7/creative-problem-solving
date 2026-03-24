from datetime import datetime

from pydantic import BaseModel


# --- Request ---

class SessionCreate(BaseModel):
    assignment_text: str
    user_id: str | None = None


class MessageRequest(BaseModel):
    session_id: int
    message: str
    current_stage: str = "understanding"
    checklist: dict | None = None  # 체크리스트 상태 전송


# --- Response ---

class ScaffoldingData(BaseModel):
    current_stage: str
    detected_metacog_needs: list[str]
    response_depth: str
    hint: str = ""
    should_transition: bool
    reasoning: str


class MessageResponse(BaseModel):
    agent_message: str
    scaffolding_data: ScaffoldingData
    turn_count: int
    max_turns: int
    limit_reached: bool


class SessionResponse(BaseModel):
    session_id: int
    current_stage: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    role: str
    message: str
    cps_stage: str | None
    metacog_elements: list[str] | None
    response_depth: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionMetricResponse(BaseModel):
    session_id: int
    current_stage: str | None
    understanding_turns: int
    idea_generation_turns: int
    action_planning_turns: int
    shallow_responses: int
    medium_responses: int
    deep_responses: int
    knowledge_count: int
    monitoring_count: int
    control_count: int

    class Config:
        from_attributes = True
