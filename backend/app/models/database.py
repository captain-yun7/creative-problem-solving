from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=True)
    assignment_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="session", cascade="all, delete-orphan")
    stage_transitions = relationship("StageTransition", back_populates="session", cascade="all, delete-orphan")
    metrics = relationship("SessionMetric", back_populates="session", uselist=False, cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # "user" or "agent"
    message = Column(Text, nullable=False)
    cps_stage = Column(String(50), nullable=True)
    metacog_elements = Column(JSON, nullable=True)  # ["점검", "조절"]
    response_depth = Column(String(20), nullable=True)  # "shallow", "medium", "deep"
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="conversations")


class SessionMetric(Base):
    __tablename__ = "session_metrics"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), unique=True)
    current_stage = Column(String(50), default="understanding")

    # 단계별 턴 카운트
    understanding_turns = Column(Integer, default=0)      # 최대 6턴
    idea_generation_turns = Column(Integer, default=0)     # 최대 8턴
    action_planning_turns = Column(Integer, default=0)     # 최대 6턴

    # 응답 깊이 분포
    shallow_responses = Column(Integer, default=0)
    medium_responses = Column(Integer, default=0)
    deep_responses = Column(Integer, default=0)

    # 메타인지 요소 빈도
    knowledge_count = Column(Integer, default=0)
    monitoring_count = Column(Integer, default=0)
    control_count = Column(Integer, default=0)

    last_updated = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="metrics")


class StageTransition(Base):
    __tablename__ = "stage_transitions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), index=True)
    from_stage = Column(String(50))
    to_stage = Column(String(50))
    transition_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="stage_transitions")


# Async engine & session
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session_maker() as session:
        yield session
