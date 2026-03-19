import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.schemas.chat import ConversationResponse, SessionMetricResponse
from app.crud.session import (
    get_all_sessions, get_session,
    get_conversations, get_session_metric, get_stage_transitions,
)

router = APIRouter()


@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """모든 세션 조회"""
    sessions = await get_all_sessions(db)
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "assignment_text": s.assignment_text[:100],
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/conversations", response_model=list[ConversationResponse])
async def get_session_conversations(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """세션의 대화 히스토리 조회"""
    session = await get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    conversations = await get_conversations(db, session_id)
    return conversations


@router.get("/sessions/{session_id}/metrics", response_model=SessionMetricResponse)
async def get_metrics(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """세션 지표 조회"""
    metric = await get_session_metric(db, session_id)
    if not metric:
        raise HTTPException(status_code=404, detail="세션 지표를 찾을 수 없습니다.")
    return metric


@router.get("/sessions/{session_id}/transitions")
async def get_transitions(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """단계 전환 이력 조회"""
    transitions = await get_stage_transitions(db, session_id)
    return [
        {
            "id": t.id,
            "from_stage": t.from_stage,
            "to_stage": t.to_stage,
            "transition_reason": t.transition_reason,
            "created_at": t.created_at,
        }
        for t in transitions
    ]


@router.get("/export/conversations/csv")
async def export_conversations_csv(db: AsyncSession = Depends(get_db)):
    """전체 대화 데이터 CSV Export"""
    sessions = await get_all_sessions(db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "session_id", "conversation_id", "role", "message",
        "cps_stage", "metacog_elements", "response_depth", "created_at"
    ])

    for session in sessions:
        conversations = await get_conversations(db, session.id)
        for conv in conversations:
            writer.writerow([
                session.id,
                conv.id,
                conv.role,
                conv.message,
                conv.cps_stage,
                str(conv.metacog_elements) if conv.metacog_elements else "",
                conv.response_depth or "",
                conv.created_at.isoformat() if conv.created_at else "",
            ])

    output.seek(0)
    filename = f"conversations_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/metrics/csv")
async def export_metrics_csv(db: AsyncSession = Depends(get_db)):
    """전체 세션 지표 CSV Export"""
    sessions = await get_all_sessions(db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "session_id", "current_stage",
        "understanding_turns", "idea_generation_turns", "action_planning_turns",
        "shallow_responses", "medium_responses", "deep_responses",
        "knowledge_count", "monitoring_count", "control_count",
    ])

    for session in sessions:
        metric = await get_session_metric(db, session.id)
        if metric:
            writer.writerow([
                session.id,
                metric.current_stage,
                metric.understanding_turns,
                metric.idea_generation_turns,
                metric.action_planning_turns,
                metric.shallow_responses,
                metric.medium_responses,
                metric.deep_responses,
                metric.knowledge_count,
                metric.monitoring_count,
                metric.control_count,
            ])

    output.seek(0)
    filename = f"metrics_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
