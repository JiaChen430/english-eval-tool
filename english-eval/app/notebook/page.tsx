'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { NotebookEntry, ErrorCategory } from '@/lib/types';
import { getNickname } from '@/lib/user';

const CATEGORY_STYLES: Record<ErrorCategory, { label: string; bg: string; text: string; border: string }> = {
  grammar: { label: 'Grammar', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  vocabulary: { label: 'Vocabulary', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  naturalness: { label: 'Naturalness', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  punctuation: { label: 'Punctuation', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NotebookPage() {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'mastered'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    try {
      const nickname = getNickname();
      if (!nickname) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const notebookKey = `ee_notebook_${nickname}`;
      const raw = localStorage.getItem(notebookKey);
      const allEntries: NotebookEntry[] = raw ? JSON.parse(raw) : [];

      // Apply filter
      let filtered = allEntries;
      if (filter === 'active') {
        filtered = allEntries.filter((e) => !e.mastered);
      } else if (filter === 'mastered') {
        filtered = allEntries.filter((e) => e.mastered);
      }

      // Sort by created_at descending
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEntries(filtered);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function handleDelete(id: string) {
    if (!confirm('Remove this entry from your notebook?')) return;
    setDeletingId(id);
    try {
      const nickname = getNickname();
      if (!nickname) throw new Error('No nickname');

      const notebookKey = `ee_notebook_${nickname}`;
      const raw = localStorage.getItem(notebookKey);
      const notebook: NotebookEntry[] = raw ? JSON.parse(raw) : [];

      const updated = notebook.filter((e) => e.id !== id);
      localStorage.setItem(notebookKey, JSON.stringify(updated));

      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleToggleMastered(entry: NotebookEntry) {
    try {
      const nickname = getNickname();
      if (!nickname) throw new Error('No nickname');

      const notebookKey = `ee_notebook_${nickname}`;
      const raw = localStorage.getItem(notebookKey);
      const notebook: NotebookEntry[] = raw ? JSON.parse(raw) : [];

      const updated = notebook.map((e) =>
        e.id === entry.id ? { ...e, mastered: !e.mastered } : e
      );
      localStorage.setItem(notebookKey, JSON.stringify(updated));

      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, mastered: !e.mastered } : e)));
    } catch {
      alert('Failed to update entry.');
    }
  }

  const unmasteredCount = entries.filter((e) => !e.mastered).length;
  const masteredCount = entries.filter((e) => e.mastered).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Error Notebook</h1>
          <p className="text-slate-500 text-sm mt-1">
            Your saved errors from practice sessions.
          </p>
        </div>
        {unmasteredCount > 0 && (
          <Link href="/review" className="btn-primary">
            Review {unmasteredCount} Pending →
          </Link>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'all', label: `All (${entries.length})` },
          { key: 'active', label: `Pending (${unmasteredCount})` },
          { key: 'mastered', label: `Mastered (${masteredCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
          <p className="mt-3 text-sm">Loading notebook…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📒</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {filter === 'all' ? 'Your notebook is empty' : `No ${filter} entries`}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {filter === 'all'
              ? 'Practice exercises after evaluating text — failed exercises are saved here automatically.'
              : 'Nothing to show for this filter.'}
          </p>
          <Link href="/" className="btn-primary">
            Evaluate Text
          </Link>
        </div>
      )}

      {/* Entry list */}
      {!loading && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => {
            const style = CATEGORY_STYLES[entry.error_category];
            return (
              <div
                key={entry.id}
                className={`card p-5 ${entry.mastered ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`badge ${style.bg} ${style.text}`}>{style.label}</span>
                      {entry.mastered && (
                        <span className="badge bg-green-50 text-green-700">Mastered ✓</span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">{formatDate(entry.created_at)}</span>
                    </div>

                    {/* Error */}
                    <div className="flex flex-wrap gap-3 mb-2 text-sm">
                      <span className="font-mono text-red-600 bg-red-50 rounded px-2 py-0.5 line-through">
                        {entry.error_original}
                      </span>
                      <span className="text-slate-400 self-center">→</span>
                      <span className="font-mono text-green-600 bg-green-50 rounded px-2 py-0.5">
                        {entry.error_corrected}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{entry.error_description}</p>

                    {/* Context */}
                    <details className="text-xs">
                      <summary className="text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                        Show original text context
                      </summary>
                      <p className="mt-2 text-slate-500 bg-slate-50 rounded p-2 leading-relaxed whitespace-pre-wrap">
                        {entry.original_text}
                      </p>
                    </details>

                    {/* Attempt count */}
                    {entry.attempt_count && entry.attempt_count > 0 && (
                      <p className="text-xs text-slate-400 mt-2">
                        Reviewed {entry.attempt_count} time{entry.attempt_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleMastered(entry)}
                      className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
                        entry.mastered
                          ? 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {entry.mastered ? 'Mark Pending' : 'Mark Mastered'}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-400
                        hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingId === entry.id ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
