/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Lightbulb,
  Target,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Send,
  User,
  ClipboardCheck
} from 'lucide-react';
import Markdown from 'react-markdown';
import { createSession, sendMessage } from './services/api';

type Stage = 'understanding' | 'generation' | 'execution';

interface Message {
  role: 'user' | 'facilitator';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'facilitator',
  content: '안녕하세요! 저는 여러분의 창의적인 문제 해결 과정을 돕는 AI 코치입니다. 문제를 풀며 떠오르는 생각을 자유롭게 공유해주세요.'
};

// 과제 텍스트 (설계 방향.docx에 정의된 고정 과제)
const ASSIGNMENT_TEXT = `여러분은 A중학교의 담임교사입니다. 최근 교실에서 물건이 사라지거나, 학생들 사이에 갈등이 생기는 일들이 가끔 발생하고 있습니다. 하지만, 이런 일들은 대부분 교사가 없는 순간에 일어나기 때문에, 어떤 일이 있었는지 정확히 알기 어렵습니다. 여러분은 사건이 발생할 때마다 학생들은 한 명씩 불러 이야기를 들어보지만, 학생들의 말이 서로 다르거나 사실을 숨기는 경우도 있어 상황을 파악하는데 시간이 오래 걸리고 어려움을 느끼고 있습니다. 또한, 이러한 과정은 학생들에게 심리적 부담을 주거나, 서로에 대한 신뢰를 낮추는 문제로 이어지기도 합니다. 학생의 사생활 보호를 위해 교실 내 CCTV 설치는 불가능하며, 추가적인 예산이나 인력을 늘리는 것도 어려운 상황입니다. 위와 같은 상황에서, 학생의 사생활을 침해하지 않으면서도 교실에서 발생하는 문제를 공정하게 해결할 수 있는 새로운 방법을 고안해보세요.`;

export default function App() {
  const [currentStage, setCurrentStage] = useState<Stage>('understanding');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedGenTool, setSelectedGenTool] = useState('');
  const [selectedExecTool, setSelectedExecTool] = useState('');

  // Checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    s1_1: false, s1_2: false, s1_3: false, s1_4: false, s1_5: false, s1_6: false, s1_7: false,
    s2_1: false, s2_2: false, s2_3: false, s2_4: false, s2_5: false, s2_6: false,
    s3_1: false, s3_2: false, s3_3: false,
  });
  const [diffS1, setDiffS1] = useState('');
  const [diffS2_2, setDiffS2_2] = useState('');
  const [diffS3, setDiffS3] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [userInput, setUserInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 채팅 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  // 세션 자동 생성
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await createSession(ASSIGNMENT_TEXT);
        setSessionId(session.session_id);
      } catch (error) {
        console.error('세션 생성 실패:', error);
      }
    };
    initSession();
  }, []);

  const handleSendMessage = async () => {
    if (!userInput.trim() || !sessionId) return;
    const message = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setLoading(true);

    try {
      const response = await sendMessage(sessionId, message, currentStage, checklist);
      setChatMessages(prev => [...prev, { role: 'facilitator', content: response.agent_message }]);

      // 서버에서 단계 전환이 발생했으면 반영
      const serverStage = response.scaffolding_data.current_stage as Stage;
      if (serverStage !== currentStage && ['understanding', 'generation', 'execution'].includes(serverStage)) {
        setCurrentStage(serverStage);
      }

      // 턴 제한 도달 시 로그만 남기고 사용자에게는 알림하지 않음
      if (response.limit_reached) {
        console.log(`턴 제한 도달: ${response.turn_count}/${response.max_turns}`);
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, {
        role: 'facilitator',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleToolSelect = async (toolName: string, type: 'gen' | 'exec') => {
    if (!sessionId) return;
    if (type === 'gen') setSelectedGenTool(toolName);
    else setSelectedExecTool(toolName);

    const message = `'${toolName}' 사고 도구를 사용하고 싶습니다. 어떻게 사용하면 되나요?`;
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setLoading(true);

    try {
      const response = await sendMessage(sessionId, message, currentStage, checklist);
      setChatMessages(prev => [...prev, { role: 'facilitator', content: response.agent_message }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setChatMessages([INITIAL_MESSAGE]);
    setCurrentStage('understanding');
    setChecklist({
      s1_1: false, s1_2: false, s1_3: false, s1_4: false, s1_5: false, s1_6: false, s1_7: false,
      s2_1: false, s2_2: false, s2_3: false, s2_4: false, s2_5: false, s2_6: false,
      s3_1: false, s3_2: false, s3_3: false,
    });
    setDiffS1('');
    setDiffS2_2('');
    setDiffS3('');
    setSelectedGenTool('');
    setSelectedExecTool('');
    setUserInput('');

    try {
      const session = await createSession(ASSIGNMENT_TEXT);
      setSessionId(session.session_id);
    } catch (error) {
      console.error('세션 재생성 실패:', error);
    }
  };

  const stages = [
    {
      id: 'understanding' as Stage,
      label: '문제 이해',
      tip: '문제를 쪼개어 생각하고, 해결하고 싶은 핵심 목표를 한 문장으로 정리해보세요.',
      example: '예: "학생들이 수업에 적극적으로 참여하지 않는다" → "학생들의 흥미를 유발하는 도입부 활동이 필요하다"',
      icon: Target,
      divergentQuestions: [
        '이 과제에서 주목해야 하는 것은 무엇인가요?',
        '어떤 정보를 확인해봐야 할까요?',
        '아이디어를 내서 당신이 할 수 있기를 바라는 것은 무엇인가요?'
      ],
      convergentQuestions: [
        '최종적인 목표와 관심사항은 무엇인가요?',
        '어떤 자료가 가장 중요하게 고려되어야 할까요?',
        '먼저 시작해야 할 질문은 무엇인가요?'
      ]
    },
    {
      id: 'generation' as Stage,
      label: '아이디어 생성',
      tip: '질보다 양입니다! 비판은 잠시 접어두고 생각나는 모든 것을 최대한 많이 적어보세요.',
      example: '예: "게임 요소를 도입한다", "학생이 교사가 되어 가르쳐본다", "VR 기기를 활용한다"',
      icon: Lightbulb,
      divergentQuestions: [
        '어떤 아이디어를 생각해볼 수 있을까요?',
        '다른 새롭고 독특한 방법은 없을까요?',
        '어떤 새로운 연결을 만들 수 있을까요?'
      ],
      convergentQuestions: [
        '어떤 아이디어가 가장 흥미롭거나 가능성이 있어 보이나요?',
        '어떤 아이디어가 가장 그럴듯하고 매력적인가요?',
        '어떤 아이디어가 기존에 것에 가치를 더해주나요?'
      ]
    },
    {
      id: 'execution' as Stage,
      label: '실행 준비',
      tip: '현실적인 제약 사항을 고려하여 가장 효과적인 아이디어를 선택하고 구체적인 단계를 세우세요.',
      example: '예: "준비물: 태블릿 PC 20대", "1단계: 모둠 구성", "2단계: 미션 카드 배부"',
      icon: Rocket,
      divergentQuestions: [
        '제시된 아이디어에 어떤 기준을 적용할 수 있을까요?',
        '발생할 수 있는 장애물이나 우려사항은 무엇인가요?',
        '어떤 도움이 필요한가요? 누구의 도움이 필요한가요?'
      ],
      convergentQuestions: [
        '어떤 아이디어가 최우선 순위에 올라야 할까요?',
        '24시간 이내에 필요한 구체적인 행위는 무엇인가요?',
        '어떻게 해야 문제가 생기는 것을 방지할 수 있을까요?'
      ]
    },
  ];

  const currentStageData = stages.find(s => s.id === currentStage);

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-3 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={16} />
            </div>
            <h1 className="font-display font-bold text-lg tracking-tight">Pre-service Teacher Thinking Facilitator</h1>
          </div>

          <nav className="flex items-center">
            {stages.map((s, idx) => {
              const Icon = s.icon;
              const isActive = currentStage === s.id;
              const isCompleted = stages.findIndex(st => st.id === currentStage) > idx;

              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center relative">
                    <button
                      onClick={() => setCurrentStage(s.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all z-10 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                          : isCompleted
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-white text-zinc-400 border border-zinc-100 hover:border-zinc-300'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                      <span className="text-xs font-bold">{s.label}</span>
                    </button>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`w-12 h-[2px] mx-1 ${isCompleted ? 'bg-emerald-200' : 'bg-zinc-100'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <button onClick={reset} className="text-[10px] font-medium text-zinc-400 hover:text-black transition-colors">
            초기화
          </button>
        </div>
      </header>

      {/* Tools Selection Bar (Top) */}
      <div className="bg-white border-b border-zinc-100 px-6 py-2 shrink-0 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">사고 도구:</span>
          <div className="flex items-center gap-2">
            {currentStage === 'generation' && [
              { name: '브레인스토밍', desc: '자유로운 아이디어 산출' },
              { name: '스캠퍼', desc: '변형을 통한 아이디어' },
              { name: '강제결합법', desc: '이질적 요소의 결합' },
              { name: '속성열거법', desc: '대상물의 속성을 나누어 분석' },
              { name: '육색사고모', desc: '여섯 가지 관점에서 사고' },
              { name: '시네틱스', desc: '유추를 통한 아이디어 발상' }
            ].map(t => (
              <button
                key={t.name}
                onClick={() => handleToolSelect(t.name, 'gen')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                  selectedGenTool === t.name ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {t.name}
              </button>
            ))}
            {currentStage === 'execution' && [
              { name: '하이라이팅', desc: '핵심 추출' },
              { name: '히트 기법', desc: '매력적 요소 선택' },
              { name: 'PMI', desc: '다각도 분석' },
              { name: '평가 행렬표', desc: '기준에 따른 체계적 평가' },
              { name: '역브레인스토밍', desc: '문제점 보완' }
            ].map(t => (
              <button
                key={t.name}
                onClick={() => handleToolSelect(t.name, 'exec')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                  selectedExecTool === t.name ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {t.name}
              </button>
            ))}
            {currentStage === 'understanding' && (
              <span className="text-[11px] text-zinc-400 italic">문제 이해 단계에서는 분석 가이드가 자동으로 제공됩니다.</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Facilitation Questions */}
        <aside className="w-80 border-r border-zinc-200 bg-white overflow-y-auto shrink-0 hidden lg:flex flex-col">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-600" />
                단계별 팁 & 예시
              </h3>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">TIP</div>
                  <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                    {currentStageData?.tip}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">EXAMPLE</div>
                  <p className="text-xs text-zinc-500 italic leading-relaxed">
                    {currentStageData?.example}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Target size={14} />
                사고 촉진 질문
              </h3>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">발산적 사고</div>
                  <ul className="space-y-2">
                    {currentStageData?.divergentQuestions.map((q, i) => (
                      <li key={i} className="text-xs text-zinc-600 leading-relaxed p-2 bg-amber-50 rounded-lg border border-amber-100">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">수렴적 사고</div>
                  <ul className="space-y-2">
                    {currentStageData?.convergentQuestions.map((q, i) => (
                      <li key={i} className="text-xs text-zinc-600 leading-relaxed p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Area: Chat Interface */}
        <main className="flex-1 flex flex-col bg-white relative border-r border-zinc-200">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-zinc-100 text-zinc-600' : 'bg-indigo-600 text-white'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <MessageCircle size={16} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-zinc-50 border border-zinc-100 text-zinc-800 rounded-tl-none'
                    }`}>
                      <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-50 p-4 rounded-2xl flex items-center gap-2 text-zinc-400 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    촉진자가 생각 중입니다...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-zinc-100 bg-white">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="relative group">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="촉진자에게 질문하거나 생각을 공유하세요..."
                  className="w-full p-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none min-h-[100px]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !userInput.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-xl disabled:bg-zinc-200 transition-all shadow-lg shadow-indigo-200"
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (currentStage === 'generation') setCurrentStage('understanding');
                      if (currentStage === 'execution') setCurrentStage('generation');
                    }}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                  >
                    <ChevronLeft size={12} /> 이전 단계
                  </button>
                </div>
                <div className="flex gap-2">
                  {currentStage === 'generation' && (
                    <button
                      onClick={() => setCurrentStage('execution')}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      실행 준비 단계로 이동 <ChevronRight size={12} />
                    </button>
                  )}
                  {currentStage === 'understanding' && (
                    <button
                      onClick={() => setCurrentStage('generation')}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      아이디어 생성 단계로 이동 <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Thinking Process Checklist */}
        <aside className="w-80 bg-zinc-50 overflow-y-auto shrink-0 hidden xl:flex flex-col border-l border-zinc-200">
          <div className="p-6 space-y-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck size={14} className="text-indigo-500" />
              사고 과정 체크리스트
            </h3>

            <div className="space-y-8">
              {/* Stage 1: Understanding */}
              {currentStage === 'understanding' && (
                <section className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-800 border-b border-zinc-200 pb-2">1. 문제 이해 단계</h4>

                  <div className="space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-700 mb-2">과제 목표 설정</h5>
                      <p className="text-[11px] font-bold text-zinc-500 mb-2">지금 나의 상태는?</p>
                      <div className="space-y-1">
                        {[
                          { id: 's1_1', label: '아무 생각이 떠오르지 않는다' },
                          { id: 's1_2', label: '무엇을 해야 할지 모르겠다' },
                          { id: 's1_3', label: '문제를 이해하기 어렵다' },
                          { id: 's1_4', label: '목표의 우선순위가 명확하지 않다' },
                        ].map(item => (
                          <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checklist[item.id]}
                              onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className="mt-0.5 w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-zinc-600 group-hover:text-zinc-900 transition-colors leading-tight">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-zinc-700 mb-2">정보 탐색</h5>
                      <p className="text-[11px] font-bold text-zinc-500 mb-2">지금 나의 상태는?</p>
                      <div className="space-y-1">
                        {[
                          { id: 's1_5', label: '어떤 정보를 찾아야 할지 모르겠다' },
                          { id: 's1_6', label: '정보를 모았지만 이해가 되지 않는다' },
                          { id: 's1_7', label: '여러 정보를 연결하기 어렵다' },
                        ].map(item => (
                          <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checklist[item.id]}
                              onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className="mt-0.5 w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-zinc-600 group-hover:text-zinc-900 transition-colors leading-tight">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">지금 가장 막히거나 어려운 점은 무엇인가요?</label>
                      <textarea
                        value={diffS1}
                        onChange={(e) => setDiffS1(e.target.value)}
                        placeholder="자유롭게 적어주세요..."
                        className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px] resize-none shadow-sm"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Stage 2: Generation */}
              {currentStage === 'generation' && (
                <section className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-800 border-b border-zinc-200 pb-2">2. 아이디어 생성 단계</h4>

                  <div className="space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-700 mb-2">확산적 사고</h5>
                      <p className="text-[11px] font-bold text-zinc-500 mb-2">지금 나의 상태는?</p>
                      <div className="space-y-1">
                        {[
                          { id: 's2_1', label: '아이디어가 거의 떠오르지 않는다' },
                          { id: 's2_2', label: '한 가지 생각에만 머물러 있다' },
                          { id: 's2_3', label: '아이디어가 너무 많아서 정리가 되지 않는다' },
                        ].map(item => (
                          <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checklist[item.id]}
                              onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className="mt-0.5 w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-zinc-600 group-hover:text-zinc-900 transition-colors leading-tight">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-zinc-100">
                      <div>
                        <h5 className="text-xs font-bold text-zinc-700 mb-2">비판적 사고</h5>
                        <p className="text-[11px] font-bold text-zinc-500 mb-2">지금 나의 상태는?</p>
                        <div className="space-y-1">
                          {[
                            { id: 's2_4', label: '생각이 피상적이라고 느껴진다' },
                            { id: 's2_5', label: '이유나 근거를 충분히 설명하지 못한다' },
                            { id: 's2_6', label: '논리적으로 정리하기 어렵다' },
                          ].map(item => (
                            <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={checklist[item.id]}
                                onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                className="mt-0.5 w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-[11px] text-zinc-600 group-hover:text-zinc-900 transition-colors leading-tight">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">지금 가장 막히거나 어려운 점은 무엇인가요?</label>
                        <textarea
                          value={diffS2_2}
                          onChange={(e) => setDiffS2_2(e.target.value)}
                          placeholder="자유롭게 적어주세요..."
                          className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] resize-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Stage 3: Execution */}
              {currentStage === 'execution' && (
                <section className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-800 border-b border-zinc-200 pb-2">3. 실행 준비 단계</h4>

                  <div className="space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-700 mb-2">평가 및 의사결정</h5>
                      <p className="text-[11px] font-bold text-zinc-500 mb-2">지금 나의 상태는?</p>
                      <div className="space-y-1">
                        {[
                          { id: 's3_1', label: '어떤 아이디어가 좋은지 판단하기 어렵다' },
                          { id: 's3_2', label: '선택에 확신이 없다' },
                          { id: 's3_3', label: '기준 없이 결정을 내리게 된다' },
                        ].map(item => (
                          <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checklist[item.id]}
                              onChange={(e) => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className="mt-0.5 w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-zinc-600 group-hover:text-zinc-900 transition-colors leading-tight">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">지금 가장 막히거나 어려운 점은 무엇인가요?</label>
                      <textarea
                        value={diffS3}
                        onChange={(e) => setDiffS3(e.target.value)}
                        placeholder="자유롭게 적어주세요..."
                        className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[120px] resize-none shadow-sm"
                      />
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
