'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, User, Bot, Loader2, Sparkles, Eye, EyeOff, Menu, Plus, Trash2, Clock, Cpu, Wifi } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface TokenInfo {
  token: string;
  level: number | null;
  isOutOfLevel: boolean;
  definition?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: TokenInfo[] | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  targetLevel: number;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'hsk-chat-sessions';
const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是 HSK 学习助手。请选择你的目标 HSK 等级，我会用适合该等级的词汇和句子长度与你对话。',
};

function loadSessions(): ChatSession[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    // 过滤掉旧版本或损坏的数据
    return raw.filter((s: any) =>
      s && typeof s.id === 'string' && Array.isArray(s.messages) && typeof s.targetLevel === 'number'
    );
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function createSession(targetLevel: number): ChatSession {
  return {
    id: Date.now().toString(),
    title: '新对话',
    messages: [{ ...WELCOME_MSG, id: 'welcome-' + Date.now() }],
    targetLevel,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return diffDays + '天前';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const { t, lang } = useT();
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loaded = loadSessions();
    return loaded.length > 0 ? loaded : [createSession(3)];
  });
  const [activeId, setActiveId] = useState<string>(() => sessions[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showLevels, setShowLevels] = useState(true);
  const [useWebLLM, setUseWebLLM] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 动态导入 WebLLM（避免 SSR 时加载 WebGPU 模块）
  const webLLMRef = useRef<any>(null);

  // 检测 WebGPU 并加载模型
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@/lib/web-llm');
        if (cancelled) return;
        webLLMRef.current = mod;

        if (mod.isWebGPUSupported()) {
          setUseWebLLM(true);
          setModelLoading(true);
          setModelProgress('正在加载模型...');
          await mod.loadModel((p: { text: string; progress: number }) => {
            if (!cancelled && p.progress < 1) {
              setModelProgress(`加载模型中 ${Math.round(p.progress * 100)}%`);
            }
          });
          if (!cancelled) {
            setModelLoading(false);
            setModelProgress('本地模型已就绪');
            setTimeout(() => setModelProgress(''), 2000);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn('WebLLM 不可用，使用 API:', err.message);
          setUseWebLLM(false);
          setModelLoading(false);
          setModelProgress('');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const active = sessions.find((s) => s.id === activeId) || sessions[0];
  const messages = active?.messages || [];
  const targetLevel = active?.targetLevel || 3;

  // Persist sessions to localStorage
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateActive = (updater: (s: ChatSession) => ChatSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeId ? { ...updater(s), updatedAt: Date.now() } : s))
    );
  };

  const switchSession = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false); // auto-close on mobile
  };

  const newSession = () => {
    const s = createSession(3);
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fallback = createSession(3);
        setActiveId(fallback.id);
        return [fallback];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !active) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];

    // Auto-title: use first user message
    const title = messages.filter((m) => m.role === 'user').length === 0
      ? input.trim().substring(0, 20)
      : active.title;

    updateActive((s) => ({ ...s, messages: updatedMessages, title }));
    setInput('');
    setSending(true);

    try {
      const history = updatedMessages
        .filter((m) => !m.id.startsWith('welcome'))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      let reply: string;
      let tokens = null;

      if (useWebLLM && webLLMRef.current?.isEngineReady()) {
        // 使用浏览器本地模型
        let systemPrompt = '';
        if (targetLevel <= 2) {
          systemPrompt = `你是中文教师。只用简单词汇，回复在20字以内。`;
        }
        const msgs = systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt }, ...history]
          : history;
        reply = await webLLMRef.current.chatWithWebLLM(msgs, { maxTokens: 150, temperature: 0.7 });
      } else {
        // 使用服务端 API
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, targetLevel }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Chat failed');
        reply = data.reply;
        tokens = data.tokens || null;
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        tokens,
      };

      updateActive((s) => ({ ...s, messages: [...s.messages, assistantMsg] }));
    } catch (err) {
      updateActive((s) => ({
        ...s,
        messages: [...s.messages, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('chat.error'),
        }],
      }));
    } finally {
      setSending(false);
    }
  };

  const levelHint: Record<number, string> = {
    1: '回复 ≤10 字，用词和短语对话',
    2: '回复 ≤20 字，用简单短句对话',
    3: '回复 ≤40 字，用1-2个短句对话',
    4: '回复 ≤80 字，用简短的段落对话',
    5: '回复 ≤150 字，用中等段落对话',
  };

  function levelBadgeClass(level: number | null): string {
    if (level === null) return 'bg-gray-100 text-gray-500 border-gray-300';
    if (level <= 2) return 'bg-green-50 text-green-800 border-green-300';
    if (level <= 4) return 'bg-yellow-50 text-yellow-800 border-yellow-300';
    if (level <= 6) return 'bg-orange-50 text-orange-800 border-orange-300';
    return 'bg-red-50 text-red-800 border-red-300';
  }

  function levelDotClass(level: number | null): string {
    if (level === null) return 'bg-gray-400 text-white';
    if (level <= 2) return 'bg-green-500 text-white';
    if (level <= 4) return 'bg-yellow-500 text-white';
    if (level <= 6) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex max-w-full mx-auto">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed lg:static lg:translate-x-0 z-30 w-64 h-full bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-200`}>
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={newSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            {t('chat.newChat')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {[...sessions]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((s) => {
              const lastUserMsg = [...s.messages].reverse().find((m) => m.role === 'user');
              const preview = lastUserMsg?.content?.substring(0, 25) || '新对话';
              return (
                <div
                  key={s.id}
                  onClick={() => switchSession(s.id)}
                  className={`group px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors ${
                    s.id === activeId
                      ? 'bg-white border-l-2 border-l-blue-500'
                      : 'hover:bg-white/60 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-slate-700 truncate flex-1">
                      {s.title}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="p-0.5 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400 truncate flex-1">{preview}</span>
                    <span className="text-[10px] text-slate-300 flex items-center gap-0.5 shrink-0">
                      <Clock size={10} />
                      {formatTime(s.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="p-3 border-t border-slate-200 text-center">
          <span className="text-[10px] text-slate-400">
            {sessions.length} {t('chat.sessions')} · {t('chat.sessionsHint')}
          </span>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800 text-sm">{t('chat.title')}</h1>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{active?.title}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Model status */}
            {modelLoading && (
              <span className="text-[10px] text-amber-600 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" />
                {modelProgress}
              </span>
            )}
            {useWebLLM && !modelLoading && (
              <span className="text-[10px] text-green-600 flex items-center gap-1" title="本地模型运行中">
                <Cpu size={10} />
                本地
              </span>
            )}
            {!useWebLLM && !modelLoading && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1" title="使用服务端 API">
                <Wifi size={10} />
                API
              </span>
            )}
            <select
              value={targetLevel}
              onChange={(e) => {
                const lvl = Number(e.target.value);
                updateActive((s) => ({ ...s, targetLevel: lvl }));
              }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl}>HSK {lvl}</option>
              ))}
            </select>
            <button
              onClick={() => setShowLevels(!showLevels)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                showLevels ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-400'
              }`}
              title={showLevels ? t('chat.hideLevels') : t('chat.showLevels')}
            >
              {showLevels ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
              }`}>
                {msg.role === 'assistant' && showLevels && msg.tokens ? (
                  <span className="leading-loose">
                    {msg.tokens.map((t, i) => {
                      if (/^[\s\p{P}]+$/u.test(t.token)) {
                        return <span key={i}>{t.token}</span>;
                      }
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md border text-xs font-medium cursor-help ${levelBadgeClass(t.level)}`}
                          title={t.level ? `HSK ${t.level}${t.definition ? ': ' + t.definition : ''}` : '不在 HSK 大纲内'}
                        >
                          {t.token}
                          <span className={`text-[9px] px-1 rounded-full font-bold ${levelDotClass(t.level)}`}>
                            {t.level ? 'L' + t.level : '?'}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  msg.content
                )}
                {!msg.id.startsWith('welcome') && msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                    <Sparkles size={11} className="text-blue-400" />
                    <span className="text-[10px] text-blue-400">{t('chat.levelLabel')} {targetLevel} {t('chat.vocabLevel')}</span>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-300 flex items-center justify-center shrink-0">
                  <User size={14} className="text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <Bot size={14} className="text-white bg-blue-500 rounded-lg p-1.5 w-7 h-7" />
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                <Loader2 size={18} className="animate-spin text-blue-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              disabled={sending}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            {t('chat.footer')} · {t('chat.levelLabel')} {targetLevel} · {lang === 'en' ? '' : levelHint[targetLevel] || '自然长度的对话'}
          </p>
        </div>
      </div>
    </div>
  );
}
