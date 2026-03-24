import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Download, ChevronDown, ChevronUp,
  MessageCircle, User, BarChart3, ArrowRightLeft,
  Clock, Brain, Layers
} from 'lucide-react';
import Markdown from 'react-markdown';
import {
  fetchSessions, fetchConversations, fetchMetrics, fetchTransitions,
  getConversationsCsvUrl, getMetricsCsvUrl,
  SessionSummary, ConversationItem, SessionMetrics, StageTransition,
} from '../services/adminApi';

const STAGE_LABELS: Record<string, string> = {
  understanding: '문제 이해',
  generation: '아이디어 생성',
  execution: '실행 준비',
};

const STAGE_COLORS: Record<string, string> = {
  understanding: 'bg-blue-100 text-blue-700',
  generation: 'bg-amber-100 text-amber-700',
  execution: 'bg-emerald-100 text-emerald-700',
};

const DEPTH_COLORS: Record<string, string> = {
  shallow: 'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-700',
  deep: 'bg-green-100 text-green-700',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [transitions, setTransitions] = useState<StageTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'metrics' | 'transitions'>('conversations');

  useEffect(() => {
    fetchSessions().then(setSessions).catch(console.error);
  }, []);

  const handleSelectSession = async (sessionId: number) => {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      return;
    }
    setSelectedSessionId(sessionId);
    setLoading(true);
    setActiveTab('conversations');
    try {
      const [convs, met, trans] = await Promise.all([
        fetchConversations(sessionId),
        fetchMetrics(sessionId).catch(() => null),
        fetchTransitions(sessionId).catch(() => []),
      ]);
      setConversations(convs);
      setMetrics(met);
      setTransitions(trans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg">연구 관리자 페이지</h1>
              <p className="text-xs text-zinc-400">세션 및 대화 기록 관리</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={getConversationsCsvUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Download size={14} />
              대화 CSV
            </a>
            <a
              href={getMetricsCsvUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Download size={14} />
              지표 CSV
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Session List */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
            전체 세션 ({sessions.length}개)
          </h2>

          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-400 text-sm">
              아직 세션이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  {/* Session Header */}
                  <button
                    onClick={() => handleSelectSession(s.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-bold">
                        #{s.id}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-800 line-clamp-1">
                          {s.assignment_text}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Clock size={11} /> {formatDate(s.created_at)}
                          </span>
                          {s.user_id && (
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <User size={11} /> {s.user_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedSessionId === s.id ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                  </button>

                  {/* Session Detail */}
                  {selectedSessionId === s.id && (
                    <div className="border-t border-zinc-100">
                      {/* Tabs */}
                      <div className="flex border-b border-zinc-100">
                        <button
                          onClick={() => setActiveTab('conversations')}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                            activeTab === 'conversations'
                              ? 'text-indigo-600 border-b-2 border-indigo-600'
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          <MessageCircle size={14} />
                          대화 기록
                        </button>
                        <button
                          onClick={() => setActiveTab('metrics')}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                            activeTab === 'metrics'
                              ? 'text-indigo-600 border-b-2 border-indigo-600'
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          <BarChart3 size={14} />
                          세션 지표
                        </button>
                        <button
                          onClick={() => setActiveTab('transitions')}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                            activeTab === 'transitions'
                              ? 'text-indigo-600 border-b-2 border-indigo-600'
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          <ArrowRightLeft size={14} />
                          단계 전환
                        </button>
                      </div>

                      {loading ? (
                        <div className="p-8 text-center text-zinc-400 text-sm">로딩 중...</div>
                      ) : (
                        <div className="p-4">
                          {/* Conversations Tab */}
                          {activeTab === 'conversations' && (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                              {conversations.length === 0 ? (
                                <p className="text-sm text-zinc-400 text-center py-8">대화 기록이 없습니다.</p>
                              ) : (
                                conversations.map((conv) => (
                                  <div
                                    key={conv.id}
                                    className={`flex gap-3 ${conv.role === 'user' ? '' : ''}`}
                                  >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                      conv.role === 'user' ? 'bg-zinc-100 text-zinc-600' : 'bg-indigo-600 text-white'
                                    }`}>
                                      {conv.role === 'user' ? <User size={14} /> : <MessageCircle size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] font-bold text-zinc-500">
                                          {conv.role === 'user' ? '학습자' : '에이전트'}
                                        </span>
                                        {conv.cps_stage && (
                                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STAGE_COLORS[conv.cps_stage] || 'bg-zinc-100 text-zinc-500'}`}>
                                            {STAGE_LABELS[conv.cps_stage] || conv.cps_stage}
                                          </span>
                                        )}
                                        {conv.response_depth && (
                                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${DEPTH_COLORS[conv.response_depth] || ''}`}>
                                            {conv.response_depth}
                                          </span>
                                        )}
                                        {conv.metacog_elements && conv.metacog_elements.length > 0 && (
                                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">
                                            {conv.metacog_elements.join(', ')}
                                          </span>
                                        )}
                                        <span className="text-[10px] text-zinc-300 ml-auto">
                                          {formatDate(conv.created_at)}
                                        </span>
                                      </div>
                                      <div className={`p-3 rounded-xl text-sm ${
                                        conv.role === 'user'
                                          ? 'bg-zinc-50 border border-zinc-100 text-zinc-800'
                                          : 'bg-indigo-50 border border-indigo-100 text-zinc-800'
                                      }`}>
                                        <div className="prose prose-sm prose-zinc max-w-none">
                                          <Markdown>{conv.message}</Markdown>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Metrics Tab */}
                          {activeTab === 'metrics' && metrics && (
                            <div className="grid grid-cols-3 gap-4">
                              {/* Turn Counts */}
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                                  <Layers size={14} />
                                  단계별 턴
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600">문제 이해</span>
                                    <span className="font-bold">{metrics.understanding_turns}/6</span>
                                  </div>
                                  <div className="w-full bg-zinc-200 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(metrics.understanding_turns / 6) * 100}%` }} />
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600">아이디어 생성</span>
                                    <span className="font-bold">{metrics.idea_generation_turns}/8</span>
                                  </div>
                                  <div className="w-full bg-zinc-200 rounded-full h-1.5">
                                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(metrics.idea_generation_turns / 8) * 100}%` }} />
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600">실행 준비</span>
                                    <span className="font-bold">{metrics.action_planning_turns}/6</span>
                                  </div>
                                  <div className="w-full bg-zinc-200 rounded-full h-1.5">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(metrics.action_planning_turns / 6) * 100}%` }} />
                                  </div>
                                </div>
                              </div>

                              {/* Response Depth */}
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                                  <BarChart3 size={14} />
                                  응답 깊이
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-red-600">Shallow</span>
                                    <span className="font-bold">{metrics.shallow_responses}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-yellow-600">Medium</span>
                                    <span className="font-bold">{metrics.medium_responses}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-green-600">Deep</span>
                                    <span className="font-bold">{metrics.deep_responses}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Metacognition */}
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                                  <Brain size={14} />
                                  메타인지 요소
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600">Knowledge</span>
                                    <span className="font-bold">{metrics.knowledge_count}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600">Monitoring</span>
                                    <span className="font-bold">{metrics.monitoring_count}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600">Control</span>
                                    <span className="font-bold">{metrics.control_count}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {activeTab === 'metrics' && !metrics && (
                            <p className="text-sm text-zinc-400 text-center py-8">세션 지표가 없습니다.</p>
                          )}

                          {/* Transitions Tab */}
                          {activeTab === 'transitions' && (
                            <div>
                              {transitions.length === 0 ? (
                                <p className="text-sm text-zinc-400 text-center py-8">단계 전환 이력이 없습니다.</p>
                              ) : (
                                <div className="space-y-2">
                                  {transitions.map((t) => (
                                    <div key={t.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl text-sm">
                                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${STAGE_COLORS[t.from_stage] || 'bg-zinc-100 text-zinc-500'}`}>
                                        {STAGE_LABELS[t.from_stage] || t.from_stage}
                                      </span>
                                      <ArrowRightLeft size={14} className="text-zinc-400" />
                                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${STAGE_COLORS[t.to_stage] || 'bg-zinc-100 text-zinc-500'}`}>
                                        {STAGE_LABELS[t.to_stage] || t.to_stage}
                                      </span>
                                      {t.transition_reason && (
                                        <span className="text-xs text-zinc-400 ml-2">{t.transition_reason}</span>
                                      )}
                                      <span className="text-[10px] text-zinc-300 ml-auto">{formatDate(t.created_at)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
