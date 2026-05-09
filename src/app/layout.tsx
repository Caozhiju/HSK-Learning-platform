import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Sidebar from '@/components/sidebar';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HSK 3.0 学习平台',
  description: '智能中文词汇学习与超纲文本修正平台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50">
        <LanguageProvider>
          <Sidebar />
          <div className="lg:pl-64 pt-14 lg:pt-0">
            <main className="min-h-screen">{children}</main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
