'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Evaluate' },
  { href: '/rebuild', label: 'Rebuild' },
  { href: '/notebook', label: 'Notebook' },
  { href: '/review', label: 'Review' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center h-16 gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600 text-lg shrink-0">
          <span className="text-2xl">📝</span>
          <span>English Eval</span>
        </Link>
        <div className="flex items-center gap-1 ml-2">
          {links.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
