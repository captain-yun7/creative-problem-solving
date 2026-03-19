import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const model = "gemini-3-flash-preview";

const SYSTEM_INSTRUCTION = `당신은 대학생 예비교사의 사고를 돕는 '사고 촉진자(Thinking Facilitator)'입니다.

현재 상황 컨텍스트:
"여러분은 A중학교의 담임교사입니다. 최근 교실에서 물건이 사라지거나, 학생들 사이에 갈등이 생기는 일들이 가끔 발생하고 있습니다. 하지만, 이런 일들은 대부분 교사가 없는 순간에 일어나기 때문에, 어떤 일이 있었는지 정확히 알기 어렵습니다. 여러분은 사건이 발생할 때마다 학생들은 한 명씩 불러 이야기를 들어보지만, 학생들의 말이 서로 다르거나 사실을 숨기는 경우도 있어 상황을 파악하는데 시간이 오래 걸리고 어려움을 느끼고 있습니다. 또한, 이러한 과정은 학생들에게 심리적 부담을 주거나, 서로에 대한 신뢰를 낮추는 문제로 이어지기도 합니다. 학생의 사생활 보호를 위해 교실 내 CCTV 설치는 불가능하며, 추가적인 예산이나 인력을 늘리는 것도 어려운 상황입니다. 위와 같은 상황에서, 학생의 사생활을 침해하지 않으면서도 교실에서 발생하는 문제를 공정하게 해결할 수 있는 새로운 방법을 고안해보세요."

핵심 원칙:
1. 답변은 최대한 간결하고 핵심만 전달하세요. (불필요한 서술 금지)
2. 직접적인 해결책이나 완성된 아이디어를 제공하지 마세요.
3. 학습자가 스스로 생각할 수 있도록 필요한 '정보'나 '관점'만 제공하세요.
4. 질문을 통해 학습자가 답을 찾아가도록 유도하세요.
5. 예비교사의 질문에 대해서만 필요한 답변을 하세요.`;

export async function clarifyProblem(problem: string) {
  const response = await ai.models.generateContent({
    model,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
    contents: `사용자의 문제: "${problem}". 
    이 문제를 분석하기 위해 사용자가 고려해야 할 핵심 요소 3가지만 간략히 짚어주세요. 
    직접적인 목표를 세워주지 말고, 사용자가 목표를 세울 때 참고할 질문을 던지세요.`,
  });
  return response.text;
}

export async function generateIdeas(problem: string, goals: string, tool: string) {
  const response = await ai.models.generateContent({
    model,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
    contents: `문제: "${problem}", 목표: "${goals}".
    사용자가 '${tool}' 기법을 사용하여 아이디어를 내려고 합니다.
    '${tool}' 기법을 지금 바로 어떻게 사용하면 되는지 아주 쉽고 친절하게 단계별로 설명하세요.
    직접적인 아이디어를 절대 제안하지 마세요.`,
  });
  return response.text;
}

export async function refineSolution(idea: string, problem: string, tool: string) {
  const response = await ai.models.generateContent({
    model,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
    contents: `아이디어: "${idea}", 문제: "${problem}".
    사용자가 '${tool}' 기법을 사용하여 이 아이디어를 정교화하려고 합니다.
    '${tool}' 기법을 지금 바로 어떻게 사용하면 되는지 아주 쉽고 친절하게 단계별로 설명하세요.
    실행 계획을 대신 작성하지 마세요.`,
  });
  return response.text;
}

export async function askFacilitator(question: string, context: string) {
  const response = await ai.models.generateContent({
    model,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
    contents: `상황: "${context}"
    질문: "${question}"
    
    질문에 필요한 정보만 아주 간결하게 답하고, 학습자가 다음 단계로 나아갈 수 있는 질문 하나만 하세요.`,
  });
  return response.text;
}
