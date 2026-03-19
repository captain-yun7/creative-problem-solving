from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.database import (
    Session as SessionModel,
    Conversation,
    SessionMetric,
    StageTransition,
)

# 단계별 턴 제한
TURN_LIMITS = {
    "understanding": 6,
    "generation": 8,
    "execution": 6,
}


# --- Session ---

async def create_session(db: AsyncSession, assignment_text: str, user_id: str | None = None) -> SessionModel:
    session = SessionModel(assignment_text=assignment_text, user_id=user_id)
    db.add(session)
    await db.flush()

    # 초기 메트릭 생성
    metric = SessionMetric(session_id=session.id, current_stage="understanding")
    db.add(metric)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: int) -> SessionModel | None:
    result = await db.execute(
        select(SessionModel).where(SessionModel.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_all_sessions(db: AsyncSession) -> list[SessionModel]:
    result = await db.execute(
        select(SessionModel).order_by(SessionModel.created_at.desc())
    )
    return list(result.scalars().all())


# --- Conversation ---

async def save_conversation(
    db: AsyncSession,
    session_id: int,
    role: str,
    message: str,
    cps_stage: str | None = None,
    metacog_elements: list[str] | None = None,
    response_depth: str | None = None,
) -> Conversation:
    conv = Conversation(
        session_id=session_id,
        role=role,
        message=message,
        cps_stage=cps_stage,
        metacog_elements=metacog_elements,
        response_depth=response_depth,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_conversations(db: AsyncSession, session_id: int) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.session_id == session_id)
        .order_by(Conversation.created_at.asc())
    )
    return list(result.scalars().all())


async def get_recent_conversations(db: AsyncSession, session_id: int, limit: int = 5) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.session_id == session_id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
    )
    conversations = list(result.scalars().all())
    conversations.reverse()  # 시간순 정렬
    return conversations


# --- SessionMetric ---

async def get_session_metric(db: AsyncSession, session_id: int) -> SessionMetric | None:
    result = await db.execute(
        select(SessionMetric).where(SessionMetric.session_id == session_id)
    )
    return result.scalar_one_or_none()


async def update_turn_count(
    db: AsyncSession, session_id: int, stage: str
) -> tuple[int, int, bool]:
    metric = await get_session_metric(db, session_id)
    if not metric:
        return 0, 0, False

    stage_column_map = {
        "understanding": "understanding_turns",
        "generation": "idea_generation_turns",
        "execution": "action_planning_turns",
    }

    column_name = stage_column_map.get(stage)
    if not column_name:
        return 0, 0, False

    current_value = getattr(metric, column_name)
    new_value = current_value + 1
    setattr(metric, column_name, new_value)
    metric.current_stage = stage
    metric.last_updated = datetime.utcnow()
    await db.commit()

    max_turns = TURN_LIMITS.get(stage, 999)
    limit_reached = new_value >= max_turns
    return new_value, max_turns, limit_reached


async def update_metric_counts(
    db: AsyncSession,
    session_id: int,
    response_depth: str | None = None,
    metacog_elements: list[str] | None = None,
):
    metric = await get_session_metric(db, session_id)
    if not metric:
        return

    # 응답 깊이 카운트
    if response_depth == "shallow":
        metric.shallow_responses += 1
    elif response_depth == "medium":
        metric.medium_responses += 1
    elif response_depth == "deep":
        metric.deep_responses += 1

    # 메타인지 요소 카운트
    if metacog_elements:
        for elem in metacog_elements:
            elem_lower = elem.lower()
            if elem_lower in ("knowledge", "지식"):
                metric.knowledge_count += 1
            elif elem_lower in ("monitoring", "점검"):
                metric.monitoring_count += 1
            elif elem_lower in ("control", "통제", "조절"):
                metric.control_count += 1

    metric.last_updated = datetime.utcnow()
    await db.commit()


# --- StageTransition ---

async def record_stage_transition(
    db: AsyncSession,
    session_id: int,
    from_stage: str,
    to_stage: str,
    reason: str | None = None,
):
    transition = StageTransition(
        session_id=session_id,
        from_stage=from_stage,
        to_stage=to_stage,
        transition_reason=reason,
    )
    db.add(transition)
    await db.commit()


async def get_stage_transitions(db: AsyncSession, session_id: int) -> list[StageTransition]:
    result = await db.execute(
        select(StageTransition)
        .where(StageTransition.session_id == session_id)
        .order_by(StageTransition.created_at.asc())
    )
    return list(result.scalars().all())
