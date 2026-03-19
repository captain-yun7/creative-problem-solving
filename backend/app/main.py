from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.models.database import init_db
from app.api.chat import router as chat_router
from app.api.research import router as research_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="CPS Scaffolding AI Agent",
    description="창의적 문제해결(CPS) 메타인지 촉진 AI 에이전트 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(research_router, prefix="/api/research", tags=["Research"])


@app.get("/")
async def root():
    return {"message": "CPS Scaffolding AI Agent API", "status": "running"}
