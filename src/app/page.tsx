'use client';

import Link from 'next/link';
import { BookOpen, MessageCircle, PenLine, ArrowRight, BarChart3, Database } from 'lucide-react';
import { useT } from '@/lib/i18n';

const COLOR_MAP = [
  { color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
  { color: 'from-violet-500 to-purple-600', bgColor: 'bg-violet-50', iconColor: 'text-violet-600' },
];

const FEATURE_KEYS = ['home.card1', 'home.card2', 'home.card3'] as const;
const FEATURE_HREFS = ['/vocab', '/chat', '/corrector'];
const FEATURE_ICONS = [BookOpen, MessageCircle, PenLine];

const STATS = [
  { icon: Database, key: 'vocab' },
  { icon: BarChart3, key: 'level' },
  { icon: MessageCircle, key: 'ai' },
];

function StatItem({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string; detail: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-sm transition-shadow">
      <Icon size={20} className="mx-auto text-slate-400 mb-2" />
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
    </div>
  );
}

export default function Home() {
  const { t, lang } = useT();

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-12 text-center lg:text-left">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          HSK 3.0{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('sidebar.subtitle')}
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl">
          {t('home.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        <StatItem icon={Database} label={t('lang.label') === 'Language' ? 'Total Words' : '词汇总量'} value="11,000+" detail={t('lang.label') === 'Language' ? 'HSK 3.0 Standard' : 'HSK 3.0 标准'} />
        <StatItem icon={BarChart3} label={t('lang.label') === 'Language' ? 'Level Coverage' : '等级覆盖'} value="1-9" detail={t('lang.label') === 'Language' ? 'Complete System' : '完整九级体系'} />
        <StatItem icon={MessageCircle} label={t('lang.label') === 'Language' ? 'AI Iterations' : 'AI 迭代'} value="1-3" detail={t('lang.label') === 'Language' ? 'Closed-loop' : '闭环修正'} />
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURE_KEYS.map((key, i) => {
          const Icon = FEATURE_ICONS[i];
          const c = COLOR_MAP[i];
          return (
            <Link
              key={i}
              href={FEATURE_HREFS[i]}
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-transparent hover:ring-2 hover:ring-blue-100 transition-all duration-200"
            >
              <div className={`w-12 h-12 ${c.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={24} className={c.iconColor} />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                {t(key + '.title')}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {t(key + '.desc')}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
                {t('home.goto')} <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Quick start */}
      <div className="mt-10 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2">Quick Start / 快速上手</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {(() => {
            const steps = lang === 'en' ? [
              ['1', 'Browse Vocabulary', 'Browse vocabulary by level in the vocabulary page'],
              ['2', 'Analyze Texts', 'Use the corrector to analyze out-of-level words'],
              ['3', 'AI Correction', 'Auto-correct and practice with chat'],
            ] : [
              ['1', '浏览词汇库', '在词汇学习页面选择等级，浏览对应词汇'],
              ['2', '检测文本难度', '使用超纲文本修正工具，分析文章中的超纲词'],
              ['3', 'AI 修正 + 练习', '一键修正超纲词，使用智能对话练习中文'],
            ];
            return steps.map(([num, title, desc]) => (
            <div key={num} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">{num}</div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-slate-300 mt-1">{desc}</p>
              </div>
            </div>
          ));
          })()}
        </div>
      </div>
    </div>
  );
}
