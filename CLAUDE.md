# Creative Problem Solving - CPS 스캐폴딩 AI 에이전트

## 프로젝트 개요
대학생 예비교사 대상 창의적 문제해결(CPS) 과정에서 메타인지를 촉진하는 질문 기반 AI 스캐폴딩 시스템

**프로젝트명:** Pre-service Teacher Thinking Facilitator

## 기술 스택

### Frontend
- React 19 + Vite 6 + TypeScript
- Tailwind CSS 4
- Lucide React (아이콘), Motion (애니메이션), React Markdown

### Backend
- FastAPI + Uvicorn (ASGI)
- Google Gemini API (gemini-2.0-flash)
- SQLAlchemy 2.0 + Alembic (ORM + 마이그레이션)
- Pydantic v2 (검증)
- SQLite (개발) / PostgreSQL (운영)

## 프로젝트 구조

```
creative-problem-solving/
├── frontend/                  # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx            # 메인 UI
│   │   ├── services/
│   │   │   └── api.ts         # 백엔드 API 호출
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py            # FastAPI 앱 진입점
│   │   ├── api/
│   │   │   ├── chat.py        # /api/chat 라우터
│   │   │   └── research.py    # /api/research 라우터
│   │   ├── services/
│   │   │   └── gemini.py      # Gemini API + 프롬프트 엔지니어링
│   │   ├── models/
│   │   │   └── database.py    # SQLAlchemy 모델
│   │   ├── crud/
│   │   │   └── session.py     # DB CRUD 로직
│   │   ├── schemas/
│   │   │   └── chat.py        # Pydantic 스키마
│   │   └── core/
│   │       └── config.py      # 설정 관리
│   ├── requirements.txt
│   └── .env
│
└── docs/                      # 요구사항 및 기획 문서
    ├── 기획서.md
    ├── info.md
    └── 요구사항/
        ├── 설계 방향.docx
        ├── 설계 보고서.pdf
        └── 화면.docx
```

## 핵심 로직
- CPS 3단계: Understanding the Problem → Idea Generation → Planning for Action
- 상태 진단: 6가지 State (단계별 2개씩)
- 메타인지: Knowledge / Monitoring / Control 순환
- 응답 포맷: 공감 → 진단 → 질문(1개) → 재수행 유도

## 개발 명령어

### Frontend
```bash
cd frontend && npm install && npm run dev  # 개발 서버 (port 3000)
cd frontend && npm run build               # 빌드
```

### Backend
```bash
cd backend && pip install -r requirements.txt
cd backend && uvicorn app.main:app --reload --port 8000  # 개발 서버
```

## API 엔드포인트

### Chat API (`/api/chat`)
- `POST /session` — 새 CPS 세션 생성 (assignment_text 필수)
- `POST /message` — 메시지 전송 + 스캐폴딩 응답 생성

### Research API (`/api/research`)
- `GET /sessions` — 전체 세션 목록
- `GET /sessions/{id}/conversations` — 대화 히스토리
- `GET /sessions/{id}/metrics` — 세션 지표
- `GET /sessions/{id}/transitions` — 단계 전환 이력
- `GET /export/conversations/csv` — 대화 CSV Export
- `GET /export/metrics/csv` — 지표 CSV Export

## 환경변수

### Backend (.env)
```
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=sqlite+aiosqlite:///./cps_agent.db
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## 참고
- 기획서: docs/기획서.md
- 요구사항 원본: docs/요구사항/
- 프롬프트 전략: backend/app/services/gemini.py (SYSTEM_PROMPT)
