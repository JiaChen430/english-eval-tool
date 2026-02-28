import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import NicknameModal from '@/components/NicknameModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'English Eval — AI-powered English expression evaluator',
  description: 'Evaluate your English writing, practice targeted exercises, and track your progress.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <NicknameModal />
        <main className="min-h-screen pt-16 pb-12">{children}</main>
      </body>
    </html>
  );
}
