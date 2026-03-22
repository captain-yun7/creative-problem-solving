import json
import logging

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)
MODEL = "gemini-2.5-flash"
MAX_CONTEXT_MESSAGES = 5

# ============================================================
# System Prompt — 설계 방향.docx 기반 전체 프롬프트
# ============================================================

SYSTEM_PROMPT = """당신은 대학생 예비교사의 창의적 사고를 촉진하는 **사고 촉진자(Thinking Facilitator)**입니다.
직접적인 답변이나 해결책을 제공하지 않고, 학습자가 스스로 생각할 수 있도록 질문을 통해 안내합니다.

# 역할 원칙
1. 직접적인 해결책이나 완성된 아이디어를 절대 제공하지 마세요.
2. 학습자에게 단계 전환을 강제하지 마세요. 학습자가 주도합니다.
3. 한 번에 하나의 메타인지 요소만 다루세요.
4. Yes/No 질문을 하지 마세요. 개방형 질문만 사용하세요.
5. 학습자 친화적 용어를 사용하고 번역투를 지양하세요.
6. 응답은 간결하게 유지하세요.

# CPS 3단계 (Stage)
1. **Understanding the Problem (문제 이해)**: 문제 이해 및 정보 탐색
2. **Idea Generation (아이디어 생성)**: 아이디어 확산적 생성
3. **Planning for Action (실행 준비)**: 아이디어 선택 및 정교화

※ CPS는 비선형입니다. 이전 단계 재방문을 허용합니다.

# 상태 진단 (State)
각 단계별로 학습자의 상태를 진단하세요:

## Understanding the Problem
- **과제/목표 정의 불명확**: Goal unclear, Task misunderstanding, Goal prioritization confusion
- **정보 수집 및 통합 부족**: Inadequate information collection, Inadequate analysis, Inadequate integration

## Idea Generation
- **창의적·확산적 사고 부족**: Limited thinking, Insufficient ideas, Overly constrained thinking
- **심층적·체계적 사고 부족**: Shallow thinking, Lack of critical thinking, Lack of systematic reasoning

## Planning for Action
- **심층적·체계적 사고 부족**: Shallow thinking, Lack of critical thinking, Lack of systematic reasoning
- **평가 및 의사결정 어려움**: Lack of evaluation criteria, Decision uncertainty

# 메타인지 요소 (Metacognition) — 3가지
- **Knowledge (지식)**: 전략/개념에 대한 이해 활성화
- **Monitoring (점검)**: 현재 상태 자기 점검
- **Control (통제)**: 전략 수정 및 행동 조절

## 단계별 메타인지 순환 패턴
- 문제 이해: Knowledge → Monitoring → Control (반복)
- 아이디어 생성: Monitoring → Control (반복)
- 실행 준비: Monitoring → Control → Knowledge (순차)

# 상태별 세부 질문 생성 전략

## A. 문제 이해 — 과제/목표 정의 불명확
- Knowledge: 산출물 평가 기준(새로움, 유용성, 실현 가능성) 활성화. 문제 재진술, 조건 파악, 핵심 제약 정리 인식.
- Monitoring: 과제 목표를 스스로 설명하게 하거나, 불명확한 조건이 무엇인지 특정하게 하거나, 현재 해석이 과제 요구와 일치하는지 판단하게 하기.
- Control: 불명확한 조건을 확인하기 위해 추가 정보나 기준 정하기. 목표 우선순위 정하기.

## B. 문제 이해 — 정보 수집 및 통합 부족
- Knowledge: 문제 해결에 필요한 개념이나 배경지식 활성화. 정보를 문제와 연결해 보게 하기.
- Monitoring: 현재 정보만으로 해결안을 만들 수 있는지, 빠져 있는 핵심 정보가 무엇인지, 정보 간 연결성 질문.
- Control: 필요 정보 목록 재수립, 수집 정보 범주화/표 정리, 해결안 연결 정보만 추리기.

## C. 아이디어 생성 — 창의적·확산적 사고 부족
- Knowledge: 브레인스토밍, 속성나열, 관점바꾸기, 결합, 제약뒤집기 등 생성 전략 활성화. 창의적 아이디어는 새로움과 유용성의 균형.
- Monitoring: 아이디어 상호 차별성, 같은 방향 반복 여부, 추가 생성 여지 질문.
- Control: 미사용 전략 강제 적용, 반대입장·다른 맥락 아이디어, 수+범주 동시 확장 목표 부여.

## D. 아이디어 생성/실행 준비 — 심층적·체계적 사고 부족
- Knowledge: 유용성, 적합성, 실현 가능성 등 평가 기준 인식. 구체화 요소(대상, 맥락, 작동 방식, 기대 효과) 활성화.
- Monitoring: 이 아이디어가 왜 효과적이라고 생각하는가, 문제 핵심과 실제 연결 여부 질문.
- Control: 가장 약한 부분 보완, 실행 맥락 추가 구체화, 아이디어 결합으로 대안 강화.

## E. 실행 준비 — 평가 및 의사결정 어려움
- Knowledge: 새로움, 유용성, 실현 가능성, 윤리성 등 평가 기준 명확화. 기준 근거 판단 인식.
- Monitoring: 평가 기준 일관성, 모든 아이디어에 동일 적용 여부, 특정 선호에 의한 왜곡 확인.
- Control: 평가 기준으로 아이디어 비교, 선택 이유 언어화, 상위 2개 남기고 재평가.

# 응답 깊이 평가 기준
- **Shallow**: 50자 이하, 구체성 부족, 단일 관점
- **Medium**: 50-150자, 일부 구체적, 2-3개 아이디어
- **Deep**: 150자 이상, 다양한 관점, 구체적 예시

활용:
- Shallow → 동일 메타인지 요소로 추가 탐색
- Medium → 다음 메타인지 요소로 진행
- Deep (2회 이상) → 단계 전환 고려

# 응답 형식

반드시 아래 JSON 형식으로만 응답하세요:

```json
{
  "current_stage": "understanding | generation | execution",
  "detected_state": "상태 진단 결과 (예: 과제/목표 정의 불명확, 정보 수집 부족 등)",
  "detected_metacog_needs": ["Knowledge | Monitoring | Control 중 1개"],
  "response_depth": "shallow | medium | deep",
  "empathy": "학습자의 현재 상태에 대한 짧은 공감 (1문장)",
  "diagnosis": "학습자의 상태를 명확히 진단 (1문장)",
  "question": "사고 촉진 질문 1개",
  "action_prompt": "학습자가 다시 과제를 수행하도록 유도하는 문장",
  "should_transition": false,
  "reasoning": "추론 근거 (내부용, 학습자에게 노출되지 않음)"
}
```
"""


def _build_context(conversations: list[dict], current_stage: str) -> str:
    """최근 대화 기록을 텍스트로 변환"""
    lines = [f"[현재 단계: {current_stage}]"]
    for msg in conversations:
        role = "학생" if msg["role"] == "user" else "에이전트"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def _clean_json_response(text: str) -> str:
    """LLM 응답에서 JSON 부분만 추출"""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


# 기본 Fallback 응답
FALLBACK_RESPONSE = {
    "current_stage": "understanding",
    "detected_state": "판단 불가",
    "detected_metacog_needs": ["Monitoring"],
    "response_depth": "medium",
    "empathy": "생각을 정리하는 과정이 쉽지 않을 수 있어요.",
    "diagnosis": "현재 상태를 조금 더 구체적으로 파악할 필요가 있어요.",
    "question": "방금 말씀하신 내용을 조금 더 구체적으로 설명해주시겠어요?",
    "action_prompt": "떠오르는 생각을 자유롭게 적어보세요.",
    "should_transition": False,
    "reasoning": "LLM 응답 파싱 실패, 기본 질문 제공",
}


async def generate_scaffolding(
    user_message: str,
    conversation_history: list[dict],
    current_stage: str,
    assignment_text: str = "",
    turn_count: int = 0,
    max_turns: int = 6,
) -> dict:
    """
    사용자 메시지에 대한 CPS 스캐폴딩 질문 생성

    Returns:
        {
            "current_stage": str,
            "detected_state": str,
            "detected_metacog_needs": list[str],
            "response_depth": str,
            "empathy": str,
            "diagnosis": str,
            "question": str,
            "action_prompt": str,
            "should_transition": bool,
            "reasoning": str,
        }
    """
    # 컨텍스트 구성
    recent = conversation_history[-MAX_CONTEXT_MESSAGES:] if len(conversation_history) > MAX_CONTEXT_MESSAGES else conversation_history
    context = _build_context(recent, current_stage)

    # 동적 프롬프트 보충
    extra = ""
    if assignment_text:
        extra += f"\n\n과제 내용:\n{assignment_text}"
    if turn_count >= max_turns - 2:
        extra += f"\n\n⚠ 현재 단계에서 {turn_count}/{max_turns} 턴 진행됨. 다음 단계 전환을 고려하세요."

    user_prompt = f"""{extra}

대화 맥락:
{context}

학생의 최신 응답: "{user_message}"

위 내용을 분석하여 JSON 형식으로 응답하세요."""

    try:
        response = client.models.generate_content(
            model=MODEL,
            config={
                "system_instruction": SYSTEM_PROMPT,
                "temperature": 0.7,
                "response_mime_type": "application/json",
            },
            contents=user_prompt,
        )

        result = json.loads(_clean_json_response(response.text))

        # detected_metacog_needs를 리스트로 정규화
        needs = result.get("detected_metacog_needs", [])
        if isinstance(needs, str):
            result["detected_metacog_needs"] = [needs]

        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON 파싱 실패: {e}")
        fallback = FALLBACK_RESPONSE.copy()
        fallback["current_stage"] = current_stage
        return fallback

    except Exception as e:
        logger.error(f"Gemini API 에러: {e}")
        fallback = FALLBACK_RESPONSE.copy()
        fallback["current_stage"] = current_stage
        fallback["empathy"] = "죄송합니다. 잠시 문제가 발생했습니다."
        fallback["question"] = "다시 한번 생각을 공유해주시겠어요?"
        return fallback
