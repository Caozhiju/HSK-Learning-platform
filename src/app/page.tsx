import Link from 'next/link';
import { BookOpen, MessageCircle, PenLine, ArrowRight, BarChart3, Database } from 'lucide-react';

const features = [
  {
    href: '/vocab',
    icon: BookOpen,
    title: '词汇学习',
    description: '浏览 HSK 3.0 标准词汇库，包含 11000+ 词汇，支持按等级筛选和搜索。',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    href: '/chat',
    icon: MessageCircle,
    title: '智能对话',
    description: '与 AI 进行中文对话，回复自动修正为目标 HSK 等级的合规词汇。',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    href: '/corrector',
    icon: PenLine,
    title: '超纲文本修正',
    description: '粘贴文章检测超纲词，AI 多轮迭代降维修正至目标等级。',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
];

const stats = [
  { icon: Database, label: '词汇总量', value: '11,000+', detail: 'HSK 3.0 标准' },
  { icon: BarChart3, label: '等级覆盖', value: '1-9 级', detail: '完整九级体系' },
  { icon: MessageCircle, label: 'AI 迭代', value: '最多 3 轮', detail: '闭环修正保证' },
];

export default function Home() {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-12 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700 mb-4">
          <SparklesIcon />
          Phase 4 前端就绪
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          HSK 3.0{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            学习平台
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl">
          基于 AI 的智能中文学习工具，集成词汇管理、NLP
          文本分析和闭环修正工作流，帮助你高效备考 HSK 3.0。
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-sm transition-shadow"
          >
            <stat.icon size={20} className="mx-auto text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.detail}</p>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map((feature, i) => (
          <Link
            key={i}
            href={feature.href}
            className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-transparent hover:ring-2 hover:ring-blue-100 transition-all duration-200"
          >
            <div
              className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
            >
              <feature.icon size={24} className={feature.iconColor} />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
              {feature.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              {feature.description}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
              进入 <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>

      {/* Quick start */}
      <div className="mt-10 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2">快速上手</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-sm">浏览词汇库</p>
              <p className="text-xs text-slate-300 mt-1">在词汇学习页面选择等级，浏览对应词汇</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-sm">检测文本难度</p>
              <p className="text-xs text-slate-300 mt-1">
                使用超纲文本修正工具，分析文章中的超纲词
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-sm">AI 修正 + 练习</p>
              <p className="text-xs text-slate-300 mt-1">
                一键修正超纲词，使用智能对话练习中文
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
      <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" opacity="0.6" />
    </svg>
  );
}
