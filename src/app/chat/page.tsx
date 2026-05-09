'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, User, Bot, Settings, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 HSK 学习助手。请选择你的目标 HSK 等级，我会用适合该等级的词汇和句子长度与你对话。',
    },
  ]);
  const [input, setInput] = useState('');
  const [targetLevel, setTargetLevel] = useState<number>(3);
  const [sending, setSending] = useState(false);
  const [levelLocked, setLevelLocked] = useState(false);
  const [showLevels, setShowLevels] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const levelHint: Record<number, string> = {
    1: '回复 ≤10 字，用词和短语对话',
    2: '回复 ≤20 字，用简单短句对话',
    3: '回复 ≤40 字，用1-2个短句对话',
    4: '回复 ≤80 字，用简短的段落对话',
    5: '回复 ≤150 字，用中等段落对话',
  };

  /** 根据 HSK 等级返回颜色 */
  function levelColor(level: number | null): string {
    if (level === null) return '#9ca3af'; // gray-400
    if (level <= 2) return '#22c55e';    // green-500
    if (level <= 4) return '#eab308';    // yellow-500
    if (level <= 6) return '#f97316';    // orange-500
    return '#ef4444';                     // red-500
  }

  function levelBg(level: number | null): string {
    if (level === null) return 'bg-gray-100 text-gray-500';
    if (level <= 2) return 'bg-green-100 text-green-700';
    if (level <= 4) return 'bg-yellow-100 text-yellow-700';
    if (level <= 6) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setLevelLocked(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, targetLevel }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Chat failed');
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        tokens: data.tokens || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请检查 API 配置后重试。',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">智能对话</h1>
            <p className="text-xs text-slate-500">AI 自动使用合规词汇回复</p>
          </div>
        </div>

        {/* Level selector */}
        <div className="ml-auto flex items-center gap-2">
          <Settings size={16} className="text-slate-400" />
          <select
            value={targetLevel}
            onChange={(e) => {
              setTargetLevel(Number(e.target.value));
              setLevelLocked(true);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>
                HSK {lvl} 级
              </option>
            ))}
          </select>
          {levelLocked && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              已锁定
            </span>
          )}
          <button
            onClick={() => setShowLevels(!showLevels)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showLevels
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-slate-200 bg-white text-slate-400'
            }`}
            title={showLevels ? '隐藏词级标注' : '显示词级标注'}
          >
            {showLevels ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.role === 'assistant' && showLevels && msg.tokens ? (
                <span style={{ wordBreak: 'break-all' }}>
                  {msg.tokens.map((t, i) => (
                    <span
                      key={i}
                      className="inline-block cursor-help relative group"
                      style={{ borderBottom: `2px solid ${levelColor(t.level)}` }}
                      title={t.level ? `HSK ${t.level}${t.definition ? ': ' + t.definition : ''}` : '不在 HSK 大纲内'}
                    >
                      {t.token}
                    </span>
                  ))}
                </span>
              ) : (
                msg.content
              )}
              {msg.id !== 'welcome' && msg.role === 'assistant' && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                  <Sparkles size={12} className="text-blue-400" />
                  <span className="text-xs text-blue-400">已自动修正至 HSK {targetLevel} 级词汇</span>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-300 flex items-center justify-center shrink-0">
                <User size={16} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的消息..."
            disabled={sending}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          按 Enter 发送 · HSK {targetLevel} 级 · {levelHint[targetLevel] || '自然长度的对话'}
        </p>
      </div>
    </div>
  );
}
