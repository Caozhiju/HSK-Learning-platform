'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, BookOpen, Hash, Languages } from 'lucide-react';

interface VocabEntry {
  word: string;
  level: number;
  pinyin?: string;
  definition?: string;
}

export default function VocabPage() {
  const [allVocab, setAllVocab] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    const loadVocab = async () => {
      try {
        const res = await fetch('/api/vocab', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to load vocabulary');
        // Fetch the JSON directly for full data
        const jsonRes = await fetch('/hsk3.0_vocab.json');
        if (!jsonRes.ok) throw new Error('Failed to load vocab JSON');
        const data = await jsonRes.json();
        setAllVocab(data as VocabEntry[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    loadVocab();
  }, []);

  const filtered = useMemo(() => {
    let result = allVocab;
    if (selectedLevel !== 'all') {
      result = result.filter((v) => v.level === selectedLevel);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.word.includes(q) ||
          (v.pinyin && v.pinyin.toLowerCase().includes(q)) ||
          (v.definition && v.definition.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allVocab, selectedLevel, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLevel, searchQuery]);

  const levelColors: Record<number, string> = {
    1: 'bg-emerald-100 text-emerald-700',
    2: 'bg-green-100 text-green-700',
    3: 'bg-teal-100 text-teal-700',
    4: 'bg-sky-100 text-sky-700',
    5: 'bg-blue-100 text-blue-700',
    6: 'bg-indigo-100 text-indigo-700',
    7: 'bg-violet-100 text-violet-700',
    8: 'bg-purple-100 text-purple-700',
    9: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BookOpen size={32} className="text-blue-500" />
          词汇学习
        </h1>
        <p className="text-slate-500 mt-2">浏览 HSK 3.0 标准词汇库，按等级筛选学习</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Level filter */}
          <div className="relative">
            <select
              value={selectedLevel}
              onChange={(e) =>
                setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">全部等级</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl}>
                  HSK {lvl} 级
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索词汇、拼音或释义..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <Hash size={14} />
          共 {filtered.length} 个词汇
          {selectedLevel !== 'all' && ` · HSK ${selectedLevel} 级`}
          {searchQuery && ` · 搜索: "${searchQuery}"`}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">正在加载词汇数据...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700">加载失败: {error}</p>
        </div>
      ) : (
        <>
          {/* Vocab grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {pageData.map((entry, i) => (
              <div
                key={`${entry.word}-${i}`}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {entry.word}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[entry.level] || 'bg-slate-100 text-slate-600'}`}
                  >
                    Lv.{entry.level}
                  </span>
                </div>
                {entry.pinyin && (
                  <p className="text-sm text-slate-500 mb-1">{entry.pinyin}</p>
                )}
                {entry.definition && (
                  <p className="text-xs text-slate-400 line-clamp-2">{entry.definition}</p>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <Languages size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">没有找到匹配的词汇</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 text-sm rounded-lg border ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
