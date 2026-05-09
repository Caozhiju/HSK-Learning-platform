'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

// ── 翻译字典 ──────────────────────────────────────────────
const dict: Record<Lang, Record<string, string>> = {
  zh: {
    // 侧边栏
    'nav.home': '首页',
    'nav.vocab': '词汇学习',
    'nav.chat': '智能对话',
    'nav.corrector': '超纲文本修正',
    'sidebar.brand': 'HSK 3.0',
    'sidebar.subtitle': '学习平台',
    'sidebar.footer': 'HSK 3.0 词汇库 · 11000+ 词',

    // 首页
    'home.title': 'HSK 3.0 智能学习平台',
    'home.subtitle': '基于 AI 的中文词汇学习、智能对话与超纲文本修正系统',
    'home.card1.title': '词汇学习',
    'home.card1.desc': '浏览 HSK 3.0 标准词汇库，按等级筛选，查看拼音与释义',
    'home.card2.title': '智能对话',
    'home.card2.desc': '与 AI 进行等级适配的中文对话，每句都标注词汇等级',
    'home.card3.title': '超纲文本修正',
    'home.card3.desc': '检测文本中的超纲词，使用 AI 自动修正为目标等级合规文本',
    'home.goto': '进入',

    // 词汇页
    'vocab.title': '词汇学习',
    'vocab.subtitle': '浏览 HSK 3.0 标准词汇库，按等级筛选学习',
    'vocab.allLevels': '全部等级',
    'vocab.search': '搜索词汇、拼音或释义...',
    'vocab.count': '共',
    'vocab.items': '个词汇',
    'vocab.favorites': '收藏',
    'vocab.loading': '正在加载词汇数据...',
    'vocab.error': '加载失败',
    'vocab.empty': '没有找到匹配的词汇',
    'vocab.prev': '上一页',
    'vocab.next': '下一页',
    'vocab.level': '级',

    // 对话页
    'chat.title': '智能对话',
    'chat.welcome': '你好！我是 HSK 学习助手。请选择你的目标 HSK 等级，我会用适合该等级的词汇和句子长度与你对话。',
    'chat.newChat': '新对话',
    'chat.placeholder': '输入你的消息...',
    'chat.footer': '按 Enter 发送',
    'chat.error': '抱歉，发生了错误。请重试。',
    'chat.sessions': '个对话',
    'chat.sessionsHint': '数据保存在本地',
    'chat.levelLabel': 'HSK',
    'chat.showLevels': '显示词级标注',
    'chat.hideLevels': '隐藏词级标注',
    'chat.vocabLevel': '级词汇',

    // 修正页
    'corrector.title': '超纲文本修正',
    'corrector.subtitle': '检测文本中的超纲词并使用 AI 自动修正为指定 HSK 等级的合规文本',
    'corrector.input': '输入文本',
    'corrector.targetLevel': '目标 HSK 等级',
    'corrector.analyze': '检测超纲词',
    'corrector.analyzing': '检测中...',
    'corrector.rewrite': '一键修正',
    'corrector.rewriting': 'AI 修正中...',
    'corrector.done': '修正完成',
    'corrector.detectResult': '超纲词检测',
    'corrector.rewriteResult': '修正结果',
    'corrector.compliant': '未检测到超纲词，文本已合规',
    'corrector.allCleared': '所有超纲词已成功修正',
    'corrector.remaining': '仍有',
    'corrector.residualWords': '个残留超纲词',
    'corrector.oovWords': '个超纲词',
    'corrector.iterations': '次迭代',
    'corrector.comparison': '查看修改前后对比',
    'corrector.before': '修改前',
    'corrector.after': '修改后',
    'corrector.newText': '检测新文本',
    'corrector.waiting': '点击"一键修正"查看结果',

    // 通用
    'lang.switch': 'EN',
    'lang.label': '语言',
  },

  en: {
    // Sidebar
    'nav.home': 'Home',
    'nav.vocab': 'Vocabulary',
    'nav.chat': 'Chat',
    'nav.corrector': 'Corrector',
    'sidebar.brand': 'HSK 3.0',
    'sidebar.subtitle': 'Learning Platform',
    'sidebar.footer': 'HSK 3.0 Word Bank · 11,000+ words',

    // Home
    'home.title': 'HSK 3.0 Learning Platform',
    'home.subtitle': 'AI-powered Chinese vocabulary learning, intelligent conversation & text correction',
    'home.card1.title': 'Vocabulary',
    'home.card1.desc': 'Browse HSK 3.0 vocabulary by level, with pinyin and definitions',
    'home.card2.title': 'Chat',
    'home.card2.desc': 'Level-adapted Chinese conversation with per-word HSK annotations',
    'home.card3.title': 'Corrector',
    'home.card3.desc': 'Detect out-of-level words and auto-correct texts to target HSK level',
    'home.goto': 'Open',

    // Vocab
    'vocab.title': 'Vocabulary',
    'vocab.subtitle': 'Browse HSK 3.0 vocabulary by level',
    'vocab.allLevels': 'All Levels',
    'vocab.search': 'Search words, pinyin or definitions...',
    'vocab.count': '',
    'vocab.items': ' words',
    'vocab.favorites': 'Favorites',
    'vocab.loading': 'Loading vocabulary data...',
    'vocab.error': 'Failed to load',
    'vocab.empty': 'No matching words found',
    'vocab.prev': 'Previous',
    'vocab.next': 'Next',
    'vocab.level': '',

    // Chat
    'chat.title': 'Chat',
    'chat.welcome': 'Hello! I\'m your HSK learning assistant. Select a target level below, and I\'ll use appropriate vocabulary and sentence length.',
    'chat.newChat': 'New Chat',
    'chat.placeholder': 'Type a message...',
    'chat.footer': 'Press Enter to send',
    'chat.error': 'Sorry, an error occurred. Please try again.',
    'chat.sessions': ' chats',
    'chat.sessionsHint': 'Stored locally',
    'chat.levelLabel': 'HSK',
    'chat.showLevels': 'Show levels',
    'chat.hideLevels': 'Hide levels',
    'chat.vocabLevel': ' vocab',

    // Corrector
    'corrector.title': 'Text Corrector',
    'corrector.subtitle': 'Detect out-of-level words and auto-correct to target HSK level',
    'corrector.input': 'Input Text',
    'corrector.targetLevel': 'Target Level',
    'corrector.analyze': 'Analyze',
    'corrector.analyzing': 'Analyzing...',
    'corrector.rewrite': 'Auto Correct',
    'corrector.rewriting': 'AI rewriting...',
    'corrector.done': 'Done',
    'corrector.detectResult': 'Detection',
    'corrector.rewriteResult': 'Result',
    'corrector.compliant': 'No out-of-level words found. Text is compliant.',
    'corrector.allCleared': 'All out-of-level words corrected.',
    'corrector.remaining': '',
    'corrector.residualWords': ' remaining out-of-level words',
    'corrector.oovWords': ' OOV words',
    'corrector.iterations': ' iteration(s)',
    'corrector.comparison': 'Compare before & after',
    'corrector.before': 'Before',
    'corrector.after': 'After',
    'corrector.newText': 'New Text',
    'corrector.waiting': 'Click "Auto Correct" to see results',

    // General
    'lang.switch': '中文',
    'lang.label': 'Language',
  },
};

// ── Context ────────────────────────────────────────────────
interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('hsk-lang') as Lang | null;
    if (saved === 'zh' || saved === 'en') setLang(saved);
  }, []);

  const setLangAndSave = (l: Lang) => {
    setLang(l);
    localStorage.setItem('hsk-lang', l);
  };

  const t = (key: string, ...args: (string | number)[]): string => {
    let template = dict[lang][key];
    if (template === undefined) template = dict['zh'][key] || key;
    args.forEach((arg, i) => {
      template = template.replace(`{${i}}`, String(arg));
    });
    return template;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangAndSave, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
