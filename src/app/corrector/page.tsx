'use client';

import { useState } from 'react';
import { PenLine, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Sparkles, Info } from 'lucide-react';

interface AnalyzeResult {
  success: boolean;
  originalText: string;
  tokens: { token: string; level: number | null; isOutOfLevel: boolean }[];
  outOfLevelCount: number;
  outOfLevelWords: string[];
}

interface RewriteResult {
  success: boolean;
  originalText: string;
  rewrittenText: string;
  iterations: number;
  maxIterations: number;
  hasOutOfLevelWords: boolean;
  outOfLevelWords?: string[];
  message?: string;
}

export default function CorrectorPage() {
  const [text, setText] = useState('');
  const [targetLevel, setTargetLevel] = useState<number>(3);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setError(null);
    setRewriteResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), targetLevel }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Analysis failed');
      setAnalyzeResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRewrite = async () => {
    if (!analyzeResult) return;
    setRewriting(true);
    setError(null);
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: analyzeResult.originalText,
          targetLevel,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Rewrite failed');
      setRewriteResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rewrite error');
    } finally {
      setRewriting(false);
    }
  };

  const outOfLevelTokens = analyzeResult?.tokens.filter((t) => t.isOutOfLevel) || [];

  const levelGuidance: Record<number, string> = {
    1: 'HSK 1 级学习者通常接触 3-8 字的短句。建议输入单句，不超过 15 字。',
    2: 'HSK 2 级学习者适合 5-15 字的句子。建议输入 1-2 个短句，不超过 30 字。',
    3: 'HSK 3 级学习者可处理 10-25 字的句子。建议输入 2-3 个短句，不超过 50 字。',
  };
  const guidance = levelGuidance[targetLevel] ||
    `HSK ${targetLevel} 级适合中等长度文本。较长文本将自动拆句处理。`;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <PenLine size={32} className="text-blue-500" />
          超纲文本修正
        </h1>
        <p className="text-slate-500 mt-2">检测文本中的超纲词并使用 AI 自动修正为指定 HSK 等级的合规文本</p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              输入文本
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={targetLevel <= 3 ? `输入一个 HSK ${targetLevel} 级的短句...` : '粘贴你想检测的中文文本...'}
              rows={targetLevel <= 3 ? 3 : 6}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>{guidance}</span>
            </div>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              目标 HSK 等级
            </label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(Number(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl}>
                  HSK {lvl} 级
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || analyzing}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
        >
          {analyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              检测中...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              检测超纲词
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results: Two-column layout */}
      {(analyzeResult || rewriting || rewriteResult) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              超纲词检测
              {analyzeResult && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {analyzeResult.outOfLevelCount} 个超纲词
                </span>
              )}
            </h3>

            {/* Highlighted text */}
            {analyzeResult && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg text-sm leading-relaxed">
                {analyzeResult.tokens.map((t, i) =>
                  t.isOutOfLevel ? (
                    <mark
                      key={i}
                      className="bg-amber-200 text-amber-900 px-0.5 rounded cursor-help"
                      title={`HSK ${t.level} 级`}
                    >
                      {t.token}
                    </mark>
                  ) : (
                    <span key={i}>{t.token}</span>
                  )
                )}
              </div>
            )}

            {/* Out-of-level word list */}
            {outOfLevelTokens.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">超纲词明细</p>
                <div className="flex flex-wrap gap-2">
                  {outOfLevelTokens.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800"
                    >
                      {t.token}
                      <span className="text-amber-400">Lv.{t.level}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analyzeResult && outOfLevelTokens.length === 0 && (
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg text-sm text-green-700">
                <CheckCircle2 size={16} />
                未检测到超纲词，文本已合规
              </div>
            )}

            {/* Rewrite button */}
            {analyzeResult && outOfLevelTokens.length > 0 && (
              <button
                onClick={handleRewrite}
                disabled={rewriting || !!rewriteResult}
                className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                {rewriting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    AI 修正中... (最多 3 轮迭代)
                  </>
                ) : rewriteResult ? (
                  <>
                    <CheckCircle2 size={16} />
                    修正完成
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    一键修正
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right: Rewrite result */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              修正结果
              {rewriteResult && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {rewriteResult.iterations} 次迭代
                </span>
              )}
            </h3>

            {rewriting ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
                <p className="text-sm text-slate-500">AI 正在逐轮修正超纲词...</p>
              </div>
            ) : rewriteResult ? (
              <>
                <div className="p-4 bg-green-50 rounded-lg text-sm leading-relaxed mb-4">
                  {rewriteResult.rewrittenText}
                </div>

                {rewriteResult.hasOutOfLevelWords && rewriteResult.outOfLevelWords && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      仍有 {rewriteResult.outOfLevelWords.length} 个残留超纲词:
                      {rewriteResult.outOfLevelWords.join(', ')}
                    </span>
                  </div>
                )}

                {!rewriteResult.hasOutOfLevelWords && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                    <CheckCircle2 size={14} />
                    所有超纲词已成功修正
                  </div>
                )}

                {/* Comparison */}
                <details className="mt-4">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                    查看修改前后对比
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-400 mb-1">修改前</p>
                      <p className="text-slate-600">{rewriteResult.originalText}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-green-500 mb-1">修改后</p>
                      <p className="text-green-700">{rewriteResult.rewrittenText}</p>
                    </div>
                  </div>
                </details>

                {/* Do another */}
                <button
                  onClick={() => {
                    setRewriteResult(null);
                    setAnalyzeResult(null);
                  }}
                  className="mt-4 w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  检测新文本
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ArrowRight size={32} className="mb-2" />
                <p className="text-sm">点击"一键修正"查看结果</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
