import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.schemas.chat import (
    SessionCreate, SessionResponse,
    MessageRequest, MessageResponse, ScaffoldingData,
)
from app.crud.session import (
    create_session, get_session,
    save_conversation, get_recent_conversations, get_session_metric,
    update_turn_count, update_metric_counts, record_stage_transition,
    TURN_LIMITS,
)
from app.services.gemini import generate_scaffolding

logger = logging.getLogger(__name__)

router = APIRouter()

# 단계 전환 키워드
TRANSITION_KEYWORDS = {
    "아이디어": "generation",
    "아이디어 생성": "generation",
    "실행 준비": "execution",
    "실행": "execution",
}

STAGE_ORDER = ["understanding", "generation", "execution"]


def _detect_explicit_transition(message: str, current_stage: str) -> str | None:
    """사용자 메시지에서 명시적 단계 전환 요청 감지"""
    msg_lower = message.lower().strip()

    # 키워드 기반 감지
    for keyword, target_stage in TRANSITION_KEYWORDS.items():
        if keyword in msg_lower:
            current_idx = STAGE_ORDER.index(current_stage) if current_stage in STAGE_ORDER else 0
            target_idx = STAGE_ORDER.index(target_stage)
            # 순방향 전환만 허용
            if target_idx > current_idx:
                return target_stage

    # "다음 단계", "넘어가", "진행" 등 감지
    transition_indicators = ["다음 단계", "넘어가", "이동", "진행"]
    if any(ind in msg_lower for ind in transition_indicators):
        current_idx = STAGE_ORDER.index(current_stage) if current_stage in STAGE_ORDER else 0
        if current_idx < len(STAGE_ORDER) - 1:
            return STAGE_ORDER[current_idx + 1]

    return None


@router.post("/session", response_model=SessionResponse)
async def create_new_session(
    request: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """새 CPS 세션 생성"""
    session = await create_session(db, request.assignment_text, request.user_id)
    return SessionResponse(
        session_id=session.id,
        current_stage="understanding",
        created_at=session.created_at,
    )


@router.post("/message", response_model=MessageResponse)
async def send_message(
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """메시지 전송 및 스캐폴딩 응답 생성"""
    # 1. 세션 확인
    session = await get_session(db, request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # 2. 현재 단계 및 메트릭 확인
    metric = await get_session_metric(db, request.session_id)
    current_stage = request.current_stage
    if metric and metric.current_stage:
        current_stage = metric.current_stage

    # 3. 명시적 단계 전환 감지
    explicit_transition = _detect_explicit_transition(request.message, current_stage)
    if explicit_transition:
        await record_stage_transition(
            db, request.session_id,
            from_stage=current_stage,
            to_stage=explicit_transition,
            reason="사용자 명시적 요청",
        )
        current_stage = explicit_transition
        if metric:
            metric.current_stage = current_stage
            await db.commit()

    # 4. 최근 대화 로드
    recent_convs = await get_recent_conversations(db, request.session_id)
    conversation_history = [
        {"role": c.role, "content": c.message} for c in recent_convs
    ]

    # 5. 턴 카운트 조회
    max_turns = TURN_LIMITS.get(current_stage, 6)
    turn_count = 0
    if metric:
        stage_column_map = {
            "understanding": "understanding_turns",
            "generation": "idea_generation_turns",
            "execution": "action_planning_turns",
        }
        col = stage_column_map.get(current_stage)
        if col:
            turn_count = getattr(metric, col, 0)

    # 6. 사용자 메시지 저장
    await save_conversation(
        db, request.session_id,
        role="user",
        message=request.message,
        cps_stage=current_stage,
    )

    # 7. Gemini 스캐폴딩 생성
    scaffolding = await generate_scaffolding(
        user_message=request.message,
        conversation_history=conversation_history,
        current_stage=current_stage,
        assignment_text=session.assignment_text,
        turn_count=turn_count,
        max_turns=max_turns,
    )

    # 8. Gemini 권고에 의한 단계 전환
    if scaffolding.get("should_transition") and not explicit_transition:
        gemini_stage = scaffolding.get("current_stage", current_stage)
        if gemini_stage != current_stage and gemini_stage in STAGE_ORDER:
            current_idx = STAGE_ORDER.index(current_stage)
            target_idx = STAGE_ORDER.index(gemini_stage)
            if target_idx > current_idx:
                await record_stage_transition(
                    db, request.session_id,
                    from_stage=current_stage,
                    to_stage=gemini_stage,
                    reason=scaffolding.get("reasoning", "Gemini 권고"),
                )
                current_stage = gemini_stage
                if metric:
                    metric.current_stage = current_stage
                    await db.commit()

    # 9. 에이전트 응답 구성 (4단 포맷)
    agent_message = "\n\n".join([
        scaffolding.get("empathy", ""),
        scaffolding.get("diagnosis", ""),
        scaffolding.get("question", ""),
        scaffolding.get("action_prompt", ""),
    ]).strip()

    # 10. 에이전트 메시지 저장
    response_depth = scaffolding.get("response_depth", "medium")
    metacog_needs = scaffolding.get("detected_metacog_needs", [])

    await save_conversation(
        db, request.session_id,
        role="agent",
        message=agent_message,
        cps_stage=current_stage,
        metacog_elements=metacog_needs,
        response_depth=response_depth,
    )

    # 11. 턴 카운트 업데이트
    new_turn, max_t, limit_reached = await update_turn_count(db, request.session_id, current_stage)

    # 12. 메트릭 카운트 업데이트
    await update_metric_counts(db, request.session_id, response_depth, metacog_needs)

    return MessageResponse(
        agent_message=agent_message,
        scaffolding_data=ScaffoldingData(
            current_stage=current_stage,
            detected_metacog_needs=metacog_needs,
            response_depth=response_depth,
            should_transition=scaffolding.get("should_transition", False),
            reasoning=scaffolding.get("reasoning", ""),
        ),
        turn_count=new_turn,
        max_turns=max_t,
        limit_reached=limit_reached,
    )
