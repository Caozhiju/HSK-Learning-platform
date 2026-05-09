'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, MessageCircle, PenLine, Home, Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/i18n';

const navKeys = ['nav.home', 'nav.vocab', 'nav.chat', 'nav.corrector'] as const;
const navIcons = [Home, BookOpen, MessageCircle, PenLine];
const navHrefs = ['/', '/vocab', '/chat', '/corrector'];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, lang, setLang } = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white border-b px-4 py-3">
        <span className="font-bold text-lg text-slate-800">{t('sidebar.brand')}</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-slate-100"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center gap-2 px-6 py-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">HSK</span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-800">{t('sidebar.brand')}</h2>
            <p className="text-xs text-slate-500">{t('sidebar.subtitle')}</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navKeys.map((key, i) => {
            const isActive = navHrefs[i] === '/'
              ? pathname === '/'
              : pathname.startsWith(navHrefs[i]);
            const Icon = navIcons[i];
            return (
              <Link
                key={navHrefs[i]}
                href={navHrefs[i]}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <Icon size={20} />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 space-y-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Globe size={14} />
            {t('lang.switch')}
          </button>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 text-center">
              {t('sidebar.footer')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
